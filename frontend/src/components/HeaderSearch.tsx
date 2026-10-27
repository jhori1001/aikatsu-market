"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** ヘッダーの検索。カード名・アイドル名・カード番号で一覧へ飛ばす。 */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    router.push(value ? `/cards?q=${encodeURIComponent(value)}` : "/cards");
  }

  return (
    <form className="header-search" onSubmit={submit} role="search">
      <span className="header-search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="カード名・アイドル名で検索"
        aria-label="カードを検索"
        enterKeyHint="search"
      />
    </form>
  );
}
