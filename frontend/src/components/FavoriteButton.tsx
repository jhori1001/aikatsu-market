"use client";

import { useMyList } from "@/lib/mylist";

/**
 * 「すき」の登録ボタン。相場もコレクション枚数も扱わないので、
 * 持っている／好きの○×だけを切り替える単純なハートボタン。
 */
export function FavoriteButton({ code }: { code: string }) {
  const { items, ready, toggle } = useMyList();
  const active = Boolean(items[code]);

  if (!ready) {
    return <div className="fav-btn" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className={`fav-btn ${active ? "active" : ""}`}
      onClick={() => toggle(code)}
      aria-pressed={active}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
      {active ? "すき済み" : "すきに追加"}
    </button>
  );
}
