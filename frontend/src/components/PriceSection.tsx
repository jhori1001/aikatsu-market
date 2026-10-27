"use client";

import { useMemo, useState } from "react";
import { PriceChart } from "./PriceChart";
import type { FakePricePoint } from "@/lib/fakePrice";

const RANGES: [string, number | null][] = [
  ["7日", 7],
  ["30日", 30],
  ["90日", 90],
  ["全期間", null],
];

export function PriceSection({ points }: { points: FakePricePoint[] }) {
  const [range, setRange] = useState<number | null>(30);

  const visible = useMemo(() => {
    if (range === null) return points;
    return points.slice(Math.max(0, points.length - range));
  }, [points, range]);

  return (
    <div className="panel price-panel">
      <PriceChart points={visible} />

      <div className="range-tabs">
        {RANGES.map(([label, days]) => (
          <button
            key={label}
            type="button"
            className={days === range ? "active" : ""}
            onClick={() => setRange(days)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="sample-note">
        ※ ここに出している価格・グラフはサンプルデータです。実際の取引価格ではありません。
      </p>
    </div>
  );
}
