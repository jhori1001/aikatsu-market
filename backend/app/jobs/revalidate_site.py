"""サイト（kadosoba.com/aikatsu。中身は aikatsu-market.vercel.app/aikatsu）の作り置きのページを作り直させる。

    python -m app.jobs.revalidate_site            # 合図を送って、全ページを1回ずつ開く
    python -m app.jobs.revalidate_site --no-warm  # 合図だけ

公開ページは毎日の更新のあとに1回だけ作り、あとは作り置きを出す
（カドソバ＝nichirin-market の F2 と同じ、2026-11-05）。見に来た人や検索エンジンの
ロボットが来てもDB（Neon）が起きないようにするため。

DBの中身を変えるワークフロー（毎日の相場・ショップ価格・判定の付け直し・カードの
取り込みなど）の最後にこれを流す。流れ:
  1. POST /api/revalidate（鍵は DATABASE_URL のパスワードから作る。
     frontend/src/app/api/revalidate/route.ts と同じ作り方）
     → 作り置きが「作り直し待ち」になる
  2. 全ページを1回ずつ開く
     → 開いたときに作り直される。DBが起きているのはこの数分だけ
     （作り直しは裏で行われるので、この1回目は古いページが返ってもよい）

ページの一覧は、サイトマップが無いので DB のカード一覧（cards.official_code）から作る。
アクセスするのは自分のサイトだけ。
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import hashlib
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# サイトは basePath=/aikatsu（frontend/next.config.mjs）。kadosoba.com/aikatsu は日輪の Vercel が
# ここへ回しているだけなので、作り直しは Vercel のアイカツのプロジェクトへ直に送る（同じ作り置き）
SITE_URL = os.environ.get("SITE_URL", "https://aikatsu-market.vercel.app/aikatsu").rstrip("/")
USER_AGENT = "aikatsu-revalidate (own site; GitHub Actions)"
WORKERS = 6
# カード以外の公開ページ
# ホームは SITE_URL そのもの（basePath の下の "/" は "/aikatsu/" → "/aikatsu" へ転送されるため "" にする）
FIXED_PATHS = ("", "/cards", "/mylist", "/about", "/terms", "/privacy")


def revalidate_key() -> str:
    raw = os.environ.get("DATABASE_URL", "")
    # postgresql+psycopg:// でも postgres:// でも、パスワードの部分だけを使う
    parsed = urllib.parse.urlsplit(re.sub(r"^[A-Za-z0-9+.-]+://", "postgresql://", raw))
    password = urllib.parse.unquote(parsed.password or "")
    if not password:
        raise SystemExit("DATABASE_URL にパスワードがありません（GitHub の Secrets を確認）")
    return hashlib.sha256(f"aikatsu-revalidate:{password}".encode()).hexdigest()


def request(url: str, *, method: str = "GET", headers: dict | None = None, timeout: int = 60):
    req = urllib.request.Request(
        url, method=method, headers={"User-Agent": USER_AGENT, **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.status, res.read()


def card_codes() -> list[str]:
    """DBのカード一覧（図鑑に載っているもの）。読むだけ。"""
    from sqlalchemy import select

    from app.db import session_scope
    from app.models import Card

    with session_scope() as db:
        return list(
            db.execute(
                select(Card.official_code).where(Card.is_active.is_(True)).order_by(Card.official_code)
            ).scalars()
        )


def page_urls() -> list[str]:
    urls = [f"{SITE_URL}{p}" for p in FIXED_PATHS]
    urls += [f"{SITE_URL}/cards/{urllib.parse.quote(code)}" for code in card_codes()]
    return urls


def warm(url: str) -> tuple[str, int | str, float]:
    started = time.monotonic()
    try:
        status, _ = request(url, timeout=90)
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception as e:  # noqa: BLE001
        status = type(e).__name__
    return url, status, time.monotonic() - started


def main() -> int:
    parser = argparse.ArgumentParser(description="作り置きのページを作り直させる")
    parser.add_argument("--no-warm", action="store_true", help="合図だけ送り、ページは開かない")
    args = parser.parse_args()

    try:
        status, body = request(
            f"{SITE_URL}/api/revalidate",
            method="POST",
            headers={"x-revalidate-key": revalidate_key()},
        )
        print(f"作り直しの合図: HTTP {status} {body.decode(errors='replace')[:200]}")
    except urllib.error.HTTPError as e:
        print(f"作り直しの合図が失敗: HTTP {e.code}（鍵が合わない／デプロイ前など）")
        return 1

    if args.no_warm:
        return 0

    urls = page_urls()
    print(f"ページを開いて作り直させる: {len(urls)}ページ（{WORKERS}本ずつ）")
    started = time.monotonic()
    bad: list[tuple[str, int | str]] = []
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for url, status, _sec in pool.map(warm, urls):
            if status != 200:
                bad.append((url, status))
    print(f"開き終わり: {time.monotonic() - started:.0f}秒 / 失敗 {len(bad)}件")
    for url, status in bad[:20]:
        print(f"  {status} {url}")
    # 1〜2件の失敗（一時的なタイムアウトなど）でワークフロー全体を落とさない。
    # その件は次に開かれたときに作られる
    return 1 if len(bad) > max(5, len(urls) // 10) else 0


if __name__ == "__main__":
    sys.exit(main())
