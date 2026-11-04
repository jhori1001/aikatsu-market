"""出品の判定を付け直し、日次の平均を計算し直す（カドソバの rejudge と同じ役目）。

    python -m app.jobs.rejudge_listings --dry-run   # 何件が採用から外れるか／採用に変わるか数えるだけ
    python -m app.jobs.rejudge_listings             # 書き換える

外部サイトへは一切アクセスしない。保存済みのタイトル・価格に、いまの判定
ルール（jobs/track_prices.py の exclusion_reason）を当て直すだけ。

日次の平均（daily_prices）は、その日に販売中だった採用出品から計算し直す。
「その日に販売中だった」は、最初に見た日〜最後に見た日（日本時間）の
範囲にその日が入る出品とする（毎日の記録は、その日に見つかった出品を
last_seen_at に上書きしていくため）。

パラレル版: 通常版のカードに保存されている「パラレル」入りの出品は、パラレル版の
カードがあればそちらへ付け替え（card_pk を変える）、パラレル版の物差しで判定する。
パラレル版のカードの日次の行がまだ無い日は、通常版に日次の行がある日のぶんを作る。

除外→採用が増えるときは、たいていルールのほうが間違っている。
dry-run の結果を見てから本番を流す。
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
from collections import Counter, defaultdict
from zoneinfo import ZoneInfo

from sqlalchemy import insert, select, update

from app.config import settings
from app.db import session_scope
from app.jobs.track_prices import (
    MIN_SAMPLES_FOR_AVERAGE,
    base_code,
    exclusion_reason,
    target_card,
)
from app.models import Card, DailyPrice, ListingStatus, SaleListing

logger = logging.getLogger(__name__)
JST = ZoneInfo("Asia/Tokyo")


def run(*, dry_run: bool) -> dict:
    stats: Counter = Counter()
    with session_scope() as db:
        cards = {c.id: c for c in db.execute(select(Card)).scalars()}
        all_names = tuple(c.name for c in cards.values() if c.name)
        listings = db.execute(select(SaleListing)).scalars().all()

        # 通常版の番号 → パラレル版のカード（同じ番号に2枚以上あれば使わない）
        parallel_list = [c for c in cards.values() if c.is_parallel and c.is_active]
        counts = Counter(base_code(c.official_code) for c in parallel_list)
        parallel_of = {
            base_code(c.official_code): c for c in parallel_list if counts[base_code(c.official_code)] == 1
        }

        changes = []
        for l in listings:
            card = cards.get(l.card_pk)
            if card is None:
                continue
            tgt = target_card(l.title, card, parallel_of)
            reason = exclusion_reason(
                l.title,
                l.price,
                tgt.name or "",
                tgt.official_code.split("_")[0],
                all_names,
                is_parallel=tgt.is_parallel,
            )
            adopted = reason is None
            if tgt.id != card.id:
                stats["パラレル版へ付け替え"] += 1
                logger.info(
                    "付け替え %s → %s [%s] %d円 %s",
                    card.official_code, tgt.official_code, reason or "採用", l.price, l.title,
                )
            if adopted != l.is_adopted:
                key = "採用→除外" if l.is_adopted else "除外→採用"
                stats[key] += 1
                logger.info("%s %s [%s] %d円 %s", key, tgt.official_code, reason, l.price, l.title)
            elif reason != l.exclusion_reason:
                stats["除外理由だけ変わる"] += 1
            stats["採用" if adopted else f"除外:{reason}"] += 1
            if tgt.is_parallel:
                stats["パラレル版で採用" if adopted else "パラレル版で除外"] += 1
            changes.append(
                {"id": l.id, "card_pk": tgt.id, "is_adopted": adopted, "exclusion_reason": reason}
            )

        # 日次の平均を計算し直す（既にある日付の行だけ）
        new_pk = {ch["id"]: ch["card_pk"] for ch in changes}
        adopted_ids = {ch["id"] for ch in changes if ch["is_adopted"]}
        by_card = defaultdict(list)
        for l in listings:
            if l.id in adopted_ids and l.listing_status == ListingStatus.OPEN:
                first = l.first_seen_at.astimezone(JST).date()
                last = l.last_seen_at.astimezone(JST).date()
                by_card[new_pk.get(l.id, l.card_pk)].append((first, last, l.price))

        daily = db.execute(select(DailyPrice)).scalars().all()

        # パラレル版のカードの日次の行が無い日は、通常版に行がある日のぶんを作る
        have = {(row.card_pk, row.date) for row in daily}
        base_dates = defaultdict(set)
        for row in daily:
            base_dates[row.card_pk].add(row.date)
        new_rows = []
        for code, pcard in parallel_of.items():
            base = next((c for c in cards.values() if c.official_code == code), None)
            if base is None:
                continue
            for date in sorted(base_dates.get(base.id, ())):
                if (pcard.id, date) in have:
                    continue
                prices = [p for first, last, p in by_card.get(pcard.id, []) if first <= date <= last]
                average = None
                if len(prices) >= MIN_SAMPLES_FOR_AVERAGE:
                    average = round(sum(prices) / len(prices) / 10) * 10
                stats["パラレル版の日次を新しく作る"] += 1
                logger.info(
                    "日次(新) %s %s: %s円(%d件)", pcard.official_code, date, average, len(prices)
                )
                new_rows.append(
                    {
                        "card_pk": pcard.id,
                        "date": date,
                        "average_asking_price": average,
                        "asking_count": len(prices),
                    }
                )
        price_changes = []
        for row in daily:
            prices = [p for first, last, p in by_card.get(row.card_pk, []) if first <= row.date <= last]
            average = None
            if len(prices) >= MIN_SAMPLES_FOR_AVERAGE:
                average = round(sum(prices) / len(prices) / 10) * 10
            if average != row.average_asking_price or len(prices) != row.asking_count:
                stats["日次平均が変わる行"] += 1
                card = cards.get(row.card_pk)
                logger.info(
                    "日次 %s %s: %s円(%d件) → %s円(%d件)",
                    card.official_code if card else row.card_pk, row.date,
                    row.average_asking_price, row.asking_count, average, len(prices),
                )
                price_changes.append(
                    {"id": row.id, "average_asking_price": average, "asking_count": len(prices)}
                )

        if dry_run:
            logger.info("dry-run なので書き換えません")
            return dict(stats)
        if changes:
            db.execute(update(SaleListing), changes)
        if price_changes:
            db.execute(update(DailyPrice), price_changes)
        if new_rows:
            db.execute(insert(DailyPrice), new_rows)
    return dict(stats)


def main() -> None:
    parser = argparse.ArgumentParser(description="出品の判定を付け直し、日次の平均を計算し直す")
    parser.add_argument("--dry-run", action="store_true", help="数えるだけ（書き換えない）")
    args = parser.parse_args()
    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s"
    )
    for key, value in sorted(run(dry_run=args.dry_run).items()):
        print(f"{key:20s}: {value}")


if __name__ == "__main__":
    main()
