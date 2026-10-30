"""カードショップの販売価格を取って、shop_prices に保存する（カドソバと同じ作り）。

    python -m app.jobs.fetch_shop_prices             # 保存する
    python -m app.jobs.fetch_shop_prices --dry-run   # 読んで数えるだけ

毎日1回。いまはフルアヘッド（アイドル館）だけ（collectors/fullahead.py）。
R・Nを含む全カードが対象。画面はフリマの相場が無いカードに、これを
「ショップ参考価格」として出す。

保存のしかた（カドソバと同じ）
  ・一覧に載っていた商品は、在庫の有無にかかわらず今日の日付で1行ずつ保存
    （同じ日は上書き）。在庫0の行も stock=0 で保存し「在庫なし」を出せるようにする
  ・一覧に無いカードは行を作らない → 画面は最新の日付の行だけを見るので値段が消える
  ・最後まで読めなかった日は、価格は何も保存しない
  ・その日の取得が最後まで読めたかは shop_fetch_logs に必ず残す
  ・同じカード番号・同じ版（通常/パラレル）が一覧に2つあったら、決められないので
    その日は保存しない（どちらにも入れない）
"""

from __future__ import annotations

import argparse
import datetime as dt
import logging
from collections import Counter

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.collectors import fullahead
from app.config import settings
from app.db import session_scope
from app.models import Card, ShopFetchLog, ShopPrice

logger = logging.getLogger(__name__)

JST = dt.timezone(dt.timedelta(hours=9))


def _log_fetch(db, day: dt.date, *, complete: bool, items: int, in_stock: int) -> None:
    """その日の取得の結果を残す。成功済みの日を、あとの失敗で上書きしない。"""
    stmt = insert(ShopFetchLog).values(
        shop=fullahead.SHOP, date=day, complete=complete, items=items, in_stock=in_stock
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_shop_fetch_logs_shop_date",
        set_={
            "complete": ShopFetchLog.complete | stmt.excluded.complete,
            # "items" は ColumnCollection のメソッド名と衝突するので添字で取る
            "items": stmt.excluded["items"],
            "in_stock": stmt.excluded.in_stock,
            "fetched_at": dt.datetime.now(dt.timezone.utc),
        },
        where=(stmt.excluded.complete.is_(True)) | (ShopFetchLog.complete.is_(False)),
    )
    db.execute(stmt)


def run(*, dry_run: bool = False) -> dict[str, int]:
    items, complete, unknown_stock = fullahead.fetch_all()
    stats = {"読めた商品": len(items), "保存": 0, "パラレル": 0, "在庫なし": 0, "在庫不明": 0,
             "カード不明": 0, "重複で保留": 0}
    today = dt.datetime.now(JST).date()

    for raw in unknown_stock[:3]:
        logger.info("在庫の書き方が読めなかった商品の例:\n%s", raw)

    if not complete:
        logger.warning("最後まで読めなかったので、今日は価格を保存しません（取得の記録だけ残します）")
        stats["最後まで読めた"] = 0
        if not dry_run:
            with session_scope() as db:
                _log_fetch(db, today, complete=False, items=len(items), in_stock=0)
        return stats
    stats["最後まで読めた"] = 1

    dup = Counter((i.number, i.is_parallel) for i in items)

    with session_scope() as db:
        # official_code は "E1-04_PR"。"_" より前がショップのカード番号と同じ
        pks: dict[str, int] = {}
        for pk, code in db.execute(select(Card.id, Card.official_code)):
            pks.setdefault(code.split("_")[0], pk)

        rows = []
        in_stock = 0
        for item in items:
            pk = pks.get(item.number)
            if pk is None:
                stats["カード不明"] += 1
                logger.info("図鑑に無い番号: %s %s", item.number, item.title)
                continue
            if dup[(item.number, item.is_parallel)] > 1:
                stats["重複で保留"] += 1
                logger.info("同じ番号が2つ以上あるので保留: %s %s", item.number, item.title)
                continue
            if item.is_parallel:
                stats["パラレル"] += 1
            if item.stock is None:
                stats["在庫不明"] += 1
            elif item.stock <= 0:
                stats["在庫なし"] += 1
            else:
                in_stock += 1
            if dry_run:
                logger.info(
                    "%s%s %s %d円 在庫%s",
                    "【パラレル】" if item.is_parallel else "", item.number, item.title,
                    item.price, item.stock,
                )
            rows.append(
                {
                    "card_pk": pk,
                    "shop": fullahead.SHOP,
                    "is_parallel": item.is_parallel,
                    "date": today,
                    "price": item.price,
                    "stock": item.stock,
                    "url": item.url,
                }
            )
        stats["保存"] = len(rows)
        if dry_run:
            logger.info("dry-run なので保存しません（保存するはずだった行: %d）", len(rows))
            return stats
        if rows:
            stmt = insert(ShopPrice).values(rows)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_shop_prices_card_shop_variant_date",
                set_={
                    "price": stmt.excluded.price,
                    "stock": stmt.excluded.stock,
                    "url": stmt.excluded.url,
                    "fetched_at": dt.datetime.now(dt.timezone.utc),
                },
            )
            db.execute(stmt)
        _log_fetch(db, today, complete=True, items=len(items), in_stock=in_stock)
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="ショップの販売価格を取って保存する")
    parser.add_argument("--dry-run", action="store_true", help="読んで数えるだけ（保存しない）")
    args = parser.parse_args()
    logging.basicConfig(
        level=settings.log_level, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s"
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    for key, value in run(dry_run=args.dry_run).items():
        print(f"{key:12s}: {value}")


if __name__ == "__main__":
    main()
