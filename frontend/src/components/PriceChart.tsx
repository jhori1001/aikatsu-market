"use client";

import { useEffect, useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayLabel } from "@/lib/format";

// カドソバの PriceChart と同じ描き方にしてある（2026-10-29、ユーザー指摘
// 「カドソバと全く同じにしてくれ」）。違いは線が1本（販売中の平均）しか
// 無いことだけなので、線の出し分け（凡例）は持たない。

/** 線の色。指定が無ければサイトのアクセント色。 */
const DEFAULT_ACCENT = "#ff5fa2";

/** 線の名前。Yahoo!フリマの販売中の出品の平均（daily_prices.average_asking_price） */
const LABEL = "販売中の平均";

export type ChartPoint = { date: string; price: number };

/** 目盛りの間隔として使う「きりのいい数」に丸める（1, 2, 2.5, 5 の桁上げ）。 */
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

/**
 * Y軸の範囲と目盛り。データの範囲に合わせつつ、目盛りはきりのいい数に載せる。
 */
export function niceScale(
  values: number[],
): { domain: [number, number]; ticks: number[] } | undefined {
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    // 点が1つしか無いとき（記録の日数が浅く、ほとんどのカードが当たる）。
    // 上下の余白をきりのいい数字に丸めると、値が丸め目盛りのどこに落ちるかで
    // 点の高さがカードごとにバラバラになる。一方で目盛りを値と無関係に
    // 置くと、横の罫線の位置がカードごとにバラバラになる
    // （2026-10-29、ユーザー指摘「点も線もバラバラ」）。
    // 値そのものを真ん中の目盛りにして、上下へ同じ間隔で2本ずつ置く。
    // どのカードでも罫線5本が同じ位置に並び、点は真ん中の線の上に乗る。
    let step = niceStep(Math.max(Math.abs(min) * 0.2, 100) / 2);
    // 0円より下に目盛りが出ないよう、安いカードだけ間隔を詰める
    if (min - 2 * step < 0) step = min / 2;
    if (step <= 0) step = 50;
    const ticks = [-2, -1, 0, 1, 2].map((i) => Math.round(min + i * step));
    return { domain: [min - 2 * step, min + 2 * step], ticks };
  }

  const spread = max - min;
  const step = niceStep(spread / 4);
  const lo = Math.max(0, Math.floor((min - spread * 0.1) / step) * step);
  const hi = Math.ceil((max + spread * 0.1) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { domain: [lo, hi], ticks };
}

/** 狭い枠で使う目盛りの書き方。「12,000円」は入らないので「1.2万」にする。 */
export function shortYen(v: number): string {
  if (v >= 10000) {
    const man = v / 10000;
    return `${man >= 10 ? Math.round(man) : man.toFixed(1)}万`;
  }
  return v.toLocaleString("ja-JP");
}

/**
 * 画面が狭いときだけ true。
 *
 * 目盛りの幅は recharts が中で決めるので、CSS では縮められない。
 * タイルの中に入るグラフ（dense）だけ、軸を細くするために使う。
 * dense が false のグラフ（詳細ページ）では一切効かせない。
 */
export function useNarrow(enabled: boolean): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const mq = window.matchMedia("(max-width: 719px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [enabled]);
  return enabled && narrow;
}

export function PriceChart({
  points,
  accent = DEFAULT_ACCENT,
  showLegend = true,
  dense = false,
}: {
  points: ChartPoint[];
  accent?: string;
  /** 金額の吹き出しを出すか。ホームのタイルのように小さい枠では出さない */
  showLegend?: boolean;
  /** タイルの中など、横幅が狭い場所に置くとき */
  dense?: boolean;
}) {
  const narrow = useNarrow(dense);

  // SVGのグラデーションIDはページ内で一意でないと、
  // 同じ画面に複数のグラフを置いたとき先に定義されたものに引きずられる。
  const uid = useId().replace(/:/g, "");
  const fillId = `fill-${uid}`;

  const rows = points.map((p) => ({ date: p.date, label: dayLabel(p.date), price: p.price }));

  if (rows.length === 0) {
    return <div className="empty">この期間の価格データがまだありません。</div>;
  }

  // 1日ぶんしか無いと線が引けないので、丸を大きく出す
  const singlePoint = rows.length <= 1;
  // 点が多い期間は、丸を並べると線がつぶれて見えなくなる
  const manyPoints = rows.length > 40;
  const scale = niceScale(rows.map((r) => r.price));

  return (
    <div>
      <div className="chart-box">
        <ResponsiveContainer>
          <ComposedChart
            data={rows}
            // 狭いときは余白を削って、線を引く場所をできるだけ広く取る
            margin={narrow ? { top: 6, right: 6, bottom: 0, left: 0 } : { top: 10, right: 16, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: narrow ? 9 : 11, fill: "var(--text-dim)" }}
              stroke="var(--border)"
              tickLine={false}
              // 日付が重なると読めないので、狭いときは間引く
              minTickGap={narrow ? 30 : 16}
            />
            <YAxis
              domain={scale ? scale.domain : ["auto", "auto"]}
              ticks={scale?.ticks}
              tick={{ fontSize: narrow ? 9 : 11, fill: "var(--text-dim)" }}
              stroke="var(--border)"
              tickLine={false}
              width={narrow ? 34 : 76}
              tickFormatter={(v: number) => (narrow ? shortYen(v) : `${v.toLocaleString("ja-JP")}円`)}
            />
            {/* 金額の吹き出しは大きいグラフ（詳細ページ）だけ。ホームの小さい
                タイルでは、カードに触れただけで金額が浮き出て邪魔になる */}
            {showLegend ? (
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
                formatter={(value: number | string, name: string) => [
                  typeof value === "number" ? `${value.toLocaleString("ja-JP")}円` : value,
                  name,
                ]}
              />
            ) : null}
            <Area
              name={LABEL}
              type="linear"
              dataKey="price"
              stroke={accent}
              strokeWidth={narrow ? 2 : 2.5}
              fill={`url(#${fillId})`}
              dot={
                // 狭い枠や点の多い期間は丸で線が埋まるので消す。
                // 1日しか無いときだけは、点を出さないと何も描かれない。
                !singlePoint && (narrow || manyPoints)
                  ? false
                  : { r: singlePoint ? 5 : 3.5, fill: "var(--surface)", stroke: accent, strokeWidth: 2 }
              }
              activeDot={{ r: 6, fill: accent, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 凡例を出さない小さいグラフでは、何の線なのかを一言だけ添える */}
      {!showLegend ? <div className="chart-caption">{LABEL}</div> : null}
    </div>
  );
}
