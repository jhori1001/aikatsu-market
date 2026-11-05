# カドソバ（アイカツ）の15秒CM

Remotion で作る縦型（1080×1920、30fps、15秒）のCMが2本。声は2本とも VOICEVOX 春日部つむぎ。
一番伝えたいのは「グラフで値動きが見られる」。画面はユーザーが撮った本物のサイトの写真と録画を使う。

| 版 | 流れ | BGM |
|---|---|---|
| TikTok（`CmTikTok`） | 上がってる？下がってる？→ 価格ランキングの写真でグラフが描かれる（7日間 +2,640円）→ 録画（ランキングをスワイプ → 値上がり）→ 検索 | bgm-a（128BPM） |
| YouTube ショート（`CmShorts`） | 売りどき、わかる？（トップの録画）→ グラフの写真 → 録画（パラレルの価格ランキング）→ 録画（値上がり ＋8.0%）→ 検索 | bgm-b（120BPM） |

TikTok もショートも、画面の下（説明文）と右（いいね等）がアプリの表示で隠れるので、大事なものは上 150〜下 1440px に置く。
サイトの画面を大きく映す場面は、グラフを隠さないよう字幕を上に出す（`src/lines.ts` の `top`）。

### サイトの写真・録画（リポジトリには入れない）

カード画像が写っているので `public/shots/` は `.gitignore` 済み。作り直すときは次の3つを置く:

- `public/shots/odette.jpg` … 価格ランキングのオデットスワンのスクリーンショット（1179×1770）
- `public/shots/site.mp4` … スマホの画面録画を 30fps の mp4 にしたもの（`ffmpeg -i 録画.mov -an -vf fps=30 -c:v libx264 -crf 18 -pix_fmt yuv420p site.mp4`）
- `public/shots/site-last.jpg` … 録画の最後の1枚（`ffmpeg -sseof -0.1 -i site.mp4 -frames:v 1 site-last.jpg`）

写真の中のグラフの位置は `src/real.tsx` の `PLOT`・`LAST` に書いてある（別の写真にしたら直す）。

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
- 画像はサイトのバナー（`public/img/`）とサイトの写真・録画（`public/shots/`）。フォントは Zen Maru Gothic（SIL Open Font License）。
