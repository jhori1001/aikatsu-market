import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BigText, Bgm, CardImg, INK, LAVENDER, Narration, PINK, PINK_DARK, Panel, PinkBg, Sparkles, fontFamily, usePop } from "./common";
import { EndSearch } from "./end";
import { LINES_GM } from "./lines";
import { CardFromShot, Callout, ChartShot, RecPhone, useReveal } from "./real";

// プレイヤー向け版（15秒、2026-11-13）。ターゲットはアイカツのゲームで遊んでいる女性。
// 転売ヤーは呼ばない: 「売りどき」「値上がりで儲かる」など売る側の言葉は使わず、
// 「推しのコーデをそろえる」「高すぎる値段で買わない」「ほしいカードはマイリストに」で通す。
//
// 0.0〜2.0秒   推しのコーデ、そろえたい！（コーデのカードが集まってくる・ハート）
// 2.0〜4.4秒   でも、このカードの相場っていくら？（カードと「？」）
// 4.4〜6.8秒   値動きがグラフでわかる（本物のサイトの写真。グラフが描かれる）
// 6.8〜9.4秒   高すぎる値段で買わなくてすむ（サイトの録画：ランキングをスワイプ）
// 9.4〜11.8秒  ほしいカードはマイリストにハート（♡ すきに追加 → ♥ すき済み）
// 11.8〜15秒   検索

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** ふわっと上がっていくハート */
const Hearts: React.FC<{ count?: number }> = ({ count = 14 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = ((i * 137) % 1000) + 40;
        const speed = 3 + (i % 4);
        const y = 1900 - ((frame * speed + i * 160) % 2100);
        const size = 40 + (i % 3) * 22;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, fontSize: size, color: i % 2 ? PINK : LAVENDER, opacity: 0.55 }}>
            ♥
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(0, 10);
  const c1 = usePop(4, 12);
  const c2 = usePop(10, 12);
  const c3 = usePop(16, 12);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 61) }}>
      <PinkBg />
      <Hearts />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 190 }}>
        <BigText size={128} style={{ transform: `scale(${t})`, whiteSpace: "nowrap" }}>
          推しのコーデ、
          <br />
          <span style={{ color: LAVENDER }}>そろえたい！</span>
        </BigText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: 20 }}>
        <div style={{ position: "relative", width: 1000, height: 640 }}>
          {/* カードの絵はサイトの録画・写真から1枚ずつきれいに切り出したもの（public/shots/、リポジトリには入れない）。
              前はバナーから切り抜いていて、端が見切れたり隣のカードが写り込んだりしていた（2026-11-13） */}
          <div style={{ position: "absolute", left: 60, top: 110, transform: `translateY(${(1 - c1) * 900}px) rotate(${-12 * c1}deg)` }}>
            <CardFromShot width={300} />
          </div>
          <Img src={staticFile("shots/gm-shoes.jpg")} style={{ position: "absolute", right: 60, top: 110, width: 300, borderRadius: 20, boxShadow: "0 30px 60px rgba(58,34,51,0.3)", transform: `translateY(${(1 - c3) * 900}px) rotate(${12 * c3}deg)` }} />
          <Img src={staticFile("shots/gm-cami.jpg")} style={{ position: "absolute", left: 320, top: 30, width: 360, borderRadius: 24, boxShadow: "0 30px 60px rgba(58,34,51,0.3)", transform: `translateY(${(1 - c2) * 900}px) rotate(${-2 * c2}deg)` }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const card = usePop(0, 12);
  const q = usePop(12, 7);
  const tag = usePop(22, 9);
  const wobble = Math.sin(frame / 4) * 6;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 73) }}>
      <PinkBg from="#ffe3f0" to="#efe7ff" />
      <Sparkles count={24} color="#ffc7e3" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -160 }}>
        <div style={{ position: "relative" }}>
          <CardFromShot width={440} style={{ transform: `scale(${card}) rotate(-3deg)` }} />
          <div
            style={{
              position: "absolute",
              right: -170,
              top: -70,
              fontFamily,
              fontWeight: 900,
              fontSize: 300,
              color: PINK,
              transform: `scale(${q}) rotate(${wobble}deg)`,
              WebkitTextStroke: "16px #fff",
              paintOrder: "stroke fill",
            }}
          >
            ？
          </div>
          <div
            style={{
              position: "absolute",
              left: -110,
              bottom: 40,
              transform: `scale(${tag}) rotate(-8deg)`,
              fontFamily,
              fontWeight: 900,
              fontSize: 64,
              color: "#fff",
              background: `linear-gradient(135deg, ${PINK}, ${LAVENDER})`,
              padding: "14px 34px",
              borderRadius: 999,
              boxShadow: "0 14px 34px rgba(255,95,162,0.45)",
            }}
          >
            ¥ ？？？
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  const reveal = useReveal(6, 52);
  const glow = frame > 52 ? Math.abs(Math.sin((frame - 52) / 6)) : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 73) }}>
      <PinkBg from="#ffe3f0" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ position: "relative", transform: `translateY(${(1 - pop) * 900}px)` }}>
          <ChartShot width={1000} reveal={reveal} glow={glow} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const RecScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 81) }}>
      <PinkBg from="#fff0f7" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ position: "relative", transform: `translateY(${(1 - pop) * 300}px)`, opacity: pop }}>
          <RecPhone from={2.8} rate={1.1} width={700} />
          <Callout at={30} style={{ right: -70, top: 260 }}>
            相場をチェック ✓
          </Callout>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ♡ すきに追加 → ♥ すき済み（サイトのボタンと同じ言葉）。マイリストの数が1になる
const MyListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const panel = usePop(0, 12);
  const TAP = 26;
  const done = frame >= TAP;
  const burst = done ? interpolate(frame - TAP, [0, 16], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const badge = usePop(TAP + 4, 7);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 73) }}>
      <PinkBg />
      <Hearts count={done ? 22 : 8} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230 }}>
        <Panel style={{ width: 860, padding: "44px 40px", display: "flex", gap: 36, alignItems: "center", transform: `scale(${panel})` }}>
          <CardFromShot width={300} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 48, fontWeight: 900 }}>オデットスワン</div>
            <div style={{ display: "inline-block", alignSelf: "flex-start", background: `linear-gradient(135deg, #ff9ad5, ${LAVENDER})`, color: "#fff", fontSize: 28, fontWeight: 900, padding: "4px 18px", borderRadius: 999 }}>
              パラレル ER
            </div>
            <div style={{ position: "relative", alignSelf: "flex-start" }}>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  padding: "16px 34px",
                  borderRadius: 999,
                  border: `5px solid ${PINK}`,
                  background: done ? PINK : "#fff",
                  color: done ? "#fff" : PINK_DARK,
                  transform: `scale(${done ? 1 + 0.15 * (1 - burst) : 1})`,
                }}
              >
                {done ? "♥ すき済み" : "♡ すきに追加"}
              </div>
              {done && burst < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 120,
                    height: 120,
                    marginLeft: -60,
                    marginTop: -60,
                    borderRadius: 999,
                    border: `8px solid ${PINK}`,
                    transform: `scale(${1 + burst * 2.4})`,
                    opacity: 1 - burst,
                  }}
                />
              ) : null}
            </div>
          </div>
        </Panel>
        <div style={{ marginTop: 60, fontFamily, fontWeight: 900, fontSize: 64, color: INK, display: "flex", alignItems: "center", gap: 18 }}>
          マイリスト
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 84,
              height: 84,
              borderRadius: 999,
              background: PINK,
              color: "#fff",
              transform: `scale(${done ? badge : 0})`,
            }}
          >
            1
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CmGamer: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <Bgm file="bgm-a.wav" />
    <Sequence durationInFrames={61}>
      <Hook />
    </Sequence>
    <Sequence from={59} durationInFrames={73}>
      <Question />
    </Sequence>
    <Sequence from={130} durationInFrames={73}>
      <ChartScene />
    </Sequence>
    <Sequence from={201} durationInFrames={81}>
      <RecScene />
    </Sequence>
    <Sequence from={280} durationInFrames={73}>
      <MyListScene />
    </Sequence>
    <Sequence from={351}>
      <EndSearch />
    </Sequence>
    <Narration lines={LINES_GM} bottom={480} />
  </AbsoluteFill>
);
