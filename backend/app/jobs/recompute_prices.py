"""日次相場を、保存済みの出品から状態（すべて・美品・傷あり）別に計算し直す（日輪の recompute_prices と同じ役目）。

  python -m app.jobs.recompute_prices --since 2026-10-27 --dry-run   # 何が変わるか数えるだけ
  python -m app.jobs.recompute_prices --since 2026-10-27             # 書く

daily_prices に「すべて」の行がある日（＝記録した日）だけを計算する。
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
from collections import Counter

from sqlalchemy import select

from app.db import session_scope
from app.models import Card, DailyPrice
from app.services import daily_pricing

logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", type=dt.date.fromisoformat, default=dt.date(2026, 10, 1))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    with session_scope() as db:
        cards = {
            c.id: c
            for c in db.execute(
                select(Card).where(Card.is_active.is_(True), Card.code_suffix.in_(("ER", "PR")))
            ).scalars()
        }
        old = {
            (r.card_pk, r.date, r.condition_grade): r
            for r in db.execute(select(DailyPrice).where(DailyPrice.date >= args.since)).scalars()
        }
        dates = sorted({d for (_pk, d, g) in old if g == "all"})
        new = daily_pricing.compute(db, card_pks=list(cards), dates=dates, dry_run=args.dry_run)

        stats: Counter[str] = Counter()
        changes = []
        for row in new:
            key = (row["card_pk"], row["date"], row["condition_grade"])
            before = old.get(key)
            if before is None:
                stats[f"新しい行（{row['condition_grade']}）"] += 1
                continue
            if before.average_asking_price != row["average_asking_price"]:
                stats[f"販売中の平均が変わる（{row['condition_grade']}）"] += 1
                if row["condition_grade"] == "all":
                    changes.append((cards[row["card_pk"]].official_code, row["date"], before.average_asking_price,
                                    row["average_asking_price"], before.asking_count, row["asking_count"]))
        print(f"対象 {len(cards)}枚 × {len(dates)}日（{dates[0] if dates else '-'}〜{dates[-1] if dates else '-'}）")
        for k, v in sorted(stats.items()):
            print(f"  {k}: {v}行")
        changes.sort(key=lambda c: -abs((c[3] or 0) - (c[2] or 0)))
        print("「すべて」の販売中の平均が大きく変わる行（上位30）:")
        for code, d, a, b, na, nb in changes[:30]:
            print(f"  {code:<14} {d} {a}円({na}件) → {b}円({nb}件)")
        sold = [r for r in new if r["average_price"] is not None and r["date"] == (dates[-1] if dates else None)]
        print(f"売れた価格の平均が出る（最新の日）: {len(sold)}行")
        if args.dry_run:
            print("（数えるだけ。DBは変えていません）")


if __name__ == "__main__":
    main()
