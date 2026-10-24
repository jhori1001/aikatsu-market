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
