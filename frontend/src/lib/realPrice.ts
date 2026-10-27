// ER・PRカード(26枚)だけの実相場。Yahoo!フリマの販売中の出品を日次で
// 記録したもの（backend/app/jobs/track_prices.py）。
//
// アイカツ！アンコールは発売間もなく(2026-10-08〜)のため、記録が
// 溜まるまではグラフが1〜数点しかない。サンプルデータとは違い、
// 無いものを無理に埋めない（カドソバの「決められない出品はどちらにも
// 入れない」と同じ考え方）。

import { query } from "@/lib/db";

export type RealPricePoint = { date: string; price: number | null; askingCount: number };

export type RealSummary = {
  current: number | null;
  askingCount: number;
  change1: { amount: number | null; ratio: number | null };
  change7: { amount: number | null; ratio: number | null };
  change30: { amount: number | null; ratio: number | null };
};

export type RealListing = {
  id: number;
  title: string;
  price: number;
  url: string;
  firstSeenAt: string;
};

export async function getRealPriceSeries(cardPk: number, days = 90): Promise<RealPricePoint[]> {
  const rows = await query<{ date: string; average_asking_price: number | null; asking_count: number }>(
    `select date, average_asking_price, asking_count
       from daily_prices
      where card_pk = $1 and date >= current_date - $2::int
      order by date`,
    [cardPk, days],
  );
  return rows.map((r) => ({
    date: r.date,
    price: r.average_asking_price,
    askingCount: r.asking_count,
  }));
}

function changeSince(
  priced: { date: string; price: number }[],
  daysAgo: number,
): { amount: number | null; ratio: number | null } {
  if (priced.length === 0) return { amount: null, ratio: null };
  const latest = priced[priced.length - 1];
  const target = new Date(latest.date);
  target.setUTCDate(target.getUTCDate() - daysAgo);
  let past: { date: string; price: number } | null = null;
  for (let i = priced.length - 2; i >= 0; i--) {
    if (new Date(priced[i].date) <= target) {
      past = priced[i];
      break;
    }
  }
  if (!past) return { amount: null, ratio: null };
  const amount = latest.price - past.price;
  const ratio = past.price !== 0 ? (amount / past.price) * 100 : null;
  return { amount, ratio };
}

export async function getRealSummary(cardPk: number): Promise<RealSummary> {
  const series = await getRealPriceSeries(cardPk);
  const priced = series.filter((p): p is RealPricePoint & { price: number } => p.price !== null);
  const latest = series.at(-1) ?? null;
  return {
    current: latest?.price ?? null,
    askingCount: latest?.askingCount ?? 0,
    change1: changeSince(priced, 1),
    change7: changeSince(priced, 7),
    change30: changeSince(priced, 30),
  };
}

export type TrackedCardData = { summary: RealSummary; series: { date: string; price: number }[] };

/** ホームのランキング用。対象カードぶんの要約とグラフ用データをまとめて1回で引く（N+1回避）。 */
export async function getTrackedData(cardPks: number[]): Promise<Map<number, TrackedCardData>> {
  if (cardPks.length === 0) return new Map();
  const rows = await query<{
    card_pk: number;
    date: string;
    average_asking_price: number | null;
    asking_count: number;
  }>(
    `select card_pk, date, average_asking_price, asking_count
       from daily_prices
      where card_pk = any($1::bigint[])
      order by card_pk, date`,
    [cardPks],
  );

  const byCard = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byCard.get(r.card_pk) ?? [];
    list.push(r);
    byCard.set(r.card_pk, list);
  }

  const result = new Map<number, TrackedCardData>();
  for (const [cardPk, list] of byCard) {
    const series = list.map((r) => ({ date: r.date, price: r.average_asking_price }));
    const priced = series.filter((p): p is { date: string; price: number } => p.price !== null);
    const latest = list.at(-1)!;
    result.set(cardPk, {
      series: priced,
      summary: {
        current: latest.average_asking_price,
        askingCount: latest.asking_count,
        change1: changeSince(priced, 1),
        change7: changeSince(priced, 7),
        change30: changeSince(priced, 30),
      },
    });
  }
  return result;
}

/** 一覧・ランキング用。カードごとの最新の参考価格をまとめて1回で引く。 */
export async function getLatestPrices(): Promise<Map<number, number | null>> {
  const rows = await query<{ card_pk: number; average_asking_price: number | null }>(
    `select distinct on (card_pk) card_pk, average_asking_price
       from daily_prices
      order by card_pk, date desc`,
  );
  return new Map(rows.map((r) => [r.card_pk, r.average_asking_price]));
}

export async function getRealListings(cardPk: number, limit = 200): Promise<RealListing[]> {
  const rows = await query<{ id: number; title: string; price: number; url: string; first_seen_at: string }>(
    `select id, title, price, url, first_seen_at
       from sale_listings
      where card_pk = $1 and is_adopted is true and listing_status = 'open'
      order by first_seen_at desc
      limit $2`,
    [cardPk, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    url: r.url,
    firstSeenAt: r.first_seen_at,
  }));
}
