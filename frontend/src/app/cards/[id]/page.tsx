import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { displayCode, getCard } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import { getRealPriceSeries, getRealSummary, getRealListings } from "@/lib/realPrice";
import { getLatestShopPrices, getShopHistory, type ShopPricePoint } from "@/lib/shopPrice";
import { yen, num, dayLabel, mercariSearchUrl, yahooSearchUrl, searchKeyword } from "@/lib/format";
import { CardArtFlip } from "@/components/CardArtFlip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PriceSection } from "@/components/PriceSection";
import { MiniChange } from "@/components/PriceBadges";
import { RealSalesTable } from "@/components/RealSalesTable";
import { ShopRef } from "@/components/ShopRef";
import { ShopPriceSection } from "@/components/ShopPriceSection";
import { ProtectionGoods } from "@/components/ProtectionGoods";

// 毎日の更新のあとに1回だけ作り、あとは作り置きを出す（カドソバの F2 と同じ、2026-11-05）。
// ビルドのときにはDBを読まない（generateStaticParams は空）。最初に開かれたときに作って保存し、
// 作り直しは /api/revalidate が行う。DBが落ちていれば例外のまま（前の作り置きを残す）。
// 無い番号は notFound()（404）。
export const dynamic = "force-static";
export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

// フリマの相場を追跡しているのはER・PR(26枚)だけ。
// それ以外（R・N）と、フリマの相場が出せないER・PRは、ショップ参考価格を出す。
// パラレル版も追う（タイトルに「パラレル」と書かれた出品だけを、パラレル版の相場にする）。
function isTracked(card: { code_suffix: string | null; is_parallel: boolean }): boolean {
  return card.code_suffix === "ER" || card.code_suffix === "PR";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id));
  if (!card) return { title: `カード｜${SITE.name}` };
  const name = card.name ?? card.official_code ?? "カード";
  const bits = [card.idol_name, card.rarity, card.is_parallel ? "パラレル" : null].filter(Boolean);
  const paren = bits.length ? `（${bits.join(" ")}）` : "";
  // 日輪と同じ形（2026-11-06）。検索されるのはカード名なので先頭に置き、
  // 「アイカツ ○○ 相場」のような打ち方にも引っかかるよう「相場・価格推移」とゲーム名を足す。
  const title = `${name}${paren}の相場・価格推移｜${SITE.game}`;
  const description = isTracked(card)
    ? `${SITE.game}「${name}」${paren}の相場と値動き。Yahoo!フリマの出品を毎日記録し、値動きをグラフで見られます。`
    : `${SITE.game}「${name}」${paren}のショップ参考価格。カード画像と収録情報も見られます。`;
  return {
    title,
    description,
    alternates: { canonical: `/cards/${encodeURIComponent(id)}` },
    openGraph: { title, description, type: "article" },
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

  const tracked = isTracked(card);
  const keyword = searchKeyword(card);

  let priceSeries: { date: string; price: number }[] = [];
  let summary: Awaited<ReturnType<typeof getRealSummary>> | null = null;
  let listings: Awaited<ReturnType<typeof getRealListings>> = [];
  const [shops, shopHistory] = await Promise.all([
    getLatestShopPrices(),
    getShopHistory(card.id),
  ]);
  const shopPrices = shops.get(card.id) ?? { normal: null, parallel: null };
  const shop = shopPrices.normal;
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
  // フリマの相場が出せるか。出せなければショップ参考価格を主役にする（カドソバの
  // BigTile と同じ切り替え。フリマの相場が無いカードにだけ店の値段を大きく出す）
  const hasFlea = tracked && summary !== null && summary.current !== null;

  return (
    <>
      <p className="breadcrumb">
        <Link href="/cards">カード一覧</Link>
      </p>

      <div className="detail-hero">
        <div className="detail-head">
          <div className="detail-head-main">
            <h1 className="page-title" style={{ marginTop: 0 }}>
              {card.name ?? "（名称未入力）"}
            </h1>
            <div className="chip-row">
              <span className="badge mono">{displayCode(card)}</span>
              {card.is_parallel ? <span className="badge parallel">パラレル</span> : null}
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
            href={mercariSearchUrl(keyword, SITE.mercariAffiliateId)}
            target="_blank"
            rel={SITE.mercariAffiliateId ? "sponsored nofollow noreferrer" : "noreferrer"}
          >
            メルカリで探す
          </a>
          <a className="buy-btn yahoo" href={yahooSearchUrl(keyword)} target="_blank" rel="noreferrer">
            フリマで探す
          </a>
        </div>

        {hasFlea && summary ? (
          <>
            <div className="detail-price">
              <div className={`panel ${shop ? "has-shop" : ""}`}>
                <div className="price-main">
                  <div className="stat-label">販売中の平均（Yahoo!フリマ）</div>
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
                </div>

                {/* PC幅だけ、パネルの右端に置く（狭いときは CSS で隠れ、グラフの下に出る） */}
                {shop ? (
                  <ShopRef shop={shop} parallel={shopPrices.parallel} variant="aside" history={shopHistory} />
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
              {shop ? (
                <ShopRef shop={shop} parallel={shopPrices.parallel} variant="below" history={shopHistory} />
              ) : null}
            </div>
          </>
        ) : shop ? (
          <>
            <div className="detail-price">
              <div className="panel">
                <div className="price-main">
                  <div className="stat-label">ショップ参考価格（{shop.shop}）</div>
                  <div className="price-hero">{yen(shop.price)}</div>
                  <div className="price-asof">{dayLabel(shop.date)}時点</div>
                  <div className="stat-mini-row">
                    <div className="stat-mini-item">
                      <span className="stat-mini-label">在庫</span>
                      <span className="stat-mini-value">
                        {shop.stock === null ? "—" : shop.stock === 0 ? "在庫なし" : `${num(shop.stock)}点`}
                      </span>
                    </div>
                    {shopPrices.parallel ? (
                      <div className="stat-mini-item">
                        <span className="stat-mini-label">パラレル版</span>
                        <span className="stat-mini-value">{yen(shopPrices.parallel.price)}</span>
                      </div>
                    ) : null}
                  </div>
                  {tracked && summary ? (
                    <p className="stat-note">
                      {summary.askingCount > 0
                        ? `フリマの出品は ${summary.askingCount}件（相場の表示は3件以上から）`
                        : "フリマの相場はまだありません"}
                    </p>
                  ) : null}
                  {shop.url ? (
                    <a
                      className="shop-ref-btn"
                      style={{ marginTop: 12 }}
                      href={shop.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {shop.shop}で見る<span aria-hidden="true"> ↗</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="detail-chart">
              <div className="panel price-panel">
                <ShopPriceSection points={shopHistory as ShopPricePoint[]} shopLabel={shop.shop} />
                <p className="sample-note">
                  ※ カードショップ（{shop.shop}）の販売価格です。フリマでの取引価格とは異なります。
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="detail-price">
            <div className="panel price-main">
              <div className="stat-label">参考価格</div>
              <div className="price-hero no-data">データ無</div>
              <p className="stat-note">フリマの相場もショップの販売価格も、まだ見つかっていません。</p>
            </div>
          </div>
        )}
      </div>

      {/* 相場とグラフを見終わった直後、一番関心が高いタイミングで出す（カドソバと同じ場所） */}
      <ProtectionGoods />

      {tracked ? (
        <>
          <h2 className="section-title">
            出品・取引の内訳 <small>相場の根拠</small>
          </h2>
          {listings.length === 0 ? (
            <div className="empty">この カードの出品はまだ見つかっていません。</div>
          ) : (
            <RealSalesTable items={listings} />
          )}
        </>
      ) : null}
    </>
  );
}
