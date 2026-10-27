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
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.collectors.http import CrawlError
from app.collectors.yahoo_flea import FleaListing, YahooFleaCollector
from app.config import settings
from app.db import session_scope
from app.jobs.runner import batch_run
from app.models import Card, DailyPrice, ListingStatus, LogStatus, SaleListing, SaleSource

logger = logging.getLogger(__name__)

JOB_NAME = "track_prices"
TARGET_SUFFIXES = ("ER", "PR")
MIN_SAMPLES_FOR_AVERAGE = 3

# 明らかにこのカード1枚の値段ではないと分かる出品を弾く
BULK_KEYWORDS = ("まとめ", "セット", "コンプリート", "福袋", "大量", "全種", "ばら売り不可")


def _exclusion_reason(listing: FleaListing, card_name: str) -> str | None:
    title = listing.title or ""
    if any(k in title for k in BULK_KEYWORDS):
        return "bulk"
    if card_name and card_name not in title:
        # カード名がそのままタイトルに無い出品は、別カードやアクセ単体などの
        # 可能性があるため採用しない（確信が持てないものは入れない）
        return "name_mismatch"
    if listing.price <= 0:
        return "invalid_price"
    return None


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
                    adopted = [l for l in listings if _exclusion_reason(l, card.name or "") is None]
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
                        reason = _exclusion_reason(listing, card.name or "")
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
                            "last_seen_at": now,
                        }
                        stmt = insert(SaleListing).values(**values)
                        stmt = stmt.on_conflict_do_update(
                            constraint="uq_sale_listings_source_external_id",
                            set_={k: stmt.excluded[k] for k in values if k not in {"card_pk", "source", "external_id"}},
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
