import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { BigText, Bgm, INK, Narration, PinkBg, usePop } from "./common";
import { EndSearch } from "./end";
import { LINES_YT } from "./lines";
import { Callout, ChartShot, RecPhone, useReveal } from "./real";

// YouTube ショート版（15秒）。TikTok 版と同じく「グラフで値動き」を真ん中に置き、切り口を変える。
// 画面は本物のサイトの写真と録画。ショートも下（タイトル・チャンネル名）と右（ボタン）が隠れるので、TikTok 版と同じ範囲に収める。
//
// 0.0〜3.0秒  つかみ「売りどき、わかる？」（トップページの録画）
// 3.0〜6.0秒  価格ランキングの写真。グラフが描かれる
// 6.0〜8.9秒  録画: 価格ランキングを横にスワイプ
// 8.9〜12.0秒 録画: 値上がり（ゆっくり → 最後の画面で止める）
// 12.0〜15秒  検索

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 10);
  const q = usePop(18, 8);
  const phone = usePop(4, 13);
  const shake = frame > 18 && frame < 36 ? Math.sin(frame * 1.6) * 5 : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 62) }}>
      <PinkBg />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 520 }}>
        <div style={{ transform: `translateY(${(1 - phone) * 900}px)` }}>
          <RecPhone from={0} rate={1} width={600} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 }}>
        {/* 冒頭「アイカツの相場を見るならココ！」（2026-11-11、ユーザー指示）。下のスマホ（サイトの録画）を「ココ」と指す */}
        <BigText size={104} color={INK} style={{ transform: `scale(${head})`, whiteSpace: "nowrap" }}>
          アイカツの相場を
        </BigText>
        <BigText size={124} style={{ transform: `scale(${q}) rotate(${shake}deg)`, whiteSpace: "nowrap", marginTop: 6 }}>
          見るならココ！<span style={{ display: "inline-block", transform: `translateY(${Math.sin(frame / 4) * 10}px)` }}>↓</span>
        </BigText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3.0〜6.0秒（90フレーム）
const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  const reveal = useReveal(8, 60);
  const glow = frame > 60 ? Math.abs(Math.sin((frame - 60) / 6)) : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 90) }}>
      <PinkBg from="#f4ecff" to="#ffe3f0" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ position: "relative", transform: `translateY(${(1 - pop) * 900}px)` }}>
          <ChartShot width={1000} reveal={reveal} glow={glow} />
          <Callout at={34} style={{ right: 20, top: 560 }}>
            7日間 ＋2,640円 ↗
          </Callout>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 録画を流す場面（字幕は上）
const RecScene: React.FC<{ len: number; from: number; rate: number; children?: React.ReactNode }> = ({ len, from, rate, children }) => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, len) }}>
      <PinkBg from="#fff0f7" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ position: "relative", transform: `translateY(${(1 - pop) * 300}px)`, opacity: pop }}>
          <RecPhone from={from} rate={rate} width={700} />
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CmShorts: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <Bgm file="bgm-b.wav" />
    <Sequence durationInFrames={62}>
      <Hook />
    </Sequence>
    <Sequence from={60} durationInFrames={90}>
      <ChartScene />
    </Sequence>
    <Sequence from={148} durationInFrames={92}>
      <RecScene len={92} from={2.8} rate={1.05} />
    </Sequence>
    <Sequence from={238} durationInFrames={94}>
      <RecScene len={94} from={6.0} rate={0.5}>
        <Callout at={40} style={{ left: -60, top: 700 }}>
          値上がり ＋8.0% ↗
        </Callout>
      </RecScene>
    </Sequence>
    <Sequence from={330}>
      <EndSearch />
    </Sequence>
    <Narration lines={LINES_YT} bottom={480} />
  </AbsoluteFill>
);
