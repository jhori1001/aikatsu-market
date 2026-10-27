"use client";

import { useMemo, useState } from "react";
import { PriceChart, type ChartPoint } from "./PriceChart";

const RANGES: [string, number | null][] = [
  ["7日", 7],
  ["30日", 30],
  ["90日", 90],
  ["全期間", null],
];

export function PriceSection({
  points,
  sample = true,
}: {
  points: ChartPoint[];
  /** サンプルデータの注記を出すか（実データのときはfalse） */
  sample?: boolean;
}) {
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

      {sample ? (
        <p className="sample-note">
          ※ ここに出している価格・グラフはサンプルデータです。実際の取引価格ではありません。
        </p>
      ) : (
        <p className="sample-note">
          ※ Yahoo!フリマの販売中の出品から算出した参考価格です。実際の取引価格とは異なる場合があります。
        </p>
      )}
    </div>
  );
}
