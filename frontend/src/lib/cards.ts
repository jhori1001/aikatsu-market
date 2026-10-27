// アイカツ！アンコールのカード図鑑。
//
// いまのところ相場は出さない（一覧・画像だけの図鑑ページ）。

import { query } from "@/lib/db";

export type Card = {
  id: number;
  official_code: string;
  series_code: string | null;
  card_number: string | null;
  code_suffix: string | null;
  rarity: string | null;
  name: string | null;
  idol_name: string | null;
  is_parallel: boolean;
  has_front: boolean;
  has_back: boolean;
};

const CARD_COLUMNS = `
  c.id, c.official_code, c.series_code, c.card_number, c.code_suffix,
  c.rarity, c.name, c.idol_name, c.is_parallel,
  exists(select 1 from card_images i where i.card_pk = c.id and i.side = 'front') as has_front,
  exists(select 1 from card_images i where i.card_pk = c.id and i.side = 'back') as has_back
`;

export type CardListParams = {
  q?: string | null;
  series?: string | null;
  rarity?: string | null;
  idol?: string | null;
  page?: number;
  per_page?: number;
};

export async function getCards(
  params: CardListParams = {},
): Promise<{ items: Card[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(200, Math.max(1, params.per_page ?? 60));

  const where: string[] = ["c.is_active is true"];
  const values: unknown[] = [];
  const bind = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (params.q) {
    const p = bind(`%${params.q}%`);
    where.push(`(c.name ilike ${p} or c.official_code ilike ${p} or c.idol_name ilike ${p})`);
  }
  if (params.series) where.push(`c.series_code = ${bind(params.series)}`);
  if (params.rarity) where.push(`c.code_suffix = ${bind(params.rarity)}`);
  if (params.idol) where.push(`c.idol_name = ${bind(params.idol)}`);

  const whereSql = `where ${where.join(" and ")}`;

  const totalRows = await query<{ total: number }>(
    `select count(*)::int as total from cards c ${whereSql}`,
    values,
  );
  const total = totalRows[0]?.total ?? 0;

  const items = await query<Card>(
    `select ${CARD_COLUMNS}
       from cards c
      ${whereSql}
      order by c.series_code, (c.card_number)::int nulls last, c.official_code
      offset $${values.length + 1} limit $${values.length + 2}`,
    [...values, (page - 1) * perPage, perPage],
  );

  return { items, total };
}

export async function getCard(code: string): Promise<Card | null> {
  const rows = await query<Card>(
    `select ${CARD_COLUMNS} from cards c where c.official_code = $1 and c.is_active is true`,
    [code],
  );
  return rows[0] ?? null;
}

/** 一覧の絞り込み選択肢用。いまある弾のコードだけを返す */
export async function getSeriesList(): Promise<string[]> {
  const rows = await query<{ series_code: string }>(
    `select distinct series_code from cards
      where is_active is true and series_code is not null
      order by series_code`,
  );
  return rows.map((r) => r.series_code);
}

/** 一覧の絞り込み選択肢用。いまあるレアリティ記号だけを返す */
export async function getRarityList(): Promise<string[]> {
  const rows = await query<{ code_suffix: string }>(
    `select distinct code_suffix from cards
      where is_active is true and code_suffix is not null
      order by code_suffix`,
  );
  const order = ["PR", "ER", "R", "N"];
  return rows.map((r) => r.code_suffix).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** アイドルで探す用。登場回数の多い順（カードが多いアイドルほど見つけやすい位置に） */
export async function getIdolList(): Promise<{ idol_name: string; count: number }[]> {
  const rows = await query<{ idol_name: string; count: number }>(
    `select idol_name, count(*)::int as count from cards
      where is_active is true and idol_name is not null and idol_name <> ''
      group by idol_name
      order by count desc, idol_name`,
  );
  return rows;
}

/** 収録状況のサマリー。ホームの数字に使う */
export async function getCatalogSummary(): Promise<{
  total: number;
  seriesCount: number;
  idolCount: number;
}> {
  const rows = await query<{ total: number; series_count: number; idol_count: number }>(
    `select count(*)::int as total,
            count(distinct series_code)::int as series_count,
            count(distinct idol_name)::int as idol_count
       from cards where is_active is true`,
  );
  const r = rows[0];
  return { total: r?.total ?? 0, seriesCount: r?.series_count ?? 0, idolCount: r?.idol_count ?? 0 };
}

/** ホームの「きらめくレアカード」用。PR・ERだけを少数抜き出す */
export async function getRareCards(limit = 14): Promise<Card[]> {
  const items = await query<Card>(
    `select ${CARD_COLUMNS}
       from cards c
      where c.is_active is true and c.code_suffix in ('PR', 'ER')
      order by c.series_code, (c.card_number)::int nulls last, c.official_code
      limit $1`,
    [limit],
  );
  return items;
}
