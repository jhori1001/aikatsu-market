"use client";

import Link from "next/link";
import type { Card } from "@/lib/cards";
import type { TrackedCardData } from "@/lib/realPrice";
import type { ShopPrice, ShopPricePoint } from "@/lib/shopPrice";
import { BigTile } from "@/components/BigTile";
import { useUrlParams } from "@/lib/useUrlParams";

/**
 * ランキングの中身（タブの切り替え）。日輪の RankingView と同じ作り（2026-11-11、ユーザー指示
 * 「ランキングのページを日輪と同じにして」）。ページは毎日の更新のあとに1回だけ作り、
 * タブ（?type=）はここ（ブラウザ側）で絞る。日輪のタブはバトル・サポートだが、
 * アイカツには無いので「パラレル」「通常版」にしている。
 */

export const TABS = [
  { key: "all", label: "すべて", href: "/ranking" },
  { key: "parallel", label: "パラレル", href: "/ranking?type=parallel" },
  { key: "normal", label: "通常版", href: "/ranking?type=normal" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** グラフを1枚ずつ描くので、際限なく並べない */
const MAX = 40;

export type RankedItem = {
  card: Card;
  data: TrackedCardData | undefined;
  shop: ShopPrice | null;
  shopPoints: ShopPricePoint[];
};

function pickType(value: string | null | undefined): TabKey {
  const hit = TABS.find((t) => t.key === value);
  return hit ? hit.key : "all";
}

export function RankingFromUrl(props: { items: RankedItem[] }) {
  const params = useUrlParams();
  return <RankingView {...props} type={params.get("type")} />;
}

export function RankingView({ items, type }: { items: RankedItem[]; type?: string | null }) {
  const tab = pickType(type);
  const shown = items
    .filter((r) => tab === "all" || (tab === "parallel" ? r.card.is_parallel : !r.card.is_parallel))
    .slice(0, MAX);

  return (
    <>
      <nav className="rank-tabs">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`rank-tab ${t.key === tab ? "current" : ""}`}
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="empty">価格データがまだありません。</div>
      ) : (
        <div className="big-grid">
          {shown.map((r, i) => (
            <div key={r.card.id} className="big-grid-item">
              <span className={`big-grid-no ${i < 3 ? `medal-${i + 1}` : ""}`}>{i + 1}</span>
              <BigTile card={r.card} data={r.data} shop={r.shop} shopPoints={r.shopPoints} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
