"""カードの状態（コンディション）の分類。カドソバの services/conditions.py と同じ。

Yahoo!フリマの状態コードを「美品」と「傷あり」に振り分ける。
    new     新品、未使用
    used10  未使用に近い
    used20  目立った傷や汚れなし
    used40  やや傷や汚れあり
    used60  傷や汚れあり
    used80  全体的に状態が悪い
"""

from __future__ import annotations

GRADE_MINT = "mint"
GRADE_DAMAGED = "damaged"
GRADE_UNKNOWN = "unknown"

# 「美品」扱いにする状態コード（カドソバと同じ線引き）
MINT_GRADES = ("new", "used10", "used20")

CONDITION_LABEL = {
    "new": "新品、未使用",
    "used10": "未使用に近い",
    "used20": "目立った傷や汚れなし",
    "used40": "やや傷や汚れあり",
    "used60": "傷や汚れあり",
    "used80": "全体的に状態が悪い",
}


def classify(item_condition: str | None) -> str:
    """状態コードを mint / damaged / unknown に振り分ける。"""
    if not item_condition:
        return GRADE_UNKNOWN
    code = item_condition.strip().lower()
    if code in MINT_GRADES:
        return GRADE_MINT
    if code in CONDITION_LABEL:
        return GRADE_DAMAGED
    # 未知のコードは勝手に「傷あり」にせず、不明にする
    return GRADE_UNKNOWN
