import React from "react";
import { Composition } from "remotion";
import { CmShorts } from "./CmShorts";
import { CmTikTok } from "./CmTikTok";

// 15秒（30fps × 450フレーム）、縦型 1080×1920。TikTok 用と YouTube ショート用の2本
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CmTikTok" component={CmTikTok} durationInFrames={450} fps={30} width={1080} height={1920} />
    <Composition id="CmShorts" component={CmShorts} durationInFrames={450} fps={30} width={1080} height={1920} />
  </>
);
