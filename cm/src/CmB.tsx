import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BigText,
  Bgm,
  CardImg,
  Chart,
  EndCard,
  INK,
  LAVENDER,
  Narration,
  PINK,
  PINK_DARK,
  Panel,
  PinkBg,
  Sparkles,
  fontFamily,
  usePop,
  yen,
} from "./common";
import { CREDIT_B, LINES_B } from "./lines";

// B版「売る前に・買う前に」。声は 春日部つむぎ の想定、BGM は bgm-b（120BPM）。
// 1: 文字がテンポよく出る → 2: 通常版とパラレル版で値段がこんなに違う → 3: グラフで値動き → 4: 検索

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 6, len - 6, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 拍（120BPM＝15フレーム）に合わせて文字を出す
const Beat: React.FC<{ at: number; children: React.ReactNode; size?: number; color?: string }> = ({ at, children, size = 150, color = INK }) => {
  const p = usePop(at, 9);
  return (
    <BigText size={size} color={color} stroke="#ffffff" style={{ transform: `scale(${p}) translateY(${(1 - p) * 60}px)`, opacity: p > 0.02 ? 1 : 0 }}>
      {children}
    </BigText>
  );
};

const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 100], [-80, 60]);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 102) }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(135deg, #ffffff 0 60px, #fff0f7 60px 120px)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 300 }}>
        <CardImg file="card-main.webp" width={500} rotate={8} style={{ transform: `translateX(${slide}px) rotate(8deg)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 26, flexDirection: "column" }}>
        <Beat at={4} size={130}>そのカード、</Beat>
        <Beat at={30} color={PINK_DARK}>売る前に。</Beat>
        <Beat at={52} color={LAVENDER}>買う前に。</Beat>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PriceTag: React.FC<{ label: string; price: number; color: string; at: number; badge: string }> = ({ label, price, color, at, badge }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 10);
  const n = interpolate(frame, [at, at + 28], [0, price], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Panel style={{ width: 460, padding: "34px 30px", textAlign: "center", transform: `scale(${p})`, opacity: p }}>
      <div style={{ display: "inline-block", background: color, color: "#fff", fontSize: 34, fontWeight: 900, padding: "6px 26px", borderRadius: 999 }}>{badge}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 18 }}>{label}</div>
      <div style={{ fontSize: 80, fontWeight: 900, color, marginTop: 8 }}>{yen(n)}</div>
    </Panel>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const stamp = usePop(0, 7);
  const vs = usePop(40, 8);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 117) }}>
      <PinkBg from="#ffe3f0" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 210, gap: 50, flexDirection: "column" }}>
        <div style={{ transform: `scale(${2 - stamp}) rotate(${(1 - stamp) * 25 - 6}deg)`, opacity: stamp }}>
          <BigText size={140}>相場チェック！</BigText>
        </div>
        <Img src={staticFile("img/aikatsu-logo-banner.webp")} style={{ width: 960, borderRadius: 34, opacity: stamp }} />
        <div style={{ fontFamily, fontWeight: 900, fontSize: 46, color: INK, opacity: vs }}>オーロラキスキャミソール</div>
        <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
          <PriceTag label="通常版" price={2900} color={PINK} at={30} badge="PR" />
          <div style={{ fontFamily, fontWeight: 900, fontSize: 60, color: LAVENDER, transform: `scale(${vs})` }}>vs</div>
          <PriceTag label="パラレル版" price={12430} color={LAVENDER} at={48} badge="PR★" />
        </div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 26, color: "#8a6b7c" }}>※ 2026年11月4日時点・Yahoo!フリマで販売中の出品の平均</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// オデットスワン（パラレル）の販売中の平均（2026-10-27〜11-04 の実測）
const ODETTE_P = [32910, 33240, 32810, 33770, 35610, 36000, 35300];

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 10);
  const panel = usePop(6, 12);
  const prog = interpolate(frame, [14, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const up = usePop(66, 8);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 112) }}>
      <AbsoluteFill style={{ background: "linear-gradient(160deg, #f4ecff 0%, #ffffff 55%, #ffe3f0 100%)" }}>
        <Sparkles count={26} color="#ffc7e3" />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 56, flexDirection: "column" }}>
        <BigText size={112} color={LAVENDER} style={{ transform: `scale(${head})` }}>
          値動きも
          <br />
          ひと目でわかる！
        </BigText>
        <Panel style={{ width: 960, transform: `translateY(${(1 - panel) * 300}px)`, opacity: panel }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 42, fontWeight: 900 }}>オデットスワン</div>
              <div style={{ display: "inline-block", marginTop: 10, background: `linear-gradient(135deg, #ff9ad5, ${LAVENDER})`, color: "#fff", fontSize: 28, fontWeight: 900, padding: "4px 18px", borderRadius: 999 }}>
                パラレル ER★
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, color: "#8a6b7c", fontWeight: 700 }}>販売中の平均</div>
              <div style={{ fontSize: 78, fontWeight: 900, color: PINK_DARK, lineHeight: 1 }}>{yen(ODETTE_P[ODETTE_P.length - 1])}</div>
            </div>
          </div>
          <div style={{ marginTop: 40 }}>
            <Chart points={ODETTE_P} progress={prog} width={870} height={300} color={LAVENDER} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#b592a6", fontWeight: 700, marginTop: 16 }}>
            <span>10/27</span>
            <span
              style={{
                transform: `scale(${up})`,
                background: "#ffe3f0",
                color: PINK_DARK,
                fontWeight: 900,
                fontSize: 30,
                padding: "6px 20px",
                borderRadius: 999,
              }}
            >
              10/27→11/4 ＋7.3%
            </span>
            <span>11/4</span>
          </div>
        </Panel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CmB: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
    <Bgm file="bgm-b.wav" />
    <Sequence durationInFrames={102}>
      <Scene1 />
    </Sequence>
    <Sequence from={100} durationInFrames={117}>
      <Scene2 />
    </Sequence>
    <Sequence from={215} durationInFrames={112}>
      <Scene3 />
    </Sequence>
    <Sequence from={325}>
      <AbsoluteFill>
        <PinkBg from="#efe7ff" to="#ffd6ea" />
        <EndCard credit={CREDIT_B} accent={LAVENDER} />
      </AbsoluteFill>
    </Sequence>
    <Narration lines={LINES_B} />
  </AbsoluteFill>
);
