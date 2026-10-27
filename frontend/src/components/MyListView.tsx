"use client";

import Link from "next/link";
import { useMyList } from "@/lib/mylist";
import type { Card } from "@/lib/cards";
import { CardArt } from "@/components/CardThumb";

/**
 * すきなカードリストの中身。どれを登録したかはブラウザの中にしかないので、
 * サーバーは全カードを渡すだけにして、絞り込みはここでやる。
 */
export function MyListView({ cards }: { cards: Card[] }) {
  const { items, ready, remove, clear } = useMyList();

  if (!ready) {
    return <div className="empty">読み込んでいます…</div>;
  }

  const rows = cards.filter((card) => items[card.official_code]);

  if (rows.length === 0) {
    return (
      <div className="mylist-empty">
        <p>まだ1枚も登録されていません。</p>
        <p className="mylist-empty-note">
          カードの一覧や詳細のページにある「♡ すきに追加」を押すと、ここに溜まります。
        </p>
        <Link href="/cards" className="hero-cta">
          カードを探す <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="page-sub">{rows.length}枚登録しています</p>
      <div className="card-grid">
        {rows.map((card) => (
          <div key={card.official_code} className="mylist-tile">
            <Link href={`/cards/${encodeURIComponent(card.official_code)}`} className="card-tile">
              <CardArt card={card} />
              <div className="card-meta">
                <div className="card-name">{card.name ?? "（名称未入力）"}</div>
                <div className="card-sub">{card.idol_name ?? ""}</div>
              </div>
            </Link>
            <button
              type="button"
              className="mylist-remove"
              onClick={() => remove(card.official_code)}
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <div className="mylist-footer">
        <button
          type="button"
          className="mylist-clear"
          onClick={() => {
            if (window.confirm("登録したカードを全部消します。元に戻せません。")) clear();
          }}
        >
          リストを空にする
        </button>
      </div>
    </>
  );
}
