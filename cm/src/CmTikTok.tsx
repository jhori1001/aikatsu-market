import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BigText, Bgm, INK, LAVENDER, Narration, PINK, PinkBg, fontFamily, usePop } from "./common";
import { EndSearch } from "./end";
import { LINES_TT } from "./lines";
import { Callout, CardFromShot, ChartShot, RecPhone, useReveal } from "./real";

// TikTok 版（15秒）。一番伝えたいのは「グラフで値動きが見られる」。画面は本物のサイトの写真と録画。
// 画面の下（説明文）と右（いいね等）は TikTok の表示に隠れるので、大事なものは 上 150〜下 1440px・左右 90px 内に置く。
// サイトの画面を大きく映す場面は、字幕を上に出す（lines.ts の top）。
//
// 0.0〜3.2秒  つかみ「上がってる？下がってる？」（オデットスワンの絵）
// 3.2〜6.2秒  価格ランキングの写真。グラフが描かれ、7日間 +2,640円 を指す
// 6.2〜11.5秒 サイトの録画（ランキングを横にスワイプ → 値上がり）
// 11.5〜15秒  検索

const fade = (frame: number, len: number) =>
  interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 冒頭「アイカツの相場を見るならココ！」（2026-11-11、ユーザー指示）。サイトのバナーを「ココ」と指す
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 10);
  const banner = usePop(6, 11);
  const here = usePop(22, 8);
  const bob = Math.sin(frame / 4) * 12;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 67) }}>
      <PinkBg />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 220 }}>
        <BigText size={124} color={INK} style={{ transform: `scale(${head})`, whiteSpace: "nowrap" }}>
          アイカツの相場を
        </BigText>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -120 }}>
        <Img
          src={staticFile("img/hero-banner.webp")}
          style={{ width: 960, borderRadius: 40, transform: `scale(${banner})`, boxShadow: "0 30px 70px rgba(255,95,162,0.35)" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1010 }}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 130, color: PINK, transform: `translateY(${bob}px) scale(${here})`, lineHeight: 1 }}>↑</div>
        <BigText size={150} style={{ transform: `scale(${here}) rotate(${(1 - here) * -8}deg)`, whiteSpace: "nowrap" }}>
          見るならココ！
        </BigText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3.2〜6.2秒（91フレーム）
const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  const reveal = useReveal(10, 62);
  const glow = frame > 62 ? Math.abs(Math.sin((frame - 62) / 6)) : 0;
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 91) }}>
      <PinkBg from="#ffe3f0" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ position: "relative", transform: `translateY(${(1 - pop) * 900}px)` }}>
          <ChartShot width={1000} reveal={reveal} glow={glow} />
          <Callout at={40} style={{ right: 20, top: 560 }}>
            7日間 ＋2,640円 ↗
          </Callout>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 6.2〜11.5秒（162フレーム）。録画の 2.8秒目から（ランキングのスワイプ → 9.3秒ごろ値上がり）。終わりは最後の画面で止める
const RecScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 13);
  return (
    <AbsoluteFill style={{ opacity: fade(frame, 162) }}>
      <PinkBg from="#fff0f7" to="#efe7ff" />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
        <div style={{ transform: `translateY(${(1 - pop) * 900}px)` }}>
          <RecPhone from={2.8} rate={1} width={700} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CmTikTok: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#fff0f7" }}>
    <Bgm file="bgm-a.wav" />
    <Sequence durationInFrames={67}>
      <Hook />
    </Sequence>
    <Sequence from={65} durationInFrames={91}>
      <ChartScene />
    </Sequence>
    <Sequence from={154} durationInFrames={162}>
      <RecScene />
    </Sequence>
    <Sequence from={314}>
      <EndSearch />
    </Sequence>
    <Narration lines={LINES_TT} bottom={480} />
  </AbsoluteFill>
);
