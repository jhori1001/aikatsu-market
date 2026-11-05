# カドソバ（アイカツ）の15秒CM

Remotion で作る縦型（1080×1920、30fps、15秒）のCMが2本。声は2本とも VOICEVOX 春日部つむぎ。
一番伝えたいのは「グラフで値動きが見られる」。サイトのカード詳細ページ（価格推移のグラフ）をスマホの枠に入れて一番長く見せる。

| 版 | 流れ | BGM |
|---|---|---|
| TikTok（`CmTikTok`） | 上がってる？下がってる？→ グラフで値動き → 毎日自動で記録 → パラレルとショップ価格 → 検索 | bgm-a（128BPM） |
| YouTube ショート（`CmShorts`） | 売りどき、わかる？→ 相場の流れがまるわかり → ♡ すきに追加でマイリスト → パラレルの高額ランキング → 検索 | bgm-b（120BPM） |

TikTok もショートも、画面の下（説明文）と右（いいね等）がアプリの表示で隠れるので、大事なものは上 150〜下 1440px に置き、
字幕は下から 480px に出す。

## 作り方

```
npm install
tools/setup.sh                    # フォントを落とし、BGM を作る（tools/make_bgm.py、一から合成）
npx remotion render src/index.ts CmTikTok out/cm-tiktok.mp4
npx remotion render src/index.ts CmShorts out/cm-shorts.mp4
```

- 台本と出すタイミングは `src/lines.ts`。字幕も同じ文を出す。
- ナレーションは VOICEVOX で作って `public/audio/narr-*.wav` に入れてある（リポジトリに同梱、`src/narration.json` は `available: true`）。
  BGM は少し下げ、最後の画面にクレジット（「VOICEVOX:春日部つむぎ」）が出る。
  台本を変えたら `VV=<voicevox_core の場所> python tools/make_narration.py` で作り直す
  （春日部つむぎ style 8。話速 1.12・抑揚 1.25。間は詰めるが早口にはしない）。
- 配る版は音量をそろえる: `ffmpeg -i out/cm-tiktok.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5 -c:a aac -b:a 192k cm-tiktok.mp4`
- 値段は 2026-11-04 の実際の相場（販売中の出品の平均）。「実売」とは書かない。
- 画像はサイトのバナー（`public/img/`）。サイトの画面は `src/site.tsx` で組み直している（見出しの言葉・色はサイトと同じ）。フォントは Zen Maru Gothic（SIL Open Font License）。
