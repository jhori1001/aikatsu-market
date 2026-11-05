import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LAVENDER, PINK, Phone, fontFamily, usePop } from "./common";

// ユーザーが撮った本物のサイトの画面（2026-11-05）。どちらも public/shots/ に置き、リポジトリには入れない
// （カード画像が写っているため）。
//   odette.jpg … 価格ランキングのオデットスワン（パラレル ER）。1179×1770。35,550円・7日間 +2,640円
//   site.mp4  … トップ → きらめくレアカード → 価格ランキングを横にスワイプ → 値上がり（7.1秒、1180×2392）
export const SHOT_W = 1179;
export const SHOT_H = 1770;
// 写真の中のグラフの描かれている範囲（写真の座標）
const PLOT = { x0: 322, x1: 975, y0: 960, y1: 1418 };
// 最後の点（11/05）
const LAST = { x: 968, y: 1103 };

/** 価格ランキングの写真。グラフの線が左から右へ描かれていくように見せる。
 *  reveal: 0→1、glow: 最後の点を光らせる（0〜1）、cropTop: 写真の上を何px切るか */
export const ChartShot: React.FC<{ width: number; reveal: number; glow?: number; cropTop?: number }> = ({ width, reveal, glow = 0, cropTop = 110 }) => {
  const k = width / SHOT_W;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: (SHOT_H - cropTop) * k,
        overflow: "hidden",
        borderRadius: 44,
        boxShadow: "0 30px 70px rgba(255,95,162,0.3), 0 0 0 6px #ffd9ea",
        background: "#fff",
      }}
    >
      <Img src={staticFile("shots/odette.jpg")} style={{ position: "absolute", left: 0, top: -cropTop * k, width }} />
      {/* まだ描かれていない右側をグラフの背景色で隠す */}
      <div
        style={{
          position: "absolute",
          left: (PLOT.x0 + (PLOT.x1 - PLOT.x0 + 20) * reveal) * k,
          top: (PLOT.y0 - cropTop) * k,
          width: (PLOT.x1 - PLOT.x0 + 30) * (1 - reveal) * k,
          height: (PLOT.y1 - PLOT.y0) * k,
          background: "#fff",
        }}
      />
      {glow > 0 ? (
        <div
          style={{
            position: "absolute",
            left: LAST.x * k - 40,
            top: (LAST.y - cropTop) * k - 40,
            width: 80,
            height: 80,
            borderRadius: 999,
            border: `8px solid ${PINK}`,
            opacity: glow,
            transform: `scale(${1 + glow * 0.7})`,
          }}
        />
      ) : null}
    </div>
  );
};

/** 写真から、カードの絵の部分だけを切り出して出す（つかみ用） */
export const CardFromShot: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => {
  const box = { x: 48, y: 320, w: 348, h: 504 };
  const k = width / box.w;
  return (
    <div style={{ width, height: box.h * k, overflow: "hidden", borderRadius: 28, boxShadow: "0 30px 60px rgba(58,34,51,0.3)", position: "relative", ...style }}>
      <Img src={staticFile("shots/odette.jpg")} style={{ position: "absolute", width: SHOT_W * k, left: -box.x * k, top: -box.y * k }} />
    </div>
  );
};

/** 写真の中の数字（7日間 +2,640円 など）を指す吹き出し */
export const Callout: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const p = usePop(at, 8);
  return (
    <div
      style={{
        position: "absolute",
        transform: `scale(${p}) rotate(-5deg)`,
        opacity: p > 0.02 ? 1 : 0,
        fontFamily,
        fontWeight: 900,
        fontSize: 58,
        color: "#fff",
        background: `linear-gradient(135deg, ${PINK}, ${LAVENDER})`,
        padding: "14px 34px",
        borderRadius: 999,
        boxShadow: "0 14px 34px rgba(255,95,162,0.45)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// 録画の長さ（秒）。終わったあとは最後の画面（site-last.jpg）で止めておく
const REC_LEN = 7.06;

/** 録画をスマホの枠に入れて流す。from: 録画の何秒目から、rate: 速さ。録画が終わったら最後の画面で止まる */
export const RecPhone: React.FC<{ from: number; rate?: number; width?: number }> = ({ from, rate = 1, width = 640 }) => {
  const playable = Math.floor(((REC_LEN - from) / rate) * 30);
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" };
  return (
    <Phone width={width}>
      <AbsoluteFill>
        <Img src={staticFile("shots/site-last.jpg")} style={fill} />
        <Sequence durationInFrames={playable}>
          <OffthreadVideo src={staticFile("shots/site.mp4")} startFrom={Math.round(from * 30)} playbackRate={rate} muted style={fill} />
        </Sequence>
      </AbsoluteFill>
    </Phone>
  );
};

export const useReveal = (a: number, b: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};
