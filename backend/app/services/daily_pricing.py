"""日次相場の計算（日輪の services/daily_pricing.py と同じ考え方、2026-11-11）。

sale_listings（採用済み）→ 状態（すべて・美品・傷あり）ごとに分ける → 外れ値を除く → daily_prices に書く。

・販売中の平均: その日に検索で見えていた採用出品（first_seen 〜 last_seen にその日が入るもの）
・売れた価格: その日までの WINDOW_DAYS 日に売れた採用出品（sold_at）。日輪と同じく、販売中が
  3件に満たない日の相場に使う（画面側で切り替える）
・外れ値の除き方は日輪と同じ services/pricing.py（track_prices.asking_average）

アイカツはパラレル版をカードとして別に持つので、card_pk ごとにそのまま計算すればよい。
"""

from __future__ import annotations

import datetime as dt
import statistics
from collections import defaultdict
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import DailyPrice, ListingStatus, SaleListing
from app.services.pricing import PricingConfig, remove_outliers

JST = ZoneInfo("Asia/Tokyo")
GRADES = ("all", "mint", "damaged")
# 売れた価格を何日ぶん見るか（日輪の window_days と同じ 21日）
WINDOW_DAYS = 21
MIN_SAMPLES = 3
PRICING = PricingConfig()


def _jst_date(value: dt.datetime | None) -> dt.date | None:
    return value.astimezone(JST).date() if value else None


def _grade_ok(condition_grade: str | None, grade: str) -> bool:
    return grade == "all" or condition_grade == grade


def asking_average(prices: list[int]) -> int | None:
    """販売中の出品価格から、外れ値を除いた平均（10円単位）。track_prices と同じもの。"""
    from app.jobs.track_prices import asking_average as _avg  # 循環importを避ける

    return _avg(prices)


def sold_stats(prices: list[int]) -> tuple[int | None, int | None, int]:
    """売れた価格の (平均, 中央値, 件数)。外れ値を除いて3件未満なら平均・中央値は出さない。"""
    kept = remove_outliers(prices, PRICING).kept if prices else []
    if len(kept) < MIN_SAMPLES:
        return None, None, len(kept)
    return round(statistics.fmean(kept) / 10) * 10, round(statistics.median(kept) / 10) * 10, len(kept)


def compute(
    db: Session,
    *,
    card_pks: list[int],
    dates: list[dt.date],
    dry_run: bool = False,
) -> list[dict]:
    """card_pks × dates × 3つの状態の行を計算して書く。書いた（書くはずの）行を返す。"""
    if not card_pks or not dates:
        return []
    rows = db.execute(
        select(
            SaleListing.card_pk,
            SaleListing.price,
            SaleListing.condition_grade,
            SaleListing.listing_status,
            SaleListing.first_seen_at,
            SaleListing.last_seen_at,
            SaleListing.sold_at,
        ).where(SaleListing.card_pk.in_(card_pks), SaleListing.is_adopted.is_(True))
    ).all()
    by_card: dict[int, list] = defaultdict(list)
    for r in rows:
        by_card[r.card_pk].append(r)

    out: list[dict] = []
    for pk in card_pks:
        listings = by_card.get(pk, [])
        for day in dates:
            window_from = day - dt.timedelta(days=WINDOW_DAYS - 1)
            for grade in GRADES:
                asking = [
                    r.price
                    for r in listings
                    if _grade_ok(r.condition_grade, grade)
                    and (_jst_date(r.first_seen_at) or day) <= day <= (_jst_date(r.last_seen_at) or day)
                ]
                sold = [
                    r.price
                    for r in listings
                    if r.listing_status == ListingStatus.SOLD
                    and _grade_ok(r.condition_grade, grade)
                    and r.sold_at is not None
                    and window_from <= _jst_date(r.sold_at) <= day
                ]
                avg_sold, med_sold, n_sold = sold_stats(sold)
                out.append(
                    {
                        "card_pk": pk,
                        "date": day,
                        "condition_grade": grade,
                        "average_asking_price": asking_average(asking),
                        "asking_count": len(asking),
                        "average_price": avg_sold,
                        "median_price": med_sold,
                        "sample_count": n_sold,
                    }
                )

    if not dry_run and out:
        stmt = insert(DailyPrice).values(out)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_prices_card_date_grade",
            set_={
                k: stmt.excluded[k]
                for k in ("average_asking_price", "asking_count", "average_price", "median_price", "sample_count")
            },
        )
        db.execute(stmt)
    return out
