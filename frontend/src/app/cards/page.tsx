import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCards, getIdolList, getRarityList, getSeriesList, type Card } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { fakePriceSeries, fakeSummary } from "@/lib/fakePrice";
import { yen } from "@/lib/format";
import { CardArt } from "@/components/CardThumb";
import { CardFilters } from "@/components/CardFilters";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

const PER_PAGE = 48;

export const metadata: Metadata = {
  title: `カード図鑑｜${SITE.name}`,
  description: `『${SITE.game}』の収録カードを一覧で。シリーズ・レアリティ・アイドルで絞り込める図鑑です。`,
  alternates: { canonical: "/cards" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function cardHref(card: Card) {
  return `/cards/${encodeURIComponent(card.official_code)}`;
}

function priceOf(card: Card): number {
  return (
    fakeSummary(card.official_code, fakePriceSeries(card.official_code, card.code_suffix)).current ?? 0
  );
}

function CardTile({ card, price }: { card: Card; price: number }) {
  return (
    <Link href={cardHref(card)} className="card-tile">
      <CardArt card={card} />
      <div className="card-meta">
        <div className="card-name">{card.name ?? "（名称未入力）"}</div>
        <div className="card-sub">{card.idol_name ?? card.official_code}</div>
        <div className="card-price">{yen(price)}</div>
      </div>
    </Link>
  );
}

const SORT_LABEL: Record<string, string> = {
  code: "番号順",
  price_desc: "参考価格が高い順",
  price_asc: "参考価格が安い順",
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const series = first(sp.series) || null;
  const rarity = first(sp.rarity) || null;
  const idol = first(sp.idol) || null;
  const q = first(sp.q) || null;
  const sort = SORT_LABEL[first(sp.sort)] ? first(sp.sort) : "code";

  let seriesOptions: string[] = [];
  let rarityOptions: string[] = [];
  let idolOptions: string[] = [];
  let matched: { card: Card; price: number }[];
  try {
    const [list, seriesList, rarityList, idolList] = await Promise.all([
      getCards({ q, series, rarity, idol, per_page: 200 }),
      getSeriesList(),
      getRarityList(),
      getIdolList(),
    ]);
    matched = list.items.map((card) => ({ card, price: priceOf(card) }));
    seriesOptions = seriesList;
    rarityOptions = rarityList;
    idolOptions = idolList.map((i) => i.idol_name);
  } catch (error) {
    return (
      <>
        <h1 className="page-title">カード図鑑</h1>
        <ErrorBox error={error instanceof Error ? error.message : String(error)} />
      </>
    );
  }

  if (sort === "price_desc") matched.sort((a, b) => b.price - a.price);
  else if (sort === "price_asc") matched.sort((a, b) => a.price - b.price);

  const total = matched.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = matched.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (series) next.set("series", series);
    if (rarity) next.set("rarity", rarity);
    if (idol) next.set("idol", idol);
    if (sort !== "code") next.set("sort", sort);
    next.set("page", String(target));
    return `/cards?${next.toString()}`;
  }

  return (
    <>
      <h1 className="page-title">カード図鑑</h1>
      <p className="page-sub">
        {total.toLocaleString("ja-JP")}枚 · タップすると大きな画像で見られます
        <br />
        <span className="sample-note">※ 価格はサンプルデータです。実際の取引価格ではありません。</span>
      </p>

      <Suspense fallback={<div className="toolbar" />}>
        <CardFilters seriesOptions={seriesOptions} rarityOptions={rarityOptions} idolOptions={idolOptions} />
      </Suspense>

      {items.length === 0 ? (
        <div className="empty">
          条件に合うカードがありません。
          <br />
          「すべて」を押すと絞り込みを解除できます。
        </div>
      ) : (
        <div className="card-grid">
          {items.map(({ card, price }) => (
            <CardTile key={card.id} card={card} price={price} />
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
