"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayLabel } from "@/lib/format";

const ACCENT = "#ff5fa2";

export type ChartPoint = { date: string; price: number };

function niceStep(rough: number): number {
  const exp = Math.floor(Math.log10(rough || 1));
  const base = Math.pow(10, exp);
  const n = rough / base;
  if (n <= 1) return 1 * base;
  if (n <= 2) return 2 * base;
  if (n <= 2.5) return 2.5 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}

function niceScale(values: number[]): { domain: [number, number]; ticks: number[] } | undefined {
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    // 点が1つしか無いとき（今の記録はまだ日数が浅く、ほとんどのカードが
    // これに当たる）。上下の余白を「きりのいい数字」に丸めると、値が
    // 丸め目盛りのどこに落ちるかで点の高さが毎回バラバラになる
    // （2026-10-29、ユーザー指摘：複数カードを並べると点の位置が不揃い）。
    // 丸めずに値の真上・真下へ同じ幅で余白を取り、必ず縦の中央に来るようにする。
    const rawPad = Math.max(Math.abs(min) * 0.2, 100);
    const lo = Math.max(0, min - rawPad);
    const pad = min - lo; // 0円付近で切り詰められても、中央からのずれを同じに保つ
    const hi = min + pad;
    const step = niceStep((hi - lo) / 4 || 1);
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Math.round(v));
    return { domain: [lo, hi], ticks };
  }

  const spread = max - min;
  const step = niceStep(spread / 4);
  const lo = Math.max(0, Math.floor((min - spread * 0.1) / step) * step);
  const hi = Math.ceil((max + spread * 0.1) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { domain: [lo, hi], ticks };
}

function shortYen(v: number): string {
  if (v >= 10000) {
    const man = v / 10000;
    return `${man >= 10 ? Math.round(man) : man.toFixed(1)}万`;
  }
  return v.toLocaleString("ja-JP");
}

export function PriceChart({ points, dense = false }: { points: ChartPoint[]; dense?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const rows = points.map((p) => ({ label: dayLabel(p.date), price: p.price }));
  const values = points.map((p) => p.price);
  const scale = niceScale(values);
  const manyPoints = rows.length > 40;

  if (rows.length === 0) {
    return <div className="empty">この期間のデータがありません。</div>;
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: dense ? 9 : 11, fill: "var(--text-dim)" }}
            stroke="var(--border)"
            tickLine={false}
            minTickGap={dense ? 30 : 16}
          />
          <YAxis
            domain={scale ? scale.domain : ["auto", "auto"]}
            ticks={scale?.ticks}
            tick={{ fontSize: dense ? 9 : 11, fill: "var(--text-dim)" }}
            stroke="var(--border)"
            tickLine={false}
            width={dense ? 34 : 76}
            tickFormatter={(v: number) => (dense ? shortYen(v) : `${v.toLocaleString("ja-JP")}円`)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--text)",
              boxShadow: "var(--shadow-sm)",
            }}
            labelStyle={{ color: "var(--text-dim)", marginBottom: 2 }}
            formatter={(value: number) => [`${value.toLocaleString("ja-JP")}円`, "参考価格"]}
          />
          <Area
            name="参考価格"
            type="monotone"
            dataKey="price"
            stroke={ACCENT}
            strokeWidth={2.5}
            fill={`url(#fill-${uid})`}
            dot={manyPoints ? false : { r: 3, fill: "var(--surface)", stroke: ACCENT, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: ACCENT, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
