// ナレーションの台本と、出すタイミング（秒）。テロップ（字幕）も同じ文を出す。
//
// 声は VOICEVOX（A: 四国めたん あまあま、B: 春日部つむぎ）で作る想定。音声ファイルは
// public/audio/narr-a-1.wav … に置き、narration.json の available を true にすると鳴る
// （まだ無いときは字幕だけで動く）。クレジット「VOICEVOX:四国めたん」等を最後に出す。
//
// 値段は 2026-11-04 の実際の相場（販売中の出品の平均）。「実売」とは書かない。

export type Line = { at: number; text: string; file: string };

export const LINES_A: Line[] = [
  { at: 0.3, text: "アイカツ！アンコールのカード、いまいくら？", file: "narr-a-1.wav" },
  { at: 3.7, text: "フリマの相場が、毎日わかるよ！", file: "narr-a-2.wav" },
  { at: 7.5, text: "パラレルも、ランキングでチェック！", file: "narr-a-3.wav" },
  { at: 11.3, text: "カドソバで、検索してね♪", file: "narr-a-4.wav" },
];

export const LINES_B: Line[] = [
  { at: 0.3, text: "そのカード、売る前に。買う前に。", file: "narr-b-1.wav" },
  { at: 3.6, text: "アイカツの相場、チェックしよっ！", file: "narr-b-2.wav" },
  { at: 7.4, text: "値動きも、グラフでひと目でわかる！", file: "narr-b-3.wav" },
  { at: 11.3, text: "カドソバ アイカツで、検索！", file: "narr-b-4.wav" },
];

export const CREDIT_A = "VOICEVOX:四国めたん";
export const CREDIT_B = "VOICEVOX:春日部つむぎ";
