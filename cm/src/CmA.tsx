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
  fontFamily,
  usePop,
  yen,
} from "./common";
import { CREDIT_A, LINES_A } from "./lines";

// A版「キラキラ・かわいい」。声は 四国めたん（あまあま）の想定、BGM は bgm-a（128BPM）。
// 1: いまいくら？ → 2: 相場が毎日わかる（値段とグラフ）→ 3: パラレルのランキング → 4: 検索してね

// オーロラキスキャミソール（パラレル）の販売中の平均（2026-10-27〜11-04 の実測）
const CAMI_P = [12720, 13190, 13100, 12320, 12630, 12870, 12430];

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 8, len - 8, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = usePop(4, 9);
  const c1 = usePop(14, 12);
  const c2 = usePop(22, 12);
  const c3 = usePop(30, 12);
  const q = usePop(48, 8);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 112) }}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        <Img src={staticFile("img/aikatsu-logo-banner.webp")} style={{ width: 980, borderRadius: 36, transform: `scale(${logo})` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: 330 }}>
        <div style={{ position: "relative", width: 1000, height: 820 }}>
          <CardImg file="card-left.webp" width={360} rotate={-14 * c1} style={{ position: "absolute", left: 40, top: 160, transform: `translateY(${(1 - c1) * 900}px) rotate(${-14 * c1}deg)` }} />
          <CardImg file="card-right.webp" width={360} style={{ position: "absolute", right: 40, top: 160, transform: `translateY(${(1 - c3) * 900}px) rotate(${14 * c3}deg)` }} />
          <CardImg file="card-main.webp" width={470} style={{ position: "absolute", left: 265, top: 40, transform: `translateY(${(1 - c2) * 900}px) rotate(${-3 * c2}deg)` }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 560 }}>
        <BigText size={150} style={{ transform: `scale(${q}) rotate(${(1 - q) * -10}deg)` }}>
          いまいくら？
        </BigText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(2, 12);
  const head = usePop(0, 10);
  const price = interpolate(frame, [10, 45], [0, CAMI_P[CAMI_P.length - 1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const chart = interpolate(frame, [30, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 117), alignItems: "center", paddingTop: 200, gap: 50, flexDirection: "column" }}>
      <BigText size={104} style={{ transform: `scale(${head})` }}>
        フリマの相場が
        <br />
        毎日わかる！
      </BigText>
      <Panel style={{ width: 940, transform: `translateY(${(1 - pop) * 400}px) scale(${0.9 + 0.1 * pop})`, opacity: pop }}>
        <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
          <CardImg file="card-main.webp" width={250} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 44, fontWeight: 900 }}>オーロラキス
              <br />
              キャミソール</div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ background: `linear-gradient(135deg, #ff9ad5, ${LAVENDER})`, color: "#fff", fontWeight: 900, fontSize: 28, padding: "6px 22px", borderRadius: 999 }}>パラレル</span>
              <span style={{ background: "linear-gradient(135deg, #e8ad2c, #ffd76a)", color: "#3a2a00", fontWeight: 900, fontSize: 28, padding: "6px 22px", borderRadius: 999 }}>PR★</span>
            </div>
            <div style={{ fontSize: 28, color: "#8a6b7c", fontWeight: 700, marginTop: 8 }}>販売中の平均（Yahoo!フリマ）</div>
            <div style={{ fontSize: 96, fontWeight: 900, color: PINK_DARK, lineHeight: 1 }}>{yen(price)}</div>
          </div>
        </div>
        <div style={{ marginTop: 46, paddingLeft: 10 }}>
          <Chart points={CAMI_P} progress={chart} width={830} height={230} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#b592a6", fontWeight: 700, marginTop: 16 }}>
            <span>10/27</span>
            <span>11/4</span>
          </div>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

const RANK = [
  { name: "オデットスワン", tag: "ER★", price: 35300 },
  { name: "オーロラキスリボン", tag: "PR★", price: 16240 },
  { name: "オーロラキスキャミソール", tag: "PR★", price: 12430 },
];

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 10);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 112), alignItems: "center", paddingTop: 230, gap: 46, flexDirection: "column" }}>
      <BigText size={108} style={{ transform: `scale(${head})` }}>
        パラレルの
        <br />
        価格ランキング
      </BigText>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: 940 }}>
        {RANK.map((r, i) => {
          const p = interpolate(frame, [12 + i * 9, 30 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <Panel
              key={r.name}
              style={{
                padding: "30px 40px",
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: p,
                transform: `translateX(${(1 - p) * 700}px)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 999,
                  background: i === 0 ? "linear-gradient(135deg, #e8ad2c, #ffd76a)" : i === 1 ? "#d9dbe3" : "#f0c2a0",
                  color: INK,
                  fontSize: 60,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: r.name.length > 10 ? 34 : 40, fontWeight: 900, whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 28, color: "#fff", display: "inline-block", marginTop: 10, background: `linear-gradient(135deg, #ff9ad5, ${LAVENDER})`, padding: "4px 18px", borderRadius: 999, fontWeight: 900 }}>
                  パラレル {r.tag}
                </div>
              </div>
              <div style={{ fontSize: 54, fontWeight: 900, color: PINK_DARK, whiteSpace: "nowrap" }}>{yen(r.price)}</div>
            </Panel>
          );
        })}
      </div>
      <div style={{ fontFamily, fontWeight: 700, fontSize: 26, color: "#8a6b7c" }}>※ 2026年11月4日時点・販売中の出品の平均</div>
    </AbsoluteFill>
  );
};

export const CmA: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <PinkBg />
    <Bgm file="bgm-a.wav" />
    <Sequence durationInFrames={112}>
      <Scene1 />
    </Sequence>
    <Sequence from={110} durationInFrames={117}>
      <Scene2 />
    </Sequence>
    <Sequence from={225} durationInFrames={112}>
      <Scene3 />
    </Sequence>
    <Sequence from={335}>
      <EndCard credit={CREDIT_A} accent={PINK} />
    </Sequence>
    <Narration lines={LINES_A} />
  </AbsoluteFill>
);
