import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BigText, Bgm, CardImg, INK, LAVENDER, Narration, PINK, Panel, Phone, PinkBg, Sparkles, fontFamily, usePop, yen } from "./common";
import { CREDIT, LINES_TT } from "./lines";
import { CAMI_P, SiteDetail, TypingSearch } from "./site";

// TikTok 版（15秒）。一番伝えたいのは「グラフで値動きが見られる」。
// 画面の下（説明文・音楽名）と右（いいね等のボタン）は TikTok の表示に隠れるので、
// 大事なものは 上 150〜下 1440px・左右 90px 内に置き、字幕は下から 480px に出す。
//
// 0.0〜3.2秒  つかみ「上がってる？下がってる？」
// 3.2〜8.7秒  サイトのカード詳細ページ。グラフが描かれ、毎日の記録が増えていく（一番長く見せる）
// 8.7〜11.5秒 パラレルと通常版の値段、ショップ価格も
// 11.5〜15秒  検索

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const card = usePop(0, 12);
  const up = usePop(4, 8);
  const down = usePop(40, 8);
  const bob = Math.sin(frame / 5) * 14;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 97) }}>
      <PinkBg />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 180 }}>
        <BigText size={140} style={{ transform: `scale(${up})` }}>
          上がってる？
        </BigText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -230 }}>
        <div style={{ position: "relative" }}>
          <CardImg file="card-main.webp" width={400} style={{ transform: `scale(${card}) rotate(${-4 + Math.sin(frame / 12) * 2}deg)` }} />
          <div style={{ position: "absolute", left: -150, top: 120 + bob, fontSize: 170, fontWeight: 900, color: PINK, fontFamily, transform: `scale(${up})`, textShadow: "0 8px 20px rgba(255,95,162,0.4)" }}>↑</div>
          <div style={{ position: "absolute", right: -150, top: 300 - bob, fontSize: 170, fontWeight: 900, color: LAVENDER, fontFamily, transform: `scale(${down})`, textShadow: "0 8px 20px rgba(167,139,250,0.4)" }}>↓</div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1040 }}>
        <BigText size={140} color={LAVENDER} style={{ transform: `scale(${down})` }}>
          下がってる？
        </BigText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3.2〜8.7秒（165フレーム）。前半は「グラフでひと目で」、後半は「毎日自動で記録」
const GraphScene: React.FC = () => {
  const frame = useCurrentFrame();
  const phone = usePop(0, 13);
  const t1 = usePop(2, 10);
  const t2 = usePop(88, 10);
  const prog = interpolate(frame, [30, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const count = interpolate(frame, [6, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 値段を見せたら、すぐグラフに寄る（字幕に隠れないよう、グラフを画面の真ん中に）
  const zoom = interpolate(frame, [18, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = frame > 100 ? Math.abs(Math.sin((frame - 100) / 7)) : 0;
  const days = ["10/27", "10/28", "10/29", "10/30", "10/31", "11/1", "11/2", "11/3", "11/4"];
  const day = days[Math.min(days.length - 1, Math.max(0, Math.floor((frame - 96) / 6)))];
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 165) }}>
      <PinkBg from="#ffe3f0" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 470 }}>
        <div style={{ transform: `translateY(${(1 - phone) * 900 - zoom * 270}px) scale(${1 + zoom * 0.38})`, transformOrigin: "50% 58%" }}>
          <Phone width={640}>
            <SiteDetail card="card-main.webp" name={<>オーロラキス<br />キャミソール</>} rarity="PR★" points={CAMI_P} progress={prog} count={count} glow={glow} />
          </Phone>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 }}>
        <AbsoluteFill style={{ height: 470, background: "linear-gradient(180deg, rgba(255,240,247,0.96) 70%, rgba(255,240,247,0))" }} />
        {frame < 88 ? (
          <BigText size={104} style={{ transform: `scale(${t1})` }}>
            値動きが<span style={{ color: LAVENDER }}>グラフ</span>で
            <br />
            ひと目でわかる！
          </BigText>
        ) : (
          <BigText size={110} style={{ transform: `scale(${t2})` }}>
            毎日<span style={{ color: LAVENDER }}>自動</span>で記録
          </BigText>
        )}
      </AbsoluteFill>
      {frame >= 96 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
          <div
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: 52,
              color: "#fff",
              background: `linear-gradient(90deg, ${PINK}, ${LAVENDER})`,
              padding: "14px 40px",
              borderRadius: 999,
              boxShadow: "0 12px 30px rgba(255,95,162,0.35)",
            }}
          >
            📅 {day} 更新
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const PriceTag: React.FC<{ label: string; price: number; color: string; at: number; badge: string }> = ({ label, price, color, at, badge }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 10);
  const n = interpolate(frame, [at, at + 22], [0, price], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Panel style={{ width: 420, padding: "30px 24px", textAlign: "center", transform: `scale(${p})`, opacity: p }}>
      <div style={{ display: "inline-block", background: color, color: "#fff", fontSize: 30, fontWeight: 900, padding: "6px 24px", borderRadius: 999 }}>{badge}</div>
      <div style={{ fontSize: 32, fontWeight: 900, marginTop: 14 }}>{label}</div>
      <div style={{ fontSize: 70, fontWeight: 900, color, marginTop: 6 }}>{yen(n)}</div>
    </Panel>
  );
};

// 8.7〜11.5秒（83フレーム）
const CompareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 9);
  const vs = usePop(14, 8);
  const shop = usePop(38, 10);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 83) }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(135deg, #ffffff 0 60px, #fff0f7 60px 120px)" }} />
      <Sparkles count={20} color="#ffc7e3" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, gap: 40, flexDirection: "column" }}>
        <BigText size={104} style={{ transform: `scale(${head})` }}>
          <span style={{ color: LAVENDER }}>パラレル</span>も
          <br />
          ショップ価格も
        </BigText>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 40, color: INK }}>オーロラキスキャミソール</div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <PriceTag label="通常版" price={2900} color={PINK} at={6} badge="PR" />
          <div style={{ fontFamily, fontWeight: 900, fontSize: 56, color: LAVENDER, transform: `scale(${vs})` }}>vs</div>
          <PriceTag label="パラレル版" price={12430} color={LAVENDER} at={16} badge="PR★" />
        </div>
        <Panel style={{ width: 880, padding: "26px 34px", display: "flex", alignItems: "center", gap: 24, transform: `scale(${shop})`, opacity: shop }}>
          <div style={{ fontSize: 50 }}>🏪</div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>ショップ参考価格も、いっしょに</div>
            <div style={{ fontSize: 24, color: "#8a6b7c", fontWeight: 700, marginTop: 4 }}>フリマの相場とならべて比べられる</div>
          </div>
        </Panel>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 24, color: "#8a6b7c" }}>※ 2026年11月4日時点・Yahoo!フリマで販売中の出品の平均</div>
      </AbsoluteFill>
    </AbsoluteFill>
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

export const CmTikTok: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <Bgm file="bgm-a.wav" />
    <Sequence durationInFrames={97}>
      <Hook />
    </Sequence>
    <Sequence from={95} durationInFrames={165}>
      <GraphScene />
    </Sequence>
    <Sequence from={258} durationInFrames={83}>
      <CompareScene />
    </Sequence>
    <Sequence from={339}>
      <EndSearch />
    </Sequence>
    <Narration lines={LINES_TT} bottom={480} />
  </AbsoluteFill>
);

