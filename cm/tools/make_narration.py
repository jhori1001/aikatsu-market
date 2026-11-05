"""CMのナレーションを VOICEVOX で作る（public/audio/narr-a-1.wav …）。

    VV=<VOICEVOX一式のフォルダ> python tools/make_narration.py

VOICEVOX CORE 0.16.4 の Python 版・voicevox_onnxruntime 1.17.3・open_jtalk の辞書・0.vvm を
VV のフォルダに置いて使う（GitHub の各リリースから落とす。cm/README.md を参照）。
A版: 四国めたん（あまあま、スタイルID 0）、B版: 春日部つむぎ（ノーマル、8）。
利用規約により、動画には「VOICEVOX:四国めたん」「VOICEVOX:春日部つむぎ」とクレジットを出す。
"""
import json
import os
import re
import sys
import wave

from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

VV = os.environ["VV"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "audio")

# src/lines.ts と同じ台本（読み方を整えたもの。字幕は lines.ts の文を出す）
SCRIPT = {
    "a": (0, [
        "アイカツ！アンコールのカード、いまいくら？",
        "フリマの相場が、毎日わかるよ！",
        "パラレルも、ランキングでチェック！",
        "カドソバで、検索してね！",
    ]),
    "b": (8, [
        "そのカード、売る前に。買う前に。",
        "アイカツの相場、チェックしよっ！",
        "値動きも、グラフでひと目でわかる！",
        "カドソバ、アイカツで、検索！",
    ]),
}

ort = Onnxruntime.load_once(filename=os.path.join(VV, "voicevox_onnxruntime-linux-x64-1.17.3", "lib", "libvoicevox_onnxruntime.so.1.17.3"))
syn = Synthesizer(ort, OpenJtalk(os.path.join(VV, "open_jtalk_dic_utf_8-1.11")))
with VoiceModelFile.open(os.path.join(VV, "0.vvm")) as m:
    syn.load_voice_model(m)

os.makedirs(OUT, exist_ok=True)
lengths = {}
for ver, (style, lines) in SCRIPT.items():
    for i, text in enumerate(lines, 1):
        q = syn.create_audio_query(text, style)
        q.speed_scale = 1.12   # 15秒に収まるよう少し速く
        q.intonation_scale = 1.25  # かわいく、抑揚を少し大きく
        q.pitch_scale = 0.02
        q.pre_phoneme_length = 0.05
        q.post_phoneme_length = 0.1
        wav = syn.synthesis(q, style)
        path = os.path.join(OUT, f"narr-{ver}-{i}.wav")
        with open(path, "wb") as f:
            f.write(wav)
        with wave.open(path) as w:
            lengths[f"narr-{ver}-{i}.wav"] = round(w.getnframes() / w.getframerate(), 2)
print(json.dumps(lengths, ensure_ascii=False, indent=1))
