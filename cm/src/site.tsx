import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CardImg, Chart, INK, LAVENDER, PINK, PINK_DARK, Tap, fontFamily, yen } from "./common";

// サイト（kadosoba.com/aikatsu）のカード詳細ページを、動画の中で組み直したもの。
// 見出しの言葉（販売中の平均（Yahoo!フリマ）・価格推移・7日間/30日間・♡ すきに追加）はサイトと同じ。
// 色はサイトの CSS（--accent #ff5fa2 など）に合わせている。

// 実際の相場（販売中の出品の平均、2026-10-27〜11-04 の記録）
export const CAMI_P = [12720, 13190, 13100, 12320, 12630, 12870, 12430];
export const ODETTE_P = [32910, 33240, 32810, 33770, 35610, 36000, 35300];

export const SiteHeader: React.FC<{ mylist?: number; pulse?: number }> = ({ mylist = 0, pulse = 0 }) => (
  <div
    style={{
      height: 78,
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "0 26px",
      paddingTop: 34,
      background: "#fff",
      borderBottom: "2px solid #ffd9ea",
      fontFamily,
    }}
  >
    <div style={{ fontWeight: 900, fontSize: 34, color: "#1d1418" }}>
      カド<span style={{ color: PINK }}>ソバ</span>
    </div>
    <div style={{ fontWeight: 700, fontSize: 24, color: "#8a6b7c" }}>カード</div>
    <div style={{ fontWeight: 700, fontSize: 24, color: "#8a6b7c", display: "flex", alignItems: "center", gap: 6 }}>
      マイリスト
      {mylist > 0 ? (
        <span
          style={{
            background: PINK,
            color: "#fff",
            fontSize: 18,
            fontWeight: 900,
            minWidth: 30,
            height: 30,
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 + pulse * 0.5})`,
          }}
        >
          {mylist}
        </span>
      ) : null}
    </div>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; tone?: "parallel" | "rare" }> = ({ children, tone = "rare" }) => (
  <span
    style={{
      background: tone === "parallel" ? `linear-gradient(135deg, #ff9ad5, ${LAVENDER})` : "linear-gradient(135deg, #e8ad2c, #ffd76a)",
      color: tone === "parallel" ? "#fff" : "#3a2a00",
      fontWeight: 900,
      fontSize: 20,
      padding: "4px 14px",
      borderRadius: 999,
    }}
  >
    {children}
  </span>
);

/** カード詳細ページ（上の部分: カード・名前・値段、下: 価格推移のグラフ） */
export const SiteDetail: React.FC<{
  card: string;
  name: React.ReactNode;
  rarity: string;
  points: number[];
  progress: number;
  /** 値段の数字を 0→本当の値段 に数え上げる割合 */
  count?: number;
  /** 最後の点を光らせる（0〜1） */
  glow?: number;
  fav?: boolean;
  tapAt?: number;
  mylist?: number;
  mylistPulse?: number;
  color?: string;
  change?: string;
}> = ({ card, name, rarity, points, progress, count = 1, glow = 0, fav = false, tapAt, mylist = 0, mylistPulse = 0, color = PINK, change }) => {
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const diff = last - prev;
  return (
    <div style={{ fontFamily, color: INK, background: "#fff6fb", width: "100%", height: "100%", position: "relative" }}>
      <SiteHeader mylist={mylist} pulse={mylistPulse} />
      <div style={{ padding: "22px 24px", display: "flex", gap: 22 }}>
        <CardImg file={card} width={200} style={{ borderRadius: 14, boxShadow: "0 10px 24px rgba(58,34,51,0.2)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25 }}>{name}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge tone="parallel">パラレル</Badge>
            <Badge>{rarity}</Badge>
          </div>
          <div style={{ fontSize: 18, color: "#8a6b7c", fontWeight: 700, marginTop: 6 }}>販売中の平均（Yahoo!フリマ）</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: PINK_DARK, lineHeight: 1 }}>{yen(last * count)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: diff >= 0 ? "#d9467a" : "#4a7bd9" }}>
            前日比 {diff >= 0 ? "+" : "−"}
            {Math.abs(diff).toLocaleString("ja-JP")}円
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 4,
              fontSize: 20,
              fontWeight: 900,
              padding: "8px 18px",
              borderRadius: 999,
              border: `3px solid ${PINK}`,
              background: fav ? PINK : "#fff",
              color: fav ? "#fff" : PINK_DARK,
              position: "relative",
            }}
          >
            {fav ? "♥ すき済み" : "♡ すきに追加"}
          </div>
        </div>
      </div>
      <div style={{ margin: "0 18px", background: "#fff", borderRadius: 24, border: "2px solid #ffd9ea", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>価格推移</div>
          <div style={{ display: "flex", background: "#ffeef6", borderRadius: 999, padding: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, padding: "6px 16px", borderRadius: 999, background: color, color: "#fff" }}>7日間</span>
            <span style={{ fontSize: 18, fontWeight: 700, padding: "6px 16px", color: "#8a6b7c" }}>30日間</span>
          </div>
        </div>
        <div style={{ marginTop: 26, position: "relative" }}>
          <Chart points={points} progress={progress} width={548} height={250} color={color} />
          {glow > 0 ? (
            <div
              style={{
                position: "absolute",
                right: -26,
                top: 250 - ((last - Math.min(...points) * 0.97) / (Math.max(...points) * 1.03 - Math.min(...points) * 0.97)) * 250 - 26,
                width: 52,
                height: 52,
                borderRadius: 999,
                border: `6px solid ${color}`,
                opacity: glow,
                transform: `scale(${1 + glow * 0.6})`,
              }}
            />
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: "#b592a6", fontWeight: 700, marginTop: 12 }}>
          <span>10/27</span>
          {change ? <span style={{ color: PINK_DARK, fontWeight: 900 }}>{change}</span> : null}
          <span>11/4</span>
        </div>
      </div>
      {tapAt !== undefined ? <Tap x={318} y={398} at={tapAt} /> : null}
    </div>
  );
};

/** 検索欄に文字が1文字ずつ入っていく */
export const TypingSearch: React.FC<{ text: string; at: number; perChar?: number; width?: number }> = ({ text, at, perChar = 3, width = 820 }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - at) / perChar)));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const op = interpolate(frame, [at - 6, at], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity: op,
        width,
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: "#fff",
        border: `5px solid ${PINK}`,
        borderRadius: 999,
        padding: "22px 36px",
        fontFamily,
        fontWeight: 900,
        fontSize: 54,
        color: INK,
        boxShadow: "0 16px 40px rgba(255,95,162,0.3)",
      }}
    >
      <span style={{ fontSize: 46 }}>🔍</span>
      <span>
        {text.slice(0, n)}
        <span style={{ opacity: caret ? 1 : 0, color: PINK }}>|</span>
      </span>
    </div>
  );
};
