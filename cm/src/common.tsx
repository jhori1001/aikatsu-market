import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { continueRender, delayRender } from "remotion";
import narration from "./narration.json";
import type { Line } from "./lines";

// サイトと同じ丸ゴシック（Zen Maru Gothic、OFL。public/fonts に置いた TTF を読む。
// Google Fonts から読むと、この環境のブラウザが証明書で弾くため）
export const fontFamily = "ZenMaru";
if (typeof document !== "undefined") {
  const handle = delayRender("font");
  const faces = [
    new FontFace(fontFamily, `url(${staticFile("fonts/ZenMaruGothic-Bold.ttf")})`, { weight: "700" }),
    new FontFace(fontFamily, `url(${staticFile("fonts/ZenMaruGothic-Black.ttf")})`, { weight: "900" }),
  ];
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
}

export const PINK = "#ff5fa2";
export const PINK_DARK = "#e8408a";
export const LAVENDER = "#a78bfa";
export const INK = "#3a2233";

/** 決まった並びの乱数（毎回同じ絵になるように） */
function rand(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** キラキラの星。ゆっくり瞬く */
export const Sparkles: React.FC<{ count?: number; color?: string }> = ({ count = 40, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = rand(i) * width;
        const y = rand(i + 99) * height;
        const s = 10 + rand(i + 7) * 34;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (10 + rand(i + 3) * 18) + i));
        return (
          <svg
            key={i}
            width={s}
            height={s}
            viewBox="0 0 20 20"
            style={{ position: "absolute", left: x, top: y, opacity: tw, transform: `rotate(${frame * 0.6 + i * 20}deg)` }}
          >
            <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/** ピンクのグラデーションの背景 */
export const PinkBg: React.FC<{ from?: string; to?: string }> = ({ from = "#ffd6ea", to = "#e9dcff" }) => {
  const frame = useCurrentFrame();
  const angle = 140 + Math.sin(frame / 40) * 12;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${from} 0%, #fff0f7 50%, ${to} 100%)` }}>
      <Sparkles />
    </AbsoluteFill>
  );
};

/** ぽんっと出る（拡大しながら現れる） */
export function usePop(delay = 0, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.6 } });
}

/** 縁取りの太い見出し文字 */
export const BigText: React.FC<{ children: React.ReactNode; size?: number; color?: string; stroke?: string; style?: React.CSSProperties }> = ({
  children,
  size = 110,
  color = PINK_DARK,
  stroke = "#ffffff",
  style,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.15,
      color,
      textAlign: "center",
      WebkitTextStroke: `${Math.round(size / 9)}px ${stroke}`,
      paintOrder: "stroke fill",
      textShadow: "0 10px 30px rgba(232, 64, 138, 0.35)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** 字幕（いまのナレーションを下に出す）＋ナレーションの音（あれば） */
export const Narration: React.FC<{ lines: Line[]; bottom?: number }> = ({ lines, bottom = 210 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const idx = lines.findIndex((l, i) => t >= l.at && t < (lines[i + 1]?.at ?? durationInFrames / fps));
  const cur = idx >= 0 ? lines[idx] : null;
  const local = cur ? frame - cur.at * fps : 0;
  const op = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <>
      {narration.available
        ? lines.map((l) => (
            <Sequence key={l.file} from={Math.round(l.at * fps)}>
              <Audio src={staticFile(`audio/${l.file}`)} volume={1} />
            </Sequence>
          ))
        : null}
      {cur ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom }}>
          <div
            style={{
              opacity: op,
              transform: `translateY(${(1 - op) * 20}px)`,
              fontFamily,
              fontWeight: 900,
              fontSize: 48,
              color: INK,
              background: "rgba(255,255,255,0.92)",
              border: `5px solid ${PINK}`,
              borderRadius: 999,
              padding: "18px 42px",
              maxWidth: 980,
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(58,34,51,0.15)",
            }}
          >
            {cur.text}
          </div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};

/** BGM（最後は自分でフェードアウトしている） */
export const Bgm: React.FC<{ file: string; volume?: number }> = ({ file, volume = 0.55 }) => (
  <Audio src={staticFile(`audio/${file}`)} volume={narration.available ? volume * 0.7 : volume} />
);

export const yen = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;

/** 値段の推移の折れ線（だんだん描かれる） */
export const Chart: React.FC<{ points: number[]; progress: number; width: number; height: number; color?: string }> = ({
  points,
  progress,
  width,
  height,
  color = PINK,
}) => {
  const min = Math.min(...points) * 0.97;
  const max = Math.max(...points) * 1.03;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * width, height - ((p - min) / (max - min)) * height]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const len = 2000;
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id="reveal">
          <rect x={0} y={-20} width={width * progress} height={height + 40} />
        </clipPath>
      </defs>
      <g clipPath="url(#reveal)">
        <path d={area} fill="url(#fill)" />
        <path d={d} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={11} fill="#fff" stroke={color} strokeWidth={6} />
        ))}
      </g>
    </svg>
  );
};

/** 画面の中の「サイトのカード」の枠 */
export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: "#ffffff",
      borderRadius: 48,
      border: "4px solid #ffd9ea",
      boxShadow: "0 24px 60px rgba(255,95,162,0.25), 0 8px 24px rgba(58,34,51,0.08)",
      padding: 44,
      fontFamily,
      color: INK,
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardImg: React.FC<{ file: string; width: number; rotate?: number; style?: React.CSSProperties }> = ({
  file,
  width,
  rotate = 0,
  style,
}) => (
  <Img
    src={staticFile(`img/${file}`)}
    style={{
      width,
      borderRadius: 26,
      transform: `rotate(${rotate}deg)`,
      boxShadow: "0 30px 60px rgba(58,34,51,0.3)",
      ...style,
    }}
  />
);

/** 最後の画面（サイトのバナー＋アドレス）。A・B で共通 */
export const EndCard: React.FC<{ credit: string; accent?: string }> = ({ credit, accent = PINK }) => {
  const pop = usePop(0, 10);
  const pop2 = usePop(8, 12);
  const frame = useCurrentFrame();
  const glow = 0.6 + 0.4 * Math.abs(Math.sin(frame / 8));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, flexDirection: "column" }}>
      <Img
        src={staticFile("img/hero-banner.webp")}
        style={{ width: 1000, borderRadius: 40, transform: `scale(${pop})`, boxShadow: "0 30px 70px rgba(255,95,162,0.35)" }}
      />
      <div style={{ transform: `scale(${pop2})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 64,
            color: "#fff",
            background: `linear-gradient(90deg, ${accent}, ${LAVENDER})`,
            padding: "26px 60px",
            borderRadius: 999,
            boxShadow: `0 0 ${40 * glow}px rgba(255,95,162,${0.6 * glow})`,
          }}
        >
          🔍 カドソバ アイカツ
        </div>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 56, color: INK }}>kadosoba.com/aikatsu</div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 26, color: "#8a6b7c", marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
          ※ 相場はフリマで販売中の出品の平均とショップ価格による参考値です
          <br />
          非公式のファンサイトです　{narration.available ? credit : ""}
        </div>
      </div>
    </AbsoluteFill>
  );
};
