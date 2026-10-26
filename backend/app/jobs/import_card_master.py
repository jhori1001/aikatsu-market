"""カード名・アイドル名を、画像から読み取った表で一括登録する。

公式HTMLにはカード名もアイドル名も載っていない。そこで card-sheets
ワークフローで自前DBのカード画像を一覧表にして、表面の品名・裏面の
アイドル名を読み取り、その結果を CSV にして流し込む。

official_code は公式サイトの画像ファイル名そのもの（一意）なので、鬼滅の
card_id のような曖昧な前方一致は不要。official_code がそのままキー。

CSV は `data/card_master_add.csv`。列は

    official_code,name,idol_name

name・idol_name が空の行はそのフィールドを更新しない（まだ読み取れていない
ものを空で上書きしないため）。

  python -m app.jobs.import_card_master            # 確認だけ
  python -m app.jobs.import_card_master --apply     # 実際に書き込む
"""

from __future__ import annotations

import argparse
import csv
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import session_scope
from app.models import Card

logger = logging.getLogger(__name__)

DEFAULT_PATH = "data/card_master_add.csv"


def _rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as fp:
        reader = csv.DictReader(fp)
        if reader.fieldnames is None or "official_code" not in reader.fieldnames:
            raise ValueError("CSV に official_code 列がありません")
        return [row for row in reader if (row.get("official_code") or "").strip()]


def run(db: Session, path: str | Path = DEFAULT_PATH, apply: bool = False) -> int:
    rows = _rows(Path(path))
    errors: list[str] = []
    planned: list[tuple[Card, dict[str, str]]] = []
    seen_codes: set[str] = set()

    cards_by_code = {c.official_code: c for c in db.execute(select(Card)).scalars().all()}

    for line_no, row in enumerate(rows, start=2):
        code = (row.get("official_code") or "").strip()
        name = (row.get("name") or "").strip()
        idol_name = (row.get("idol_name") or "").strip()

        if code in seen_codes:
            errors.append(f"{line_no}行目: official_code が CSV 内で重複しています（{code}）")
            continue
        seen_codes.add(code)

        card = cards_by_code.get(code)
        if card is None:
            errors.append(f"{line_no}行目: 該当するカードがありません（{code}）")
            continue

        changes: dict[str, str] = {}
        if name and card.name != name:
            changes["name"] = name
        if idol_name and card.idol_name != idol_name:
            changes["idol_name"] = idol_name
        if changes:
            planned.append((card, changes))

    if errors:
        for e in errors:
            logger.error(e)
        raise SystemExit(f"{len(errors)}件のエラーがあるため中止しました")

    logger.info("CSV %d行 / 変更予定 %d件", len(rows), len(planned))
    for card, changes in planned[:10]:
        logger.info("  %s: %s", card.official_code, changes)
    if len(planned) > 10:
        logger.info("  ...ほか%d件", len(planned) - 10)

    if not apply:
        logger.info("--apply のため書き込みませんでした（確認のみ）")
        return len(planned)

    for card, changes in planned:
        for k, v in changes.items():
            setattr(card, k, v)
    db.flush()
    logger.info("書き込みました: %d件", len(planned))
    return len(planned)


def main() -> None:
    parser = argparse.ArgumentParser(description="カード名・アイドル名を一括登録します")
    parser.add_argument("--path", default=DEFAULT_PATH, help="CSVのパス")
    parser.add_argument("--apply", action="store_true", help="実際に書き込む（既定は確認のみ）")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s"
    )
    with session_scope() as db:
        run(db, path=args.path, apply=args.apply)


if __name__ == "__main__":
    main()
