// ショップ参考価格（フルアヘッド アイドル館の販売価格）。
//
// backend/app/jobs/fetch_shop_prices.py が毎日1回 shop_prices に保存する。
// フリマの相場とは別の物差し（店の定価）なので、カドソバと同じく
// 「フリマの相場が無いカード」の値段として控えめに出す。
// 画面は「最後まで読めた最新の日」の行だけを見る。その日の一覧に無かった
// カードは値段を出さない（古い値段を出し続けない）。

import { query } from "@/lib/db";

export const SHOP_LABEL = "フルアヘッド";
export const SHOP_LOGO = "/shops/fullahead.png";

export type ShopPrice = {
  shop: string;
  logo: string;
  price: number;
  /** 在庫数。null は店のページに在庫数が出ていない */
  stock: number | null;
  url: string | null;
  date: string;
};

export type ShopPrices = { normal: ShopPrice | null; parallel: ShopPrice | null };

export type ShopPricePoint = { date: string; price: number };

/** 最後まで読めた最新の日の、全カードぶんのショップ価格。 */
export async function getLatestShopPrices(): Promise<Map<number, ShopPrices>> {
  const rows = await query<{
    card_pk: number;
    is_parallel: boolean;
    price: number;
    stock: number | null;
    url: string | null;
    date: string;
  }>(
    `select card_pk, is_parallel, price, stock, url, date
       from shop_prices
      where date = (select max(date) from shop_fetch_logs where complete)`,
  );
  const out = new Map<number, ShopPrices>();
  for (const r of rows) {
    const entry = out.get(r.card_pk) ?? { normal: null, parallel: null };
    const price: ShopPrice = {
      shop: SHOP_LABEL,
      logo: SHOP_LOGO,
      price: r.price,
      stock: r.stock,
      url: r.url,
      date: r.date,
    };
    if (r.is_parallel) entry.parallel = price;
    else entry.normal = price;
    out.set(r.card_pk, entry);
  }
  return out;
}

/** 1枚ぶんのショップ価格の推移（通常版）。 */
export async function getShopHistory(cardPk: number, days = 90): Promise<ShopPricePoint[]> {
  const rows = await query<{ date: string; price: number }>(
    `select date, price
       from shop_prices
      where card_pk = $1 and not is_parallel and date >= current_date - $2::int
      order by date`,
    [cardPk, days],
  );
  return rows.map((r) => ({ date: r.date, price: r.price }));
}

/** ホームのタイル用。複数カードの推移をまとめて1回で引く。 */
export async function getShopMiniHistories(
  cardPks: number[],
  days = 30,
): Promise<Map<number, ShopPricePoint[]>> {
  const out = new Map<number, ShopPricePoint[]>();
  if (cardPks.length === 0) return out;
  const rows = await query<{ card_pk: number; date: string; price: number }>(
    `select card_pk, date, price
       from shop_prices
      where card_pk = any($1::bigint[]) and not is_parallel
        and date >= current_date - $2::int
      order by card_pk, date`,
    [cardPks, days],
  );
  for (const r of rows) {
    const list = out.get(r.card_pk) ?? [];
    list.push({ date: r.date, price: r.price });
    out.set(r.card_pk, list);
  }
  return out;
}
