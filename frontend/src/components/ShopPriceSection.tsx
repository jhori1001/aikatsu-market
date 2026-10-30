"use client";

import { useMemo, useState } from "react";
import { ShopPriceChart } from "./ShopPriceChart";
import type { ShopPricePoint } from "@/lib/shopPrice";

/**
 * ショップ参考価格の推移。フリマの相場（PriceSection）と同じ、
 * 期間タブ付きのグラフにする。データ自体は1日1値しか無いが、
 * 見た目をフリマ相場のグラフと揃えて、別物に見えないようにする。
 */
const RANGES: [string, number][] = [
  ["7日", 7],
  ["30日", 30],
  ["90日", 90],
];

function toDayNumber(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

export function ShopPriceSection({
  points,
  shopLabel,
}: {
  points: ShopPricePoint[];
  shopLabel: string;
}) {
  const [days, setDays] = useState(30);

  const visible = useMemo(() => {
    if (points.length === 0) return points;
    const dayNumbers = points.map((p) => toDayNumber(p.date)).filter((n) => !Number.isNaN(n));
    if (dayNumbers.length === 0) return points;
    const since = Math.max(...dayNumbers) - days + 1;
    return points.filter((p) => {
      const d = toDayNumber(p.date);
      return Number.isNaN(d) || d >= since;
    });
  }, [points, days]);

  return (
    <div>
      <ShopPriceChart points={visible} shopLabel={shopLabel} />
      <div className="shop-ref-tabs">
        {RANGES.map(([label, value]) => (
          <button
            key={value}
            type="button"
            className={value === days ? "active" : ""}
            onClick={() => setDays(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
