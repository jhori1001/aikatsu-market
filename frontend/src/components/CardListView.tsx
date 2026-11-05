"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Card } from "@/lib/cards";
import type { ShopPrice } from "@/lib/shopPrice";
import { yen } from "@/lib/format";
import { CardArt } from "@/components/CardThumb";
import { useUrlParams } from "@/lib/useUrlParams";

/**
 * カード一覧の中身（絞り込み・並び替え・ページ送り）。
 *
 * 2026-11-05 まではURLの条件ごとにサーバーがDBへ問い合わせて作っていたが、
 * 見に来た人やロボットが来るたびにDB（Neon）が起こされて料金がかかるため、
 * ページは毎日の更新のあとに1回だけ作り、全カードを渡しておいて、
 * 絞り込みと並び替えはここ（ブラウザ側）でやる形にした（カドソバの F2 と同じ）。
 * 並び方・絞り込み方は以前のサーバー側（lib/cards.ts の getCards と app/cards/page.tsx）と同じ。
 */

const PER_PAGE = 48;

export type ListRow = {
  card: Card;
  /** フリマの相場（ER・PR だけ。無ければ null） */
  price: number | null;
  /** ショップ参考価格（フリマの相場が無いカードに出す） */
  shop: ShopPrice | null;
  /** 7日間の変化率（値上がり・値下がり順用。出せなければ null） */
  change7: number | null;
};

function cardHref(card: Card) {
  return `/cards/${encodeURIComponent(card.official_code)}`;
}

function CardTile({ row }: { row: ListRow }) {
  const { card, price, shop } = row;
  return (
    <Link href={cardHref(card)} className="card-tile">
      <CardArt card={card} />
      <div className="card-meta">
        <div className="card-name">{card.name ?? "（名称未入力）"}</div>
        <div className="card-sub">{card.idol_name ?? card.official_code}</div>
        {price !== null ? (
          <div className="card-price">
            <span className="card-price-label">フリマ</span>
            {yen(price)}
          </div>
        ) : shop ? (
          // フリマの相場が無いカードだけ。相場ではなく店の定価なので、控えめに店名を添える
          // （カドソバと同じ）
          <div className="card-price shop">
            <span className="card-price-label">{shop.shop}</span>
            {yen(shop.price)}
          </div>
        ) : (
          <div className="card-price none">データ無</div>
        )}
      </div>
    </Link>
  );
}

const SORTS = new Set(["code", "price_desc", "price_asc", "change_desc", "change_asc"]);

function sortRows(rows: ListRow[], sort: string): ListRow[] {
  // 並びの土台は番号順（rows はサーバーで番号順に並べて渡している）
  const list = [...rows];
  // 値上がり・値下がり順（ホームの「値上がり」「値下がり」の続き）。
  // 7日間の変化率で並べ、変化が出せないカードは最後に置く
  if (sort === "change_desc" || sort === "change_asc") {
    const dir = sort === "change_desc" ? -1 : 1;
    list.sort((a, b) => {
      const ra = a.change7;
      const rb = b.change7;
      if (ra === null) return rb === null ? 0 : 1;
      if (rb === null) return -1;
      return dir * (ra - rb);
    });
  }
  // 並び順は画面に出す金額（フリマの相場、無ければショップ参考価格）で決める。
  // どちらも無いカードは並び順に関わらず最後に置く
  const shown = (r: ListRow) => r.price ?? r.shop?.price ?? null;
  if (sort === "price_desc") {
    list.sort((a, b) => (shown(b) ?? -1) - (shown(a) ?? -1));
  } else if (sort === "price_asc") {
    list.sort((a, b) => {
      const pa = shown(a);
      const pb = shown(b);
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    });
  }
  return list;
}

/** URLの条件で絞り込み・並び替え・ページを切る。 */
export function CardListFromUrl({ rows }: { rows: ListRow[] }) {
  const params = useUrlParams();
  return <CardListView rows={rows} params={params} />;
}

type Params = ReturnType<typeof useUrlParams> | null | undefined;

/** URLの条件で絞り込み・並び替えたカード。題・枚数（上）と並び（下）で同じものを使う */
function useMatched(rows: ListRow[], params: Params) {
  const get = (key: string) => params?.get(key) ?? "";
  const q = get("q").toLowerCase();
  const series = get("series");
  const rarity = get("rarity");
  const idol = get("idol");
  // ホームの「きらめくレアカード」の「すべて見る」から来る（パラレル版だけ）
  const parallel = get("parallel") === "1";
  const sort = SORTS.has(get("sort")) ? get("sort") : "code";
  const page = Math.max(1, Number(get("page")) || 1);

  const matched = useMemo(() => {
    const filtered = rows.filter(({ card }) => {
      if (
        q &&
        !(card.name ?? "").toLowerCase().includes(q) &&
        !card.official_code.toLowerCase().includes(q) &&
        !(card.idol_name ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (series && card.series_code !== series) return false;
      if (rarity && card.code_suffix !== rarity) return false;
      if (idol && card.idol_name !== idol) return false;
      if (parallel && !card.is_parallel) return false;
      return true;
    });
    return sortRows(filtered, sort);
  }, [rows, q, series, rarity, idol, parallel, sort]);
  return { matched, parallel, page };
}

/** 一覧の題（絞り込み欄の上に出す。?parallel=1 のときは「パラレル版のカード」）。 */
export function CardListHeadFromUrl({ rows }: { rows: ListRow[] }) {
  const params = useUrlParams();
  return <CardListHead rows={rows} params={params} />;
}

export function CardListHead({ rows, params }: { rows: ListRow[]; params?: Params }) {
  const { parallel } = useMatched(rows, params);
  return (
    <>
      {/* 題の下の枚数と注記の文は、ユーザー指示で消した（2026-11-05、6dd3fbf） */}
      <h1 className="page-title">{parallel ? "パラレル版のカード" : "カード一覧"}</h1>
    </>
  );
}

export function CardListView({
  rows,
  params,
}: {
  rows: ListRow[];
  /** 無いとき（作り置きのページそのもの）は条件なし・1ページ目 */
  params?: Params;
}) {
  const { matched, page } = useMatched(rows, params);
  const total = matched.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = matched.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function pageHref(target: number) {
    const next = new URLSearchParams(params ? params.toString() : "");
    next.set("page", String(target));
    return `/cards?${next.toString()}`;
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="empty">
          条件に合うカードがありません。
          <br />
          「すべて」を押すと絞り込みを解除できます。
        </div>
      ) : (
        <div className="card-grid">
          {items.map((row) => (
            <CardTile key={row.card.id} row={row} />
          ))}
        </div>
      )}

      {lastPage > 1 ? (
        <div className="pager">
          {page > 1 ? <Link href={pageHref(page - 1)}>前へ</Link> : null}
          <span>
            {page} / {lastPage}
          </span>
          {page < lastPage ? <Link href={pageHref(page + 1)}>次へ</Link> : null}
        </div>
      ) : null}
    </>
  );
}
