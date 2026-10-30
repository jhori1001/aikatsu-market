"""フルアヘッド（アイドル館 fullahead-idol.com）のアイカツ！アンコール販売一覧を読む。

  https://fullahead-idol.com/shopbrand/ak-e01/    1弾のカテゴリ一覧（検索ではない）

カドソバで使っているフルアヘッド（pt-fullahead.com）と同じ会社・同じ作りの店。

確かめたこと（2026-10-30、probe_fullahead.py）
  ・robots.txt は無い（404）。利用規約・会社概要に自動取得・転載の条項は無い
  ・GitHub のサーバーから普通に開ける
  ・1ページ50件・2ページ（計97件）。3ページ目は商品0件
  ・商品名は「E1-04 オーロラキスリボン PR」。パラレル版は
    「【パラレル】E1-04 オーロラキスリボン PR★」
  ・文字コードは EUC-JP

礼儀（カドソバと同じ）
  ・名乗りを付ける（連絡先入り）。偽装しない
  ・1回の実行で最大4ページだけ。5秒あける
  ・弾かれたら（403 など）そこで止める。迂回しない
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from app.collectors.http import PoliteClient

logger = logging.getLogger(__name__)

SHOP = "fullahead_idol"
SHOP_LABEL = "フルアヘッド"
BASE = "https://fullahead-idol.com"
# 弾が増えたらここに足す（ak-e02 など）
LIST_URLS = [BASE + "/shopbrand/ak-e01/"]
USER_AGENT = "aikatsu-market-price-check (+https://aikatsu-market.vercel.app; contact: wanc0968@gmail.com)"
INTERVAL_SEC = 5.0
MAX_PAGES = 4

# 下見（probe_fullahead.py）で実際に97件読めた形。商品ページへのリンクは
# 商品名の直前にある <a href> から別に拾う（店の見た目の作りが変わっても
# 価格・在庫の読み取りまで巻き込まれないように）
_ITEM_RE = re.compile(
    r'<span class="itemName">([^<]*)</span>.*?<strong>([^<]*)</strong>(.*?)</span>\s*<div class="item-add-basket">',
    re.S,
)
_HREF_RE = re.compile(r'<a href="([^"]+)"')
_STOCK_RE = re.compile(r'<span class="M_item-stock[^"]*"[^>]*>([^<]*)</span>')
# 「【パラレル】E1-04 オーロラキスリボン PR★」
_NAME_RE = re.compile(r"^\s*(【パラレル】)?\s*([A-Z]+\d*-\d+)\s+(.*?)\s*(★)?\s*$")
# 品切れの書き方（在庫の数字が出ない商品）
_SOLD_OUT_WORDS = ("SOLD OUT", "SOLDOUT", "soldout", "売り切れ", "品切れ", "在庫切れ")


@dataclass(frozen=True)
class ShopItem:
    number: str  # カード番号（E1-04）。official_code の "_" より前と同じ
    title: str
    is_parallel: bool
    price: int
    stock: int | None
    url: str | None


def parse_page(html: str) -> list[ShopItem]:
    """1ページぶんの商品を読む。カード番号の無い商品・価格の読めない商品は飛ばす。"""
    out: list[ShopItem] = []
    for found in _ITEM_RE.finditer(html):
        name, price, rest = found.groups()
        hrefs = _HREF_RE.findall(html[max(0, found.start() - 1500): found.start()])
        href = hrefs[-1] if hrefs else ""
        m = _NAME_RE.match(name.replace("　", " "))
        digits = re.sub(r"[^\d]", "", price)
        if not m or not digits:
            continue
        is_parallel = bool(m.group(1) or m.group(4))
        stock = None
        s = _STOCK_RE.search(rest)
        if s:
            n = re.search(r"(\d+)", s.group(1))
            stock = int(n.group(1)) if n else None
        if stock is None and any(w in rest for w in _SOLD_OUT_WORDS):
            stock = 0
        url = href if href.startswith("http") else (BASE + href if href.startswith("/") else None)
        out.append(ShopItem(m.group(2), m.group(3).strip(), is_parallel, int(digits), stock, url))
    return out


def fetch_all() -> tuple[list[ShopItem], bool, list[str]]:
    """全ページを読む。(商品, 最後まで読めたか, 在庫の書き方が読めなかった商品の生HTML) を返す。

    途中で弾かれたら、読めたところまでを返して complete=False にする。
    complete=False のときは「一覧に無い＝扱っていない」とは言えないので、
    呼び出し側は価格を何も保存しない。
    """
    items: list[ShopItem] = []
    unknown_stock: list[str] = []
    complete = True
    client = PoliteClient(min_interval_sec=INTERVAL_SEC, user_agent=USER_AGENT, max_retries=1)
    try:
        for list_url in LIST_URLS:
            for page in range(1, MAX_PAGES + 1):
                url = list_url if page == 1 else f"{list_url}page{page}/order/"
                try:
                    res = client.get(url)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("フルアヘッド %s を取得できません（ここで止めます）: %s", url, exc)
                    complete = False
                    break
                html = res.content.decode("euc-jp", errors="replace")
                got = parse_page(html)
                logger.info("フルアヘッド %s: %d件", url, len(got))
                if not got:
                    # 1ページ目から空なら読み方が変わった可能性があるので、完全とは言わない
                    if page == 1:
                        complete = False
                    break
                for item in got:
                    if item.stock is None:
                        i = html.find(item.title)
                        unknown_stock.append(html[i: i + 700] if i >= 0 else item.title)
                items.extend(got)
            if not complete:
                break
    finally:
        client.close()
    return items, complete, unknown_stock
