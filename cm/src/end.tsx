import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { INK, PINK, PinkBg, fontFamily, usePop } from "./common";
import { CREDIT } from "./lines";

// 最後の画面（TikTok・ショート共通）: サイトのバナー → 検索欄に「カドソバ アイカツ」→ アドレス

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

export const EndSearch: React.FC<{ startTypingAt?: number }> = ({ startTypingAt = 8 }) => {
  const pop = usePop(0, 10);
  const frame = useCurrentFrame();
  const glow = 0.6 + 0.4 * Math.abs(Math.sin(frame / 8));
  return (
    <AbsoluteFill>
      <PinkBg from="#efe7ff" to="#ffd6ea" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 56, flexDirection: "column" }}>
        <Img src={staticFile("img/hero-banner.webp")} style={{ width: 960, borderRadius: 40, transform: `scale(${pop})`, boxShadow: `0 30px 70px rgba(255,95,162,${0.3 * glow + 0.1})` }} />
        <TypingSearch text="カドソバ アイカツ" at={startTypingAt} perChar={3} />
        <div style={{ fontFamily, fontWeight: 900, fontSize: 60, color: INK, opacity: interpolate(frame, [36, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          kadosoba.com/aikatsu
        </div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 24, color: "#8a6b7c", textAlign: "center", lineHeight: 1.6 }}>
          ※ 相場はフリマで販売中の出品の平均とショップ価格による参考値です
          <br />
          非公式のファンサイトです　{CREDIT}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

