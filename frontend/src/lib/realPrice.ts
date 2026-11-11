// ER・PRカード(26枚)だけの実相場。Yahoo!フリマの販売中の出品を日次で
// 記録したもの（backend/app/jobs/track_prices.py）。
//
// アイカツ！アンコールは発売間もなく(2026-10-08〜)のため、記録が
// 溜まるまではグラフが1〜数点しかない。サンプルデータとは違い、
// 無いものを無理に埋めない（カドソバの「決められない出品はどちらにも
// 入れない」と同じ考え方）。

import { query } from "@/lib/db";

export type RealPricePoint = { date: string; price: number | null; askingCount: number };

/**
 * 最新の日の出品が3件未満で平均が出ない日があっても、この日数以内に平均が出た日があれば、
 * その値を「○日時点」として出し続ける（2026-11-11、ユーザー指摘「販売中なのにショップの価格が出てる」。
 * オデットスワン パラレルが 11/10 に2件・11/11 に1件になり、相場もグラフも消えて店の値段に切り替わっていた）。
 * それより古い値は出さない（古い相場を今の相場のように見せない）。
 */
export const STALE_DAYS = 7;

export type RealSummary = {
  current: number | null;
  /** current がどの日の平均か */
  asOf: string | null;
  /** 最新の日の平均ではない（最新の日は出品が3件未満だった） */
  stale: boolean;
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
  lastSeenAt: string;
  /** 売れた日時（商品ページの更新日時）。売切のときだけ */
  soldAt: string | null;
  /** open（販売中）/ sold（売却済み）/ withdrawn（掲載終了）。resolve_listings が商品ページで確かめる */
  listingStatus: string;
  /** Yahoo!フリマの状態コード（new / used10 …）。古い記録には無い */
  itemCondition: string | null;
  /** mint（美品）/ damaged（傷あり）/ unknown */
  conditionGrade: string | null;
};

export async function getRealPriceSeries(cardPk: number, days = 90): Promise<RealPricePoint[]> {
  const rows = await query<{ date: string; average_asking_price: number | null; asking_count: number }>(
    `select date, average_asking_price, asking_count
       from daily_prices
      where card_pk = $1 and condition_grade = 'all' and date >= current_date - $2::int
      order by date`,
    [cardPk, days],
  );
  return rows.map((r) => ({
    date: r.date,
    price: r.average_asking_price,
    askingCount: r.asking_count,
  }));
}

/** 最新の日から STALE_DAYS 日以内で、いちばん新しく平均が出た日。無ければ null */
function recentPriced(
  priced: { date: string; price: number }[],
  latestDate: string | null,
): { date: string; price: number } | null {
  const last = priced.at(-1);
  if (!last || !latestDate) return null;
  const gap = (new Date(latestDate).getTime() - new Date(last.date).getTime()) / 86400000;
  return gap <= STALE_DAYS ? last : null;
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
  const shown = recentPriced(priced, latest?.date ?? null);
  return {
    current: shown?.price ?? null,
    asOf: shown?.date ?? null,
    stale: shown !== null && shown.date !== latest?.date,
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
      where card_pk = any($1::bigint[]) and condition_grade = 'all'
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
    const shown = recentPriced(priced, latest.date);
    result.set(cardPk, {
      series: priced,
      summary: {
        current: shown?.price ?? null,
        asOf: shown?.date ?? null,
        stale: shown !== null && shown.date !== latest.date,
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
    // 最新の日に平均が無くても、STALE_DAYS 日以内に出た平均を使う（詳細ページと同じ）
    `select distinct on (card_pk) card_pk, average_asking_price
       from daily_prices
      where average_asking_price is not null and condition_grade = 'all'
        and date >= (select max(date) from daily_prices) - ${STALE_DAYS}
      order by card_pk, date desc`,
  );
  return new Map(rows.map((r) => [r.card_pk, r.average_asking_price]));
}

export async function getRealListings(cardPk: number, limit = 200): Promise<RealListing[]> {
  const rows = await query<{
    id: number;
    title: string;
    price: number;
    url: string;
    first_seen_at: string;
    last_seen_at: string;
    sold_at: string | null;
    listing_status: string;
    item_condition: string | null;
    condition_grade: string | null;
  }>(
    `select id, title, price, url, first_seen_at, last_seen_at, sold_at, listing_status,
            item_condition, condition_grade
       from sale_listings
      where card_pk = $1 and is_adopted is true
      order by coalesce(sold_at, last_seen_at) desc
      limit $2`,
    [cardPk, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    url: r.url,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    soldAt: r.sold_at,
    listingStatus: r.listing_status,
    itemCondition: r.item_condition,
    conditionGrade: r.condition_grade,
  }));
}
