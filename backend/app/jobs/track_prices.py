"""ER・PRカード(26枚)だけの、Yahoo!フリマ相場バッチ。

アイカツ！アンコールは発売間もなく(2026-10-08〜)でカード数も少ないため、
カドソバのような成約価格の追跡（消えた出品を個別ページで確認して
売れたか判定する）は行わない。今日時点で販売中の出品を記録し、
その平均を「参考価格」として出すだけの、ずっと軽い作りにしてある
（ユーザー要望「少なく入れれば理想」、GitHub Actionsの消費を抑えるため）。

  python -m app.jobs.track_prices            # 保存する
  python -m app.jobs.track_prices --dry-run   # 数えるだけ
  python -m app.jobs.track_prices --code E1-78_PR   # 1枚だけ

robots.txt で禁止されている「売却済みだけに絞り込む検索」は使わない
（collectors/yahoo_flea.py が ALLOWED_SEARCH_PARAMS で機械的に弾く）。
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
import re
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.collectors.http import CrawlError
from app.collectors.yahoo_flea import FleaListing, YahooFleaCollector
from app.config import settings
from app.db import session_scope
from app.jobs.runner import batch_run
from app.models import Card, DailyPrice, ListingStatus, LogStatus, SaleListing, SaleSource
from app.services.conditions import classify

logger = logging.getLogger(__name__)

JOB_NAME = "track_prices"
TARGET_SUFFIXES = ("ER", "PR")
MIN_SAMPLES_FOR_AVERAGE = 3

# 明らかにこのカード1枚の値段ではないと分かる出品を弾く
BULK_KEYWORDS = ("まとめ", "セット", "コンプリート", "福袋", "大量", "全種", "ばら売り不可")


# パラレル版（同じ絵柄の特別仕様）。通常版の数倍の値段が付くので、混ぜると
# 相場が跳ね上がる（2026-10-30、E1-04 で 16,000円・13,680円が通常版に混ざっていた）
PARALLEL_KEYWORDS = ("パラレル",)

# 同じカード名の別シリーズ（旧アイカツ！・スターズ等）。名前だけでは区別できない
OTHER_SERIES_KEYWORDS = ("スターズ", "フレンズ", "オンパレード", "プラネット")

# 複数枚の出品（コーデ一式・「22枚」など）。1枚の値段ではない
MULTI_KEYWORDS = ("コーデ",)
MULTI_COUNT_RE = re.compile(r"(?<!\d)([2-9]|\d{2,})\s*枚")

# 服の部位。PR・R・N はトップス・スカート・シューズ…と部位ごとに別カードなので、
# 自分の部位以外の部位名がタイトルにあれば、2枚以上の出品とみなす
# （「オーロラキスドレープスカート バレエシューズ」のような、相手の名前を
# 略して書いた2枚組を見分けるため）。「アクセ」は「アクセカード」の意味でも
# 使われるので入れない。ER（フルコーデ1枚）は部位名で終わらないので対象外
PART_WORDS = (
    "トップス", "スカート", "シューズ", "ブーツ", "パンプス", "サンダル", "ワンピ",
    "カチューシャ", "ジャケット", "ボレロ", "ブラウス", "ベスト", "キャミソール",
    "ドレス", "ミュール", "ショートパンツ", "パニエ",
)

# 旧アイカツ！のカード番号（01-19P、1401-23 など）。名前が同じ別シリーズのカード
OLD_CODE_RE = re.compile(r"(?<![A-Za-z0-9-])\d{2,4}-\d{2,3}[A-Za-z]?(?![0-9-])")

# タイトル中のカード番号（E1-04、SP-014 など）
CARD_NUMBER_RE = re.compile(r"(?<![A-Za-z0-9])([A-Za-z]{1,3}\d{0,2})-(\d{1,3})(?!\d)")


def _same_number(a: str, b: str) -> bool:
    """E1-4 と E1-04 を同じとみなして比べる。"""
    pa, na = a.upper().split("-")
    pb, nb = b.upper().split("-")
    return pa == pb and int(na) == int(nb)


def exclusion_reason(
    title: str,
    price: int,
    card_name: str,
    card_number: str,
    other_names: tuple[str, ...] = (),
) -> str | None:
    """採用しない理由。採用するなら None。

    other_names は図鑑の他のカードの名前。タイトルに他のカードの名前も
    入っていたら、2枚以上の出品か別カードなので採用しない。
    決められない出品は、どちらかに入れるのではなく入れない（カドソバと同じ考え方）。
    """
    title = title or ""
    if any(k in title for k in BULK_KEYWORDS):
        return "bulk"
    if any(k in title for k in MULTI_KEYWORDS) or MULTI_COUNT_RE.search(title):
        return "bulk"
    if card_name and card_name not in title:
        # カード名がそのままタイトルに無い出品は、別カードやアクセ単体などの
        # 可能性があるため採用しない（確信が持てないものは入れない）
        return "name_mismatch"
    if any(k in title for k in PARALLEL_KEYWORDS):
        return "parallel"
    if any(k in title for k in OTHER_SERIES_KEYWORDS) or OLD_CODE_RE.search(title):
        return "other_series"
    own_part = next((w for w in PART_WORDS if card_name.endswith(w)), None)
    if own_part and any(w not in card_name and w in title for w in PART_WORDS):
        return "other_card"
    # 自分の名前に含まれる名前（「ピンクステージベスト」と「…ベスト&スカート」）は数えない
    if any(n and n != card_name and n not in card_name and n in title for n in other_names):
        return "other_card"
    # このカード以外の番号が書いてある（別カード・別シリーズ・まとめ）
    for prefix, num in CARD_NUMBER_RE.findall(title):
        if not _same_number(f"{prefix}-{num}", card_number):
            return "other_number"
    if price <= 0:
        return "invalid_price"
    return None


def _exclusion_reason(listing: FleaListing, card: Card, other_names: tuple[str, ...]) -> str | None:
    return exclusion_reason(
        listing.title or "",
        listing.price,
        card.name or "",
        card.official_code.split("_")[0],
        other_names,
    )


def today_jst() -> dt.date:
    return dt.datetime.now(ZoneInfo(settings.tz)).date()


def run(*, codes: list[str] | None = None, dry_run: bool = False) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    today = today_jst()
    stats: dict = {
        "cards_processed": 0,
        "listings_found": 0,
        "adopted": 0,
        "excluded": 0,
        "requests": 0,
        "cards_with_price": 0,
        "cards_without_price": 0,
    }

    with batch_run(JOB_NAME) as ctx:
        with session_scope() as db:
            stmt = select(Card).where(Card.is_active.is_(True), Card.code_suffix.in_(TARGET_SUFFIXES))
            if codes:
                stmt = stmt.where(Card.official_code.in_(codes))
            cards = db.execute(stmt).scalars().all()
            # R・Nも含めた図鑑の全カード名（別カードの名前が入った出品を見分ける）
            all_names = tuple(
                n for n in db.execute(select(Card.name).where(Card.name.is_not(None))).scalars() if n
            )

        if not cards:
            logger.warning("対象カード(ER/PR)が見つかりませんでした")
            ctx.stats = stats
            return stats

        logger.info("対象 %d 枚（ER・PRのみ）", len(cards))

        with YahooFleaCollector() as collector:
            for card in cards:
                keyword = card.name or card.official_code
                try:
                    listings = collector.search_all(keyword, max_pages=2)
                except CrawlError as exc:
                    ctx.log(
                        f"{JOB_NAME}.search",
                        LogStatus.FAILED,
                        card_pk=card.id,
                        message=f"{type(exc).__name__}: {exc}",
                    )
                    continue

                stats["cards_processed"] += 1
                stats["listings_found"] += len(listings)

                if dry_run:
                    adopted = [l for l in listings if _exclusion_reason(l, card, all_names) is None]
                    logger.info(
                        "dry-run %s (%s): %d件中 %d件採用見込み",
                        card.official_code, keyword, len(listings), len(adopted),
                    )
                    stats["adopted"] += len(adopted)
                    stats["excluded"] += len(listings) - len(adopted)
                    continue

                adopted_prices: list[int] = []
                with session_scope() as db:
                    for listing in listings:
                        if not listing.is_open:
                            continue
                        reason = _exclusion_reason(listing, card, all_names)
                        is_adopted = reason is None
                        if is_adopted:
                            adopted_prices.append(listing.price)
                            stats["adopted"] += 1
                        else:
                            stats["excluded"] += 1

                        values = {
                            "card_pk": card.id,
                            "source": SaleSource.YAHOO_FLEA,
                            "external_id": listing.item_id,
                            "title": listing.title,
                            "price": listing.price,
                            "url": listing.url,
                            "listing_status": ListingStatus.OPEN,
                            "is_adopted": is_adopted,
                            "exclusion_reason": reason,
                            "item_condition": listing.condition,
                            "condition_grade": classify(listing.condition),
                            "last_seen_at": now,
                        }
                        stmt = insert(SaleListing).values(**values)
                        # 同じ出品が別のカードの検索でも見つかることがある。そのときに
                        # 別のカードの物差しで判定を上書きしないよう、同じカードの行だけ
                        # 更新する（2026-10-30、元のカードでは採用なのに、隣のカードの
                        # 検索で「名前が無い」と除外に書き換わっていた）
                        stmt = stmt.on_conflict_do_update(
                            constraint="uq_sale_listings_source_external_id",
                            set_={k: stmt.excluded[k] for k in values if k not in {"card_pk", "source", "external_id"}},
                            where=SaleListing.card_pk == stmt.excluded.card_pk,
                        )
                        db.execute(stmt)

                    average = None
                    if len(adopted_prices) >= MIN_SAMPLES_FOR_AVERAGE:
                        average = round(sum(adopted_prices) / len(adopted_prices) / 10) * 10
                        stats["cards_with_price"] += 1
                    else:
                        stats["cards_without_price"] += 1

                    price_stmt = insert(DailyPrice).values(
                        card_pk=card.id,
                        date=today,
                        average_asking_price=average,
                        asking_count=len(adopted_prices),
                    )
                    price_stmt = price_stmt.on_conflict_do_update(
                        constraint="uq_daily_prices_card_date",
                        set_={
                            "average_asking_price": price_stmt.excluded.average_asking_price,
                            "asking_count": price_stmt.excluded.asking_count,
                        },
                    )
                    db.execute(price_stmt)

            stats["requests"] = collector.request_count

        ctx.log(
            f"{JOB_NAME}",
            LogStatus.SUCCESS,
            fetched_count=stats["listings_found"],
            adopted_count=stats["adopted"],
            excluded_count=stats["excluded"],
            message=(
                f"cards={stats['cards_processed']} priced={stats['cards_with_price']} "
                f"requests={stats['requests']}"
            ),
        )
        ctx.stats = stats

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="ER・PRカードのYahoo!フリマ相場を記録します")
    parser.add_argument("--code", action="append", dest="codes", help="対象official_code（複数可）")
    parser.add_argument("--dry-run", action="store_true", help="保存せずに数えるだけ")
    args = parser.parse_args()

    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s"
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    stats = run(codes=args.codes, dry_run=args.dry_run)
    print("---- 結果 ----")
    for key, value in stats.items():
        print(f"{key:20s}: {value}")


if __name__ == "__main__":
    main()
