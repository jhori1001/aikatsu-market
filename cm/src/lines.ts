// ナレーションの台本と、出すタイミング（秒）。テロップ（字幕）も同じ文を出す。
// 声は2本とも VOICEVOX 春日部つむぎ（tools/make_narration.py で作る）。最後にクレジットを出す。
// 間は詰めるが、早口にはしない（話速 1.12、文と文のあいだ 0.2秒）。
// 画面はユーザーが撮ったサイトの写真・録画（2026-11-05、public/shots/、リポジトリには入れない）。「実売」とは書かない。

export type Line = { at: number; text: string; file: string; top?: boolean };

// TikTok 版: 「上がってる？下がってる？」で掴んで、グラフ（サイトの画面の写真）→ 画面の録画 → 検索
export const LINES_TT: Line[] = [
  { at: 0.15, text: "アイカツの相場を見るならココ！", file: "narr-tt-1.wav" },
  { at: 2.25, text: "カドソバなら、値動きがグラフでひと目でわかる！", file: "narr-tt-2.wav", top: true },
  { at: 5.2, text: "人気カードの相場を、どんどんチェック！", file: "narr-tt-3.wav", top: true },
  { at: 7.9, text: "値上がりランキングも、毎日更新！", file: "narr-tt-4.wav", top: true },
  { at: 10.55, text: "カドソバ アイカツで、検索してね！", file: "narr-tt-5.wav" },
];

// YouTube ショート版: 「売りどき」で掴んで（トップページの録画）、グラフ → ランキングの録画 → 値上がり → 検索
export const LINES_YT: Line[] = [
  { at: 0.15, text: "アイカツの相場を見るならココ！", file: "narr-yt-1.wav" },
  { at: 2.1, text: "値動きのグラフで、相場の流れがまるわかり！", file: "narr-yt-2.wav", top: true },
  { at: 5.05, text: "パラレルの価格ランキングも、スワイプでチェック！", file: "narr-yt-3.wav", top: true },
  { at: 8.05, text: "値上がりしてるカードも、毎日更新でわかるよ。", file: "narr-yt-4.wav", top: true },
  { at: 11.15, text: "カドソバ アイカツで、検索！", file: "narr-yt-5.wav" },
];

export const CREDIT = "VOICEVOX:春日部つむぎ";
