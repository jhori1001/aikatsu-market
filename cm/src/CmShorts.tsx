import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { BigText, Bgm, CardImg, INK, LAVENDER, Narration, PINK, PINK_DARK, Panel, Phone, PinkBg, Sparkles, fontFamily, usePop, yen } from "./common";
import { LINES_YT } from "./lines";
import { ODETTE_P, SiteDetail } from "./site";
import { EndSearch } from "./CmTikTok";

// YouTube ショート版（15秒）。TikTok 版と同じく「グラフで値動き」を一番長く見せ、
// 切り口を変えて「売りどき」→ グラフ → マイリスト → パラレルのランキング。
// ショートは下（タイトル・チャンネル名）と右（ボタン）が隠れるので、TikTok 版と同じ範囲に収める。

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = usePop(0, 12);
  const c2 = usePop(5, 12);
  const c3 = usePop(10, 12);
  const q = usePop(30, 8);
  const shake = frame > 30 && frame < 50 ? Math.sin(frame * 1.6) * 6 : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 92) }}>
      <PinkBg />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        <BigText size={96} color={INK}>
          アイカツのカード
        </BigText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -250 }}>
        <div style={{ position: "relative", width: 1000, height: 700 }}>
          <CardImg file="card-left.webp" width={340} style={{ position: "absolute", left: 60, top: 140, transform: `translateY(${(1 - c1) * 900}px) rotate(${-14 * c1}deg)` }} />
          <CardImg file="card-right.webp" width={340} style={{ position: "absolute", right: 60, top: 140, transform: `translateY(${(1 - c3) * 900}px) rotate(${14 * c3}deg)` }} />
          <CardImg file="card-main.webp" width={420} style={{ position: "absolute", left: 290, top: 40, transform: `translateY(${(1 - c2) * 900}px) rotate(${-2 * c2}deg)` }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1070 }}>
        <BigText size={98} style={{ transform: `scale(${q}) rotate(${shake}deg)`, whiteSpace: "nowrap" }}>
          売りどき、わかる？
        </BigText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3.0〜8.8秒（176フレーム）。前半はグラフ、後半は「♡ すきに追加」→ マイリストに入る
const PhoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const phone = usePop(0, 13);
  const t1 = usePop(2, 10);
  const t2 = usePop(92, 10);
  const prog = interpolate(frame, [26, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 前半はグラフに寄り（字幕に隠れないよう真ん中に）、マイリストの話で引いて「♡ すきに追加」を見せる
  const zoom = interpolate(frame, [14, 32, 88, 102], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const count = interpolate(frame, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const up = usePop(74, 8);
  const TAP = 112;
  const fav = frame >= TAP + 3;
  const pulse = frame >= TAP + 3 ? Math.max(0, 1 - (frame - TAP - 3) / 10) : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 176) }}>
      <PinkBg from="#f4ecff" to="#ffe3f0" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 470 }}>
        <div style={{ transform: `translateY(${(1 - phone) * 900 - zoom * 270}px) scale(${1 + zoom * 0.38})`, transformOrigin: "50% 58%" }}>
          <Phone width={640}>
            <SiteDetail
              card="card-left.webp"
              name="オデットスワン"
              rarity="ER★"
              points={ODETTE_P}
              progress={prog}
              count={count}
              color={LAVENDER}
              change={frame > 74 ? "7日で ＋7.3%" : undefined}
              fav={fav}
              tapAt={TAP}
              mylist={fav ? 1 : 0}
              mylistPulse={pulse}
            />
          </Phone>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 }}>
        <AbsoluteFill style={{ height: 470, background: "linear-gradient(180deg, rgba(248,240,255,0.96) 70%, rgba(248,240,255,0))" }} />
        {frame < 92 ? (
          <BigText size={104} color={PINK_DARK} style={{ transform: `scale(${t1})` }}>
            相場の流れが
            <br />
            <span style={{ color: LAVENDER }}>まるわかり！</span>
          </BigText>
        ) : (
          <BigText size={104} style={{ transform: `scale(${t2})` }}>
            気になるカードは
            <br />
            <span style={{ color: LAVENDER }}>マイリスト</span>へ
          </BigText>
        )}
      </AbsoluteFill>
      {frame > 74 && frame < 92 ? (
        <AbsoluteFill style={{ alignItems: "flex-end", paddingTop: 520, paddingRight: 130 }}>
          <div
            style={{
              transform: `scale(${up}) rotate(-6deg)`,
              fontFamily,
              fontWeight: 900,
              fontSize: 60,
              color: "#fff",
              background: `linear-gradient(135deg, ${PINK}, ${LAVENDER})`,
              padding: "16px 34px",
              borderRadius: 999,
              boxShadow: "0 14px 34px rgba(255,95,162,0.4)",
            }}
          >
            ↗ ＋7.3%
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const RANK = [
  { name: "オデットスワン", tag: "ER★", price: 35300 },
  { name: "オーロラキスリボン", tag: "PR★", price: 16240 },
  { name: "オーロラキスキャミソール", tag: "PR★", price: 12430 },
];

// 8.7〜11.9秒（95フレーム）
const RankScene: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 10);
  const badge = usePop(4, 8);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 95) }}>
      <AbsoluteFill style={{ background: "linear-gradient(160deg, #fff0f7 0%, #ffffff 55%, #efe7ff 100%)" }} />
      <Sparkles count={26} color="#ffc7e3" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 160, gap: 34, flexDirection: "column" }}>
        <div style={{ transform: `scale(${badge})`, fontFamily, fontWeight: 900, fontSize: 44, color: "#fff", background: PINK, padding: "10px 34px", borderRadius: 999 }}>
          相場は毎日更新
        </div>
        <BigText size={108} style={{ transform: `scale(${head})` }}>
          <span style={{ color: LAVENDER }}>パラレル</span>の
          <br />
          高額ランキング
        </BigText>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, width: 900 }}>
          {RANK.map((r, i) => {
            const p = interpolate(frame, [10 + i * 8, 26 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <Panel key={r.name} style={{ padding: "26px 34px", display: "flex", alignItems: "center", gap: 26, opacity: p, transform: `translateX(${(1 - p) * 700}px)` }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 999,
                    background: i === 0 ? "linear-gradient(135deg, #e8ad2c, #ffd76a)" : i === 1 ? "#d9dbe3" : "#f0c2a0",
                    color: INK,
                    fontSize: 54,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: r.name.length > 10 ? 32 : 38, fontWeight: 900, whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 24, color: "#fff", display: "inline-block", marginTop: 8, background: `linear-gradient(135deg, #ff9ad5, ${LAVENDER})`, padding: "4px 16px", borderRadius: 999, fontWeight: 900 }}>
                    パラレル {r.tag}
                  </div>
                </div>
                <div style={{ fontSize: 50, fontWeight: 900, color: PINK_DARK, whiteSpace: "nowrap" }}>{yen(r.price)}</div>
              </Panel>
            );
          })}
        </div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 24, color: "#8a6b7c" }}>※ 2026年11月4日時点・販売中の出品の平均</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CmShorts: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <Bgm file="bgm-b.wav" />
    <Sequence durationInFrames={92}>
      <Hook />
    </Sequence>
    <Sequence from={90} durationInFrames={176}>
      <PhoneScene />
    </Sequence>
    <Sequence from={262} durationInFrames={95}>
      <RankScene />
    </Sequence>
    <Sequence from={355}>
      <EndSearch />
    </Sequence>
    <Narration lines={LINES_YT} bottom={480} />
  </AbsoluteFill>
);

