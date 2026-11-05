// カードの見せ方の小さな関数（DBに触らない）。
//
// ブラウザ側の部品（一覧の絞り込み・マイリストなど）からも使うので、
// DBにつなぐ lib/cards.ts とは分けてある（分けないとDBの部品がブラウザに送られる）。

import type { Card } from "@/lib/cards";

/**
 * 画面に出すカード番号。パラレル版は official_code が "E1-01_PR_p1" なので、
 * 末尾の "_p1" を外して通常版と同じ番号で見せる（パラレルは別の札で示す）。
 */
export function displayCode(card: Pick<Card, "official_code">): string {
  return card.official_code.replace(/_p\d+$/, "");
}

/** レアリティの記号。パラレル版はショップの表記に合わせて「★」を付ける（PR★・ER★） */
export function suffixLabel(card: Pick<Card, "code_suffix" | "is_parallel">): string | null {
  if (!card.code_suffix) return null;
  return card.is_parallel ? `${card.code_suffix}★` : card.code_suffix;
}

