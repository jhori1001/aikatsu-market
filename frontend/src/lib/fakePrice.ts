/**
 * 仮のカード価格データ。
 *
 * アイカツ！アンコールは相場の自動収集をまだ行っていない（図鑑のみ）。
 * カドソバと同じ見た目（価格・グラフ・ランキング）を仮の状態として作るため、
 * official_code から決定的に（＝毎回同じ値になるように）生成した数字を使う。
 *
 * 実在の取引価格ではない。画面には必ず「サンプルデータ」と明示すること
 * （カード売買の判断材料として使われうる数字を、本物の相場のように見せない）。
 */

export type FakePricePoint = { date: string; price: number };

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// レアリティごとの価格帯（円）。それっぽい分布にするための目安でしかない。
const RARITY_RANGE: Record<string, [number, number]> = {
  N: [300, 900],
  R: [800, 2800],
  ER: [2500, 6500],
  PR: [4000, 13000],
};

const DAYS = 90;

/** 90日ぶんの日次価格。official_code + レアリティ記号から決定的に作る。 */
export function fakePriceSeries(code: string, suffix: string | null): FakePricePoint[] {
  const rng = mulberry32(hashSeed(code));
  const [lo, hi] = RARITY_RANGE[suffix ?? "N"] ?? RARITY_RANGE.N;
  let price = lo + rng() * (hi - lo);

  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));

  const points: FakePricePoint[] = [];
  for (let i = 0; i < DAYS; i++) {
    const drift = (rng() - 0.48) * price * 0.035;
    price = Math.min(hi * 1.6, Math.max(lo * 0.5, price + drift));
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    points.push({ date: d.toISOString().slice(0, 10), price: Math.round(price / 10) * 10 });
  }
  return points;
}

export type FakeChange = { amount: number | null; ratio: number | null };

export type FakeSummary = {
  current: number | null;
  change7: FakeChange;
  change30: FakeChange;
};

function changeOver(points: FakePricePoint[], days: number): FakeChange {
  const current = points.at(-1)?.price ?? null;
  const past = points.at(-1 - days)?.price;
  if (current === null || past === undefined) return { amount: null, ratio: null };
  const amount = current - past;
  const ratio = past !== 0 ? (amount / past) * 100 : null;
  return { amount, ratio };
}

export function fakeSummary(points: FakePricePoint[]): FakeSummary {
  return {
    current: points.at(-1)?.price ?? null,
    change7: changeOver(points, 7),
    change30: changeOver(points, 30),
  };
}
