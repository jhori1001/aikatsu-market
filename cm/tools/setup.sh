#!/usr/bin/env bash
# CM を作る前の準備: フォント（Zen Maru Gothic、OFL）を落とし、BGM を作る。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/fonts public/audio
for w in Bold Black; do
  [ -f "public/fonts/ZenMaruGothic-$w.ttf" ] || curl -sSL -o "public/fonts/ZenMaruGothic-$w.ttf" \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/ZenMaruGothic-$w.ttf"
done
python3 tools/make_bgm.py   # numpy が要る
