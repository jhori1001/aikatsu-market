// ナレーションの台本と、出すタイミング（秒）。テロップ（字幕）も同じ文を出す。
// 声は2本とも VOICEVOX 春日部つむぎ（tools/make_narration.py で作る）。最後にクレジットを出す。
// 間は詰めるが、早口にはしない（話速 1.12、文と文のあいだ 0.2秒）。
// 値段は 2026-11-04 の実際の相場（販売中の出品の平均）。「実売」とは書かない。

export type Line = { at: number; text: string; file: string };

// TikTok 版: 「上がってる？下がってる？」で掴んで、グラフを一番長く見せる
export const LINES_TT: Line[] = [
  { at: 0.15, text: "そのカード、上がってる？下がってる？", file: "narr-tt-1.wav" },
  { at: 3.25, text: "カドソバなら、値動きがグラフでひと目でわかる！", file: "narr-tt-2.wav" },
  { at: 6.15, text: "フリマの相場を、毎日自動で記録。", file: "narr-tt-3.wav" },
  { at: 8.8, text: "パラレルもショップ価格も、まとめてチェック！", file: "narr-tt-4.wav" },
  { at: 11.55, text: "カドソバ アイカツで、検索してね！", file: "narr-tt-5.wav" },
];

// YouTube ショート版: 「売りどき」で掴んで、グラフ→マイリスト→ランキング
export const LINES_YT: Line[] = [
  { at: 0.15, text: "アイカツのカード、売りどき、わかる？", file: "narr-yt-1.wav" },
  { at: 3.1, text: "値動きのグラフで、相場の流れがまるわかり！", file: "narr-yt-2.wav" },
  { at: 6.05, text: "気になるカードは、マイリストに入れておけるよ。", file: "narr-yt-3.wav" },
  { at: 8.85, text: "相場は毎日更新。パラレルのランキングも！", file: "narr-yt-4.wav" },
  { at: 11.95, text: "カドソバ アイカツで、検索！", file: "narr-yt-5.wav" },
];

export const CREDIT = "VOICEVOX:春日部つむぎ";
