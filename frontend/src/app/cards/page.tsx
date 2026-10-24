import type { Metadata } from "next";
import Link from "next/link";
import { getCards, getSeriesList, type Card } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

const PER_PAGE = 60;

export const metadata: Metadata = {
  title: `カード図鑑｜${SITE.name}`,
  description: `『${SITE.game}』の収録カードを一覧で。画像つきの図鑑です。`,
  alternates: { canonical: "/cards" },
};

const SERIES_LABEL: Record<string, string> = {
  E1: "1弾",
};

function seriesLabel(code: string): string {
  return SERIES_LABEL[code] ?? code;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function cardHref(card: Card) {
  return `/cards/${encodeURIComponent(card.official_code)}`;
}

function CardTile({ card }: { card: Card }) {
  const src = card.has_front
    ? `/img/cards/${encodeURIComponent(card.official_code)}/front-thumb.webp`
    : null;
  return (
    <Link href={cardHref(card)} className="card-tile">
      <div className="card-art">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={card.name ?? card.official_code} loading="lazy" decoding="async" />
        ) : (
          <div className="card-art-empty">画像なし</div>
        )}
      </div>
      <div className="card-meta">
        <div className="card-name">{card.name ?? "（名称未入力）"}</div>
        <div className="card-sub">
          <span className="card-code">{card.official_code}</span>
          {card.rarity ?? ""}
        </div>
      </div>
    </Link>
  );
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const series = first(sp.series) || null;
  const q = first(sp.q) || null;

  let listRes;
  let seriesOptions: string[] = [];
  try {
    [listRes, seriesOptions] = await Promise.all([
      getCards({ q, series, page, per_page: PER_PAGE }),
      getSeriesList(),
    ]);
  } catch (error) {
    return (
      <>
        <h1 className="page-title">カード図鑑</h1>
        <ErrorBox error={error instanceof Error ? error.message : String(error)} />
      </>
    );
  }

  const { items, total } = listRes;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (series) next.set("series", series);
    next.set("page", String(target));
    return `/cards?${next.toString()}`;
  }

  return (
    <>
      <h1 className="page-title">カード図鑑</h1>
      <p className="page-sub">{total.toLocaleString("ja-JP")}枚 · {SITE.game}の収録カード</p>

      <div className="toolbar">
        <form method="get" className="search-row">
          <input type="search" name="q" defaultValue={q ?? ""} placeholder="カード名・アイドル名で検索" />
          {series ? <input type="hidden" name="series" value={series} /> : null}
          <button type="submit" className="primary">検索</button>
        </form>
        {seriesOptions.length > 1 ? (
          <div className="chip-scroll">
            <Link href="/cards" className={!series ? "chip active" : "chip"}>
              すべて
            </Link>
            {seriesOptions.map((s) => (
              <Link
                key={s}
                href={`/cards?series=${encodeURIComponent(s)}`}
                className={series === s ? "chip active" : "chip"}
              >
                {seriesLabel(s)}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="empty">
          条件に合うカードがありません。
          <br />
          「すべて」を押すと絞り込みを解除できます。
        </div>
      ) : (
        <div className="card-grid">
          {items.map((card) => (
            <CardTile key={card.id} card={card} />
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
