# カドソバ（アイカツ）の15秒CM

Remotion で作る縦型（1080×1920、30fps、15秒）のCMが2本。

| 版 | 中身 | 声（予定） | BGM |
|---|---|---|---|
| A（`CmA`） | キラキラ・かわいい。いまいくら？→相場が毎日わかる（値段とグラフ）→パラレルのランキング→検索 | VOICEVOX 四国めたん（あまあま） | bgm-a（128BPM） |
| B（`CmB`） | 売る前に・買う前に。→通常版とパラレル版の値段の差→グラフで値動き→検索 | VOICEVOX 春日部つむぎ | bgm-b（120BPM） |

## 作り方

```
npm install
tools/setup.sh                    # フォントを落とし、BGM を作る（tools/make_bgm.py、一から合成）
npx remotion render src/index.ts CmA out/cm-a.mp4
npx remotion render src/index.ts CmB out/cm-b.mp4
```

- 台本と出すタイミングは `src/lines.ts`。字幕も同じ文を出す。
- ナレーションの音は `public/audio/narr-a-1.wav` … に置き、`src/narration.json` の `available` を true にする。
  そのとき BGM は少し下げ、最後の画面にクレジット（「VOICEVOX:四国めたん」など）が出る。
- 値段は 2026-11-04 の実際の相場（販売中の出品の平均）。「実売」とは書かない。
- 画像はサイトのバナー（`public/img/`）。フォントは Zen Maru Gothic（SIL Open Font License）。
