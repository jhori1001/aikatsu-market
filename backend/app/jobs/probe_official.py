"""公式カードリストでパラレル版がどう載っているかを確かめる下見（読み取りだけ）。

    python -m app.jobs.probe_official

display=1/2/3 それぞれで 1弾・プロモの件数、画像ファイル名（alt）、画像URL、
カード枠のクラス名などを出す。DBにはつながない。
"""

from __future__ import annotations

import collections
import logging

from bs4 import BeautifulSoup

from app.collectors.aikatsu import AikatsuCollector

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-5s %(message)s")
    with AikatsuCollector() as col:
        top = col._get({"search": "true"})
        for field in ("series", "display", "rarity", "sort"):
            print(f"選択肢 {field}: {col._dropdown_values(top, field)}")
        for series in ("629001", "629901"):
            for display in ("1", "2", "3"):
                soup: BeautifulSoup = col._get(
                    {"search": "true", "series": series, "display": display, "sort": "1"}
                )
                items = soup.select(".cardList__item")
                alts = [(i.select_one(".cardList__img") or {}).get("alt", "") for i in items]
                dup = [a for a, n in collections.Counter(alts).items() if n > 1]
                print(f"\n=== series={series} display={display}: {len(items)}件 / alt重複 {len(dup)}")
                print("重複alt:", dup[:20])
                classes = collections.Counter(" ".join(i.get("class", [])) for i in items)
                print("item class:", dict(classes))
                for i in items[:3] + [x for x in items if "PR" in str(x)][:2]:
                    img = i.select_one(".cardList__img")
                    print("---", img.get("alt") if img else None, img.get("data-src") if img else None)
                    print(str(i)[:1500])
                # 重複altの例を全部
                for a in dup[:6]:
                    for i in items:
                        img = i.select_one(".cardList__img")
                        if img is not None and img.get("alt") == a:
                            back = i.select_one(".cardModal__face--back img")
                            print("DUP", a, img.get("data-src") or img.get("src"),
                                  back.get("data-src") if back else None,
                                  i.get("class"))
        print("\nリクエスト数:", col.request_count)


if __name__ == "__main__":
    main()
