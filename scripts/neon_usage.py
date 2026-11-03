"""Neon の今月の使用量と、おおよその料金を出す（読むだけ）。

    NEON_API_KEY=... python scripts/neon_usage.py

Neon の API（https://console.neon.tech/api/v2）からプロジェクトごとの
「今の請求期間の使用量」を読み、Launch プランの単価で料金を見積もる。
カドソバ（日輪）とアイカツの両方のプロジェクトを1回で出す。
DBそのものにはつながない（使用量を増やさない）。

単価（Launch プラン、2026-10 時点の想定。変わったらここを直す）
  ・計算（compute）: $0.106 / CU-時間
  ・保存（storage）: $0.35 / GB-月
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://console.neon.tech/api/v2"
COMPUTE_USD_PER_CU_HOUR = 0.106
STORAGE_USD_PER_GB_MONTH = 0.35
HOURS_PER_MONTH = 730
JPY_PER_USD = 155  # 目安。円の額はおおよそ

# 使用量として出したい項目（API の項目名 → 表示名）
FIELDS = [
    ("compute_time_seconds", "計算時間（CU秒）"),
    ("active_time_seconds", "稼働時間（秒）"),
    ("cpu_used_sec", "CPU使用（秒）"),
    ("data_storage_bytes_hour", "保存量×時間（バイト時）"),
    ("synthetic_storage_size", "保存量（バイト）"),
    ("written_data_bytes", "書き込み（バイト）"),
    ("data_transfer_bytes", "転送（バイト）"),
    ("consumption_period_start", "集計の開始"),
    ("consumption_period_end", "集計の終わり"),
]


def get(path: str, key: str) -> dict:
    req = urllib.request.Request(
        API + path, headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        # 何が悪いのか分かるよう、Neon の返した理由を出す（キーそのものは出ない）
        body = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"{path} → HTTP {e.code}: {body}") from None


def main() -> int:
    key = os.environ.get("NEON_API_KEY")
    if not key:
        print("NEON_API_KEY が設定されていません（GitHub の Secrets に登録してください）")
        return 1

    # 個人のキーで組織に属するプロジェクトを読むときは org_id が要る
    # （付けないと 400 が返る）。先に組織を調べ、組織ごとに一覧を取る
    projects: list[dict] = []
    try:
        orgs = get("/users/me/organizations", key).get("organizations", [])
    except RuntimeError as e:
        print(f"組織の一覧が取れません（組織のキーの可能性）: {e}")
        orgs = []
    for org in orgs:
        projects += get(f"/projects?org_id={org['id']}", key).get("projects", [])
    if not orgs:
        projects = get("/projects", key).get("projects", [])

    lines = ["## Neon の今月の使用量", ""]
    # GitHub の「注記」（annotation）にも1行ずつ出す。公開リポジトリの注記は
    # ログインなしの API で読めるので、毎朝の報告（Claude の予定タスク）が
    # 認証なしで数字を拾える（ジョブのログは認証が要る）
    notices: list[str] = []
    total_usd = 0.0
    total_cu = 0.0
    for p in projects:
        detail = get(f"/projects/{p['id']}", key).get("project", p)
        lines.append(f"### {detail.get('name')}（{detail.get('id')}）")
        for field, label in FIELDS:
            if field in detail:
                lines.append(f"- {label}: {detail[field]}")

        compute_h = (detail.get("compute_time_seconds") or 0) / 3600
        storage_gb_month = (detail.get("data_storage_bytes_hour") or 0) / 1e9 / HOURS_PER_MONTH
        usd = compute_h * COMPUTE_USD_PER_CU_HOUR + storage_gb_month * STORAGE_USD_PER_GB_MONTH
        total_usd += usd
        total_cu += compute_h
        notices.append(f"{detail.get('name')}: {compute_h:.2f} CU-時間 / ${usd:.2f}")
        lines.append(
            f"- **見積もり: ${usd:.2f}（約{usd * JPY_PER_USD:,.0f}円）** "
            f"= 計算 {compute_h:.2f} CU-時間 + 保存 {storage_gb_month:.4f} GB-月"
        )
        lines.append("")

    lines.append(f"**合計の見積もり: ${total_usd:.2f}（約{total_usd * JPY_PER_USD:,.0f}円）**")
    lines.append("")
    lines.append(
        "※ 無料プランのプロジェクトは請求されないが、計算上の額は出している。"
        "実際の請求は Neon の請求書（毎月1日）が正。"
    )
    period = next(
        (p.get("consumption_period_start") for p in projects if p.get("consumption_period_start")), ""
    )
    import datetime as dt

    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M JST")
    notices.insert(
        0,
        f"合計 {total_cu:.2f} CU-時間 / ${total_usd:.2f}（約{total_usd * JPY_PER_USD:,.0f}円）"
        f" ／ {now}時点・集計開始 {period}",
    )
    for n in notices:
        print(f"::notice title=Neon使用量::{n}")

    text = "\n".join(lines)
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(text + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
