"""CM用のBGMを一から作る（サンプル音源を使わないので権利の心配がない）。

    python tools/make_bgm.py   → public/audio/bgm-a.wav, bgm-b.wav（各15秒、44.1kHz ステレオ）

A: キラキラ・明るい（128BPM、C→G→Am→F、ベルとプラック、4つ打ち）
B: ポップで弾む（120BPM、F→G→Em→Am、シンセのコード刻み、スキップするビート）
最後の1秒はフェードアウト。ナレーションが聞こえるよう、音量は控えめにしてある。
"""
import wave
import numpy as np

SR = 44100
DUR = 15.0
N = int(SR * DUR)


def note(n):  # MIDI番号 → 周波数
    return 440.0 * 2 ** ((n - 69) / 12)


def env(length, a=0.005, d=0.15, s=0.3, r=0.08):
    t = np.arange(length) / SR
    e = np.ones(length) * s
    ai = int(a * SR)
    di = int(d * SR)
    e[:ai] = np.linspace(0, 1, ai, endpoint=False) if ai else e[:ai]
    if di:
        e[ai:ai + di] = np.linspace(1, s, min(di, max(0, length - ai)), endpoint=False)[: len(e[ai:ai + di])]
    ri = int(r * SR)
    if ri and length > ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def add(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    j = min(N, i + len(sig))
    if i >= N:
        return
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += sig[: j - i] * gain * l
    buf[1, i:j] += sig[: j - i] * gain * r


def tone(freq, length_s, kind="sine", **ek):
    n = int(length_s * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    if kind == "sine":
        w = np.sin(ph)
    elif kind == "bell":  # FMベル
        w = np.sin(ph + 2.0 * np.exp(-t * 6) * np.sin(ph * 3.5))
    elif kind == "pluck":
        w = 0.6 * np.sign(np.sin(ph)) * np.exp(-t * 3) + 0.4 * np.sin(ph)
    elif kind == "saw":
        w = 2 * ((freq * t) % 1) - 1
    elif kind == "tri":
        w = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    else:
        w = np.sin(ph)
    return w * env(n, **ek)


def kick():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


def snare(rng):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    return (rng.uniform(-1, 1, n) * 0.7 + 0.3 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 22)


def hat(rng, open_=False):
    n = int((0.12 if open_ else 0.04) * SR)
    t = np.arange(n) / SR
    x = rng.uniform(-1, 1, n)
    x = np.diff(np.concatenate([[0], x]))  # 高い音だけ残す
    return x * np.exp(-t * (18 if open_ else 70))


def sparkle(rng, buf, t0):
    for k in range(6):
        add(buf, t0 + k * 0.035, tone(note(96 + rng.integers(0, 8)), 0.25, "bell", d=0.2, s=0.0, r=0.05), 0.05, rng.uniform(-0.8, 0.8))


def render(bpm, prog, melody, style, seed):
    rng = np.random.default_rng(seed)
    buf = np.zeros((2, N))
    beat = 60.0 / bpm
    bar = beat * 4
    n_bars = int(DUR / bar) + 1
    for b in range(n_bars):
        root = prog[b % len(prog)]
        t0 = b * bar
        chord = [root, root + (3 if root % 12 in (9, 4, 2) else 4), root + 7]
        # ベース
        for k in range(8):
            if style == "b" and k % 2 == 1 and rng.random() < 0.5:
                continue
            add(buf, t0 + k * beat / 2, tone(note(root - 24), beat / 2 * 0.9, "tri", d=0.1, s=0.6), 0.32)
        # コード
        if style == "a":
            for c in chord:
                add(buf, t0, tone(note(c + 12), bar, "sine", a=0.03, d=0.4, s=0.35, r=0.3), 0.07, -0.3)
                add(buf, t0, tone(note(c + 12) * 1.003, bar, "sine", a=0.03, d=0.4, s=0.35, r=0.3), 0.07, 0.3)
        else:
            for k in (0.5, 1.5, 2.5, 3.5):
                for c in chord:
                    add(buf, t0 + k * beat, tone(note(c + 12), beat * 0.35, "saw", d=0.12, s=0.0, r=0.03), 0.035, 0.2)
        # ドラム
        for k in range(4):
            if style == "a" or k in (0, 2) or (k == 3 and rng.random() < 0.6):
                add(buf, t0 + k * beat, kick(), 0.55)
            if k in (1, 3):
                add(buf, t0 + k * beat, snare(rng), 0.22, 0.1)
            for h in range(2):
                add(buf, t0 + k * beat + h * beat / 2, hat(rng, open_=(h == 1 and style == "a")), 0.10, -0.4)
        if b % 2 == 0:
            sparkle(rng, buf, t0)
    # メロディ（拍単位で [開始拍, 長さ拍, 音]）
    for st, ln, n_ in melody:
        kind = "bell" if style == "a" else "pluck"
        add(buf, st * beat, tone(note(n_), ln * beat, kind, d=0.25, s=0.25, r=0.06), 0.16, 0.15)
        add(buf, st * beat + beat * 0.75, tone(note(n_), ln * beat, kind, d=0.25, s=0.2, r=0.06), 0.04, -0.5)  # 残響ふう
    # フェードイン・アウトと音量
    fade = np.ones(N)
    fi = int(0.05 * SR)
    fo = int(1.2 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo)
    buf *= fade
    peak = np.max(np.abs(buf))
    buf = buf / peak * 0.6
    return buf


def save(path, buf):
    data = (np.clip(buf.T, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


C, G, A, F, E, D = 60, 67, 69, 65, 64, 62
mel_a = []
phrase = [(0, 1, 72), (1, 1, 76), (2, 1, 79), (3, 1, 76), (4, 0.5, 77), (4.5, 0.5, 76), (5, 1, 74), (6, 2, 79),
          (8, 1, 81), (9, 1, 79), (10, 1, 76), (11, 1, 72), (12, 1, 77), (13, 1, 76), (14, 2, 74)]
for rep in range(2):
    mel_a += [(s + rep * 16, l, n) for s, l, n in phrase]
mel_a += [(32, 4, 84)]
mel_b = []
phrase_b = [(0, 0.5, 77), (0.5, 0.5, 79), (1, 1, 81), (2.5, 0.5, 79), (3, 1, 77), (4, 0.5, 79), (4.5, 0.5, 81),
            (5, 1, 83), (6, 2, 79), (8, 0.5, 76), (8.5, 0.5, 79), (9, 1, 83), (10.5, 0.5, 81), (11, 1, 79),
            (12, 1, 81), (13, 1, 76), (14, 2, 77)]
for rep in range(2):
    mel_b += [(s + rep * 16, l, n) for s, l, n in phrase_b]
mel_b += [(32, 2, 84)]

if __name__ == "__main__":
    import os
    os.makedirs("public/audio", exist_ok=True)
    save("public/audio/bgm-a.wav", render(128, [C, G, A, F], mel_a, "a", 1))
    save("public/audio/bgm-b.wav", render(120, [F, G, E, A], mel_b, "b", 2))
    print("ok")
