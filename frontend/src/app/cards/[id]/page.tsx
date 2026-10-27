import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import { getRealPriceSeries, getRealSummary, getRealListings } from "@/lib/realPrice";
import { yen, num, mercariSearchUrl, yahooSearchUrl, searchKeyword } from "@/lib/format";
import { CardArtFlip } from "@/components/CardArtFlip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PriceSection } from "@/components/PriceSection";
import { MiniChange } from "@/components/PriceBadges";
import { RealSalesTable } from "@/components/RealSalesTable";

export const dynamic = "force-dynamic";

// 実相場を追跡しているのはER・PR(26枚)だけ。R・Nはいまのところ図鑑のみ。
function isTracked(code_suffix: string | null): boolean {
  return code_suffix === "ER" || code_suffix === "PR";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id)).catch(() => null);
  const name = card?.name ?? card?.official_code ?? "カード";
  const bits = [card?.idol_name, card?.rarity].filter(Boolean);
  return {
    title: `${name}${bits.length ? `（${bits.join(" ")}）` : ""}｜${SITE.name}`,
    alternates: { canonical: `/cards/${encodeURIComponent(id)}` },
  };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id));
  if (!card) notFound();

  const tracked = isTracked(card.code_suffix);
  const keyword = searchKeyword(card);

  let priceSeries: { date: string; price: number }[] = [];
  let summary: Awaited<ReturnType<typeof getRealSummary>> | null = null;
  let listings: Awaited<ReturnType<typeof getRealListings>> = [];
  if (tracked) {
    const [series, s, l] = await Promise.all([
      getRealPriceSeries(card.id),
      getRealSummary(card.id),
      getRealListings(card.id),
    ]);
    priceSeries = series.filter((p): p is { date: string; price: number } & typeof p => p.price !== null);
    summary = s;
    listings = l;
  }

  return (
    <>
      <p className="breadcrumb">
        <Link href="/cards">カード図鑑</Link>
      </p>

      <div className="detail-hero">
        <div className="detail-head">
          <div className="detail-head-main">
            <h1 className="page-title" style={{ marginTop: 0 }}>
              {card.name ?? "（名称未入力）"}
            </h1>
            <div className="chip-row">
              <span className="badge mono">{card.official_code}</span>
              {card.code_suffix ? (
                <span className={`badge ${rarityClass(card.code_suffix)}`}>
                  {RARITY_SHORT_LABEL[card.code_suffix] ?? card.code_suffix}
                </span>
              ) : null}
              {card.idol_name ? (
                <Link href={`/cards?idol=${encodeURIComponent(card.idol_name)}`} className="badge">
                  {card.idol_name}
                </Link>
              ) : null}
            </div>
          </div>
          <FavoriteButton code={card.official_code} />
        </div>

        <div className="detail-art-col">
          <CardArtFlip card={card} />
        </div>

        <div className="buy-row">
          <a
            className="buy-btn mercari"
            href={mercariSearchUrl(keyword)}
            target="_blank"
            rel="noreferrer"
          >
            メルカリで探す
          </a>
          <a className="buy-btn yahoo" href={yahooSearchUrl(keyword)} target="_blank" rel="noreferrer">
            フリマで探す
          </a>
        </div>

        {tracked && summary ? (
          <>
            <div className="detail-price">
              <div className="panel price-main">
                <div className="stat-label">参考価格（Yahoo!フリマ）</div>
                <div className="price-hero">{yen(summary.current)}</div>

                <div className="big-tile-diff">
                  <span className="big-tile-diff-label">前日比</span>
                  <MiniChange change={summary.change1} />
                </div>

                <div className="stat-mini-row">
                  <div className="stat-mini-item">
                    <span className="stat-mini-label">出品数</span>
                    <span className="stat-mini-value">{num(summary.askingCount)}件</span>
                  </div>
                  <div className="stat-mini-item">
                    <span className="stat-mini-label">7日間</span>
                    <MiniChange change={summary.change7} />
                  </div>
                  <div className="stat-mini-item">
                    <span className="stat-mini-label">30日間</span>
                    <MiniChange change={summary.change30} />
                  </div>
                </div>
                {summary.current === null ? (
                  <p className="stat-note" style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-faint)" }}>
                    {summary.askingCount > 0
                      ? `出品中 ${summary.askingCount}件（価格の表示は3件以上から）`
                      : "記録がまだありません"}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="detail-chart">
              {priceSeries.length > 0 ? (
                <PriceSection points={priceSeries} sample={false} />
              ) : (
                <div className="panel price-panel">
                  <div className="empty">価格データがまだありません。記録が溜まると表示されます。</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="detail-price">
            <div className="notice">
              <p style={{ margin: 0 }}>
                いまはER・PRカードだけ参考価格を記録しています。このカードはまだ対象外です。
              </p>
            </div>
          </div>
        )}
      </div>

      {tracked ? (
        <>
          <h2 className="section-title">
            Yahoo!フリマの出品 <small>参考価格の根拠</small>
          </h2>
          <RealSalesTable items={listings} />
        </>
      ) : null}
    </>
  );
}
