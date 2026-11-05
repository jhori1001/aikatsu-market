import React from "react";
import { Composition } from "remotion";
import { CmA } from "./CmA";
import { CmB } from "./CmB";

// 15秒（30fps × 450フレーム）、縦型 1080×1920（SNS のショート動画向け）
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CmA" component={CmA} durationInFrames={450} fps={30} width={1080} height={1920} />
    <Composition id="CmB" component={CmB} durationInFrames={450} fps={30} width={1080} height={1920} />
  </>
);
