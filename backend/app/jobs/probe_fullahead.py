"""フルアヘッド（アイドル館 fullahead-idol.com）のアイカツ！アンコール一覧の下見。

    python -m app.jobs.probe_fullahead

保存はしない。DBにもつながない。読み取りだけ。

カドソバで使っているフルアヘッド（pt-fullahead.com）と同じ会社の別サイト。
カドソバと同じ手順で、使ってよいか・どう読めるかを先に確かめる。
  ・robots.txt の中身
  ・利用規約らしいページに、自動取得・転載の条項があるか
  ・一覧の1ページ目〜（最大6ページ）で、商品名・価格・在庫がどう書かれているか

礼儀（カドソバと同じ）
  ・名乗りを付ける（連絡先入り）。偽装しない
  ・ページの取得は5秒あける。弾かれたらそこで止める。迂回しない
"""

from __future__ import annotations

import re

from app.collectors.http import PoliteClient

BASE = "https://fullahead-idol.com"
LIST_URL = BASE + "/shopbrand/ak-e01/"
USER_AGENT = "aikatsu-market-price-check (+https://aikatsu-market.vercel.app; contact: wanc0968@gmail.com)"
INTERVAL_SEC = 5.0
MAX_PAGES = 6

TERMS_CANDIDATES = ["/html/info.html", "/html/company.html", "/html/privacy.html"]
TERMS_WORDS = ["自動", "クロール", "スクレイピング", "ロボット", "転載", "複製", "無断"]

ITEM_RE = re.compile(
    r'<span class="itemName">([^<]*)</span>.*?<strong>([^<]*)</strong>(.*?)</span>\s*<div class="item-add-basket">',
    re.S,
)
STOCK_RE = re.compile(r'<span class="M_item-stock[^"]*"[^>]*>([^<]*)</span>')


def decode(res) -> str:
    raw = res.content
    m = re.search(rb'charset=["\']?([A-Za-z0-9_-]+)', raw[:3000])
    enc = m.group(1).decode() if m else "utf-8"
    print(f"  文字コード: {enc}")
    try:
        return raw.decode(enc, errors="replace")
    except LookupError:
        return raw.decode("utf-8", errors="replace")


def main() -> int:
    with PoliteClient(min_interval_sec=INTERVAL_SEC, user_agent=USER_AGENT, max_retries=0) as client:
        print("===== robots.txt =====")
        try:
            res = client.get(BASE + "/robots.txt")
            print(f"  status {res.status_code}")
            print(res.text[:3000])
        except Exception as exc:  # noqa: BLE001
            print(f"  取得できない: {exc}")

        print("\n===== 利用規約らしいページ =====")
        for path in TERMS_CANDIDATES:
            try:
                res = client.get(BASE + path)
            except Exception as exc:  # noqa: BLE001
                print(f"{path}: 取得できない ({exc})")
                continue
            text = re.sub(r"<[^>]+>", " ", decode(res))
            text = re.sub(r"\s+", " ", text)
            print(f"{path}: status {res.status_code} 長さ {len(text)}")
            for word in TERMS_WORDS:
                for m in re.finditer(word, text):
                    print(f"   [{word}] …{text[max(0, m.start() - 80): m.end() + 80]}…")

        print("\n===== 一覧 =====")
        total = 0
        for page in range(1, MAX_PAGES + 1):
            url = LIST_URL if page == 1 else f"{LIST_URL}page{page}/order/"
            try:
                res = client.get(url)
            except Exception as exc:  # noqa: BLE001
                print(f"page{page}: 取得できない（ここで止める）: {exc}")
                break
            print(f"page{page}: status {res.status_code} {url}")
            html = decode(res)
            if page == 1:
                t = re.search(r"<title>([^<]*)</title>", html)
                print(f"  title: {t.group(1) if t else '?'}")
                pages = sorted(set(re.findall(r"/shopbrand/ak-e01/page(\d+)/", html)), key=int)
                print(f"  ページ送りに出てくる番号: {pages}")
            items = ITEM_RE.findall(html)
            print(f"  読めた商品: {len(items)}件")
            if not items:
                i = html.find("itemName")
                print("  商品の読み方が合わない。itemName の周り:")
                print(html[max(0, i - 600): i + 900] if i >= 0 else html[:1500])
                break
            for name, price, rest in items:
                s = STOCK_RE.search(rest)
                print(f"   {name.strip()} | {price.strip()} | 在庫:{s.group(1).strip() if s else '?'}")
            total += len(items)
        print(f"\n合計 {total}件")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
