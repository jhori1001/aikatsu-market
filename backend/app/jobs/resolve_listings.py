"""検索に出なくなった「販売中」の出品が、売れたのか・掲載終了したのかを確かめる（カドソバと同じ）。

アイカツは販売中の出品を毎日記録するだけで、一度記録した出品はずっと「販売中」のままだった
（2026-11-11、ユーザー指摘「売り切れのやつと、掲載終了したやつが販売中になってる 日輪と同じにして」）。
カドソバ（services/listing_tracker.py の resolve_stale）と同じ手順で確かめる。

    1. 最後に検索で見えてから STALE_HOURS 時間たった「販売中」の出品を選ぶ   … DBだけ
    2. その出品の商品ページ /item/<id> を開く                              … robots.txt で許可
    3. 売り切れなら sold（売れた日時は商品ページの更新日時）
       ページが無ければ withdrawn（掲載終了。売れたとは決めつけない）
       まだ販売中なら last_seen_at を今にする（検索に出なかっただけ）

「売却済みだけに絞り込む検索」（robots.txt で禁止）は使わない。
相場（販売中の平均）は track_prices がその日の検索結果だけから出すので、ここは相場を変えない。

  python -m app.jobs.resolve_listings              # 確かめて保存する
  python -m app.jobs.resolve_listings --dry-run    # 対象を数え、先頭 20件だけ確かめる（保存しない）
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
from collections import Counter

from sqlalchemy import or_, select

from app.collectors.yahoo_flea import YahooFleaCollector
from app.db import session_scope
from app.models import ListingStatus, SaleListing, SaleSource

logger = logging.getLogger(__name__)

# 毎日の検索（track_prices）の直後に流すので、その回の検索で見えた出品は対象にならない
STALE_HOURS = 6
# 1回に確かめる上限。商品ページは3秒おきに開くので、120件で約6分
# （初回は溜まっている分があるので、数日かけて片付く）
BATCH_SIZE = 120
DRY_RUN_SAMPLE = 20


def main() -> None:
    parser = argparse.ArgumentParser(description="検索に出なくなった出品が売れたか確かめます")
    parser.add_argument("--dry-run", action="store_true", help="保存しない（先頭20件だけ確かめる）")
    parser.add_argument("--limit", type=int, default=BATCH_SIZE)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(hours=STALE_HOURS)
    with session_scope() as db:
        stale_q = select(SaleListing.id).where(
            SaleListing.source == SaleSource.YAHOO_FLEA,
            SaleListing.listing_status == ListingStatus.OPEN,
            or_(SaleListing.last_seen_at.is_(None), SaleListing.last_seen_at < cutoff),
        )
        total = len(db.execute(stale_q).all())
        limit = min(args.limit, DRY_RUN_SAMPLE) if args.dry_run else args.limit
        targets = [
            (r.id, r.external_id)
            for r in db.execute(
                select(SaleListing.id, SaleListing.external_id)
                .where(SaleListing.id.in_(stale_q))
                .order_by(SaleListing.last_seen_at.asc())
                .limit(limit)
            ).all()
        ]
    print(f"検索に出なくなった「販売中」の出品: {total}件（今回確かめる: {len(targets)}件）")

    counts: Counter[str] = Counter()
    unknown: list[str] = []
    with YahooFleaCollector() as collector:
        for listing_id, item_id in targets:
            try:
                detail = collector.fetch_item(item_id)
            except Exception as exc:  # noqa: BLE001 - 1件の失敗で止めない
                counts["取得エラー"] += 1
                logger.warning("商品ページの取得に失敗 item=%s: %s", item_id, exc)
                continue

            if detail is None:
                verdict = "掲載終了"
            elif detail.is_sold:
                verdict = "売却済み"
            elif detail.is_open:
                verdict = "まだ販売中"
            else:
                verdict = "不明"
                unknown.append(f"{item_id}:{detail.status}")
            counts[verdict] += 1
            if args.dry_run:
                continue

            # 1件ごとに保存する（商品ページを順に開くあいだ、DBの処理を開けっぱなしにしない。
            # カドソバで Neon に放置された接続とみなされて切られたため）
            with session_scope() as db:
                row = db.get(SaleListing, listing_id)
                if row is None:
                    continue
                if verdict == "掲載終了":
                    row.listing_status = ListingStatus.WITHDRAWN
                    row.resolved_at = now
                elif verdict == "売却済み":
                    row.listing_status = ListingStatus.SOLD
                    row.resolved_at = now
                    row.sold_at = detail.update_date or now
                    if detail.price:
                        row.price = detail.price
                else:
                    # 検索に出なかっただけ、または状態が分からない。販売中のまま、次は少し先に回す
                    row.last_seen_at = now

    print("結果: " + (", ".join(f"{k} {v}件" for k, v in counts.most_common()) or "なし"))
    if unknown:
        print("知らない状態: " + ", ".join(unknown[:10]))
    if args.dry_run:
        print("（数えるだけ。DBは変えていません）")


if __name__ == "__main__":
    main()
