"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dayLabel } from "@/lib/format";
import type { ShopPricePoint } from "@/lib/shopPrice";
import { niceScale, shortYen, useNarrow } from "./PriceChart";

// フリマの相場（赤系）と混同しないよう、店の定価は緑にする
const ACCENT = "#3f8f6b";

/**
 * ショップ参考価格（フルアヘッドなど）の値段の推移。
 *
 * daily_prices（フリマの相場。外れ値除去や複数状態の集計込み）とは別物で、
 * shop_prices の値段をそのまま日付順に並べるだけ。店の定価は1日1値しか
 * 無いので、線は1本で済む（PriceChart のような系列の出し分けは要らない）。
 * 見た目（余白・軸・点・吹き出しの出し分け）は PriceChart と揃えてある
 * （2026-10-05、「フリマのグラフと全く同じにして」）。
 */
export function ShopPriceChart({
  points,
  shopLabel,
  showLegend = true,
  dense = false,
  sparkline = false,
}: {
  points: ShopPricePoint[];
  /** グラフの吹き出し・添え書きに出す店名（例: フルアヘッド） */
  shopLabel: string;
  /** 金額の吹き出し。ホームやランキングの小さいタイルでは出さない */
  showLegend?: boolean;
  /** 2枚並べたタイルの中など、横幅が半分しか無い場所に置くとき */
  dense?: boolean;
  /** 軸・グリッド線・キャプションを出さない、線だけの最小表示。
      狭い箱の中に「ついでに」添えるとき（ショップ参考価格の箱の中など）用 */
  sparkline?: boolean;
}) {
  const narrow = useNarrow(dense);
  const uid = useId().replace(/:/g, "");
  const fillId = `fill-shop-${uid}`;

  const rows = points.map((p) => ({
    date: p.date,
    label: dayLabel(p.date),
    price: p.price,
  }));

  if (rows.length === 0) {
    return <div className="empty">{shopLabel}の価格データがまだありません。</div>;
  }

  const singlePoint = rows.length === 1;
  const scale = niceScale(rows.map((r) => r.price));

  return (
    <div>
      <div className={sparkline ? "chart-box chart-box-spark" : "chart-box"}>
        <ResponsiveContainer>
          <ComposedChart
            data={rows}
            margin={
              sparkline
                ? { top: 6, right: 6, bottom: 0, left: 6 }
                : narrow
                  ? { top: 6, right: 6, bottom: 0, left: 0 }
                  : { top: 10, right: 16, bottom: 4, left: 4 }
            }
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* CartesianGrid/XAxis/YAxis をフラグメントでまとめて出し分けると、
                recharts が軸をまったく認識せず（domainの指定が効かず、
                軸の目盛りも出ない）描画されなかった。PriceChart と同じく、
                1要素ずつ直接の子として置く */}
            {!sparkline ? <CartesianGrid stroke="var(--border)" vertical={false} /> : null}
            {!sparkline ? (
              <XAxis
                dataKey="label"
                tick={{ fontSize: narrow ? 9 : 11, fill: "var(--text-dim)" }}
                stroke="var(--border)"
                tickLine={false}
                minTickGap={narrow ? 30 : 16}
              />
            ) : null}
            <YAxis
              domain={scale ? scale.domain : ["auto", "auto"]}
              ticks={sparkline ? undefined : scale?.ticks}
              tick={sparkline ? undefined : { fontSize: narrow ? 9 : 11, fill: "var(--text-dim)" }}
              stroke="var(--border)"
              tickLine={false}
              width={sparkline ? undefined : narrow ? 34 : 76}
              tickFormatter={
                sparkline
                  ? undefined
                  : (v: number) => (narrow ? shortYen(v) : `${v.toLocaleString("ja-JP")}円`)
              }
              hide={sparkline}
            />
            {/* 金額の吹き出しは PriceChart と同じ理由で、大きいグラフだけ出す */}
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
              formatter={(value: number | string) => [
                typeof value === "number" ? `${value.toLocaleString("ja-JP")}円` : value,
                shopLabel,
              ]}
            />
            ) : null}
            <Area
              name={shopLabel}
              type="linear"
              dataKey="price"
              stroke={ACCENT}
              strokeWidth={narrow ? 2 : 2.5}
              fill={`url(#${fillId})`}
              dot={
                // PriceChart と同じ理由（狭い枠では点を出さない。1点だけの
                // ときは点が無いと何も描かれない）
                sparkline || (narrow && !singlePoint)
                  ? false
                  : {
                      r: singlePoint ? 5 : 3.5,
                      fill: "var(--surface)",
                      stroke: ACCENT,
                      strokeWidth: 2,
                    }
              }
              activeDot={{ r: 6, fill: ACCENT, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* 凡例を出さない小さいタイルでは、何の線なのかを一言だけ添える
          （PriceChart の chart-caption と同じ役目） */}
      {!showLegend && !sparkline ? (
        <div className="chart-caption">{shopLabel}の販売価格</div>
      ) : null}
    </div>
  );
}
