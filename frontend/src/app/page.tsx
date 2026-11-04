import Link from "next/link";
import { getCards, getCatalogSummary, getIdolList, getRareCards, type Card } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { getTrackedData, type TrackedCardData } from "@/lib/realPrice";
import { getLatestShopPrices, getShopMiniHistories, type ShopPrice } from "@/lib/shopPrice";
import { yen } from "@/lib/format";
import { RARITY_SHORT_LABEL } from "@/lib/rarity";
import { CardArt } from "@/components/CardThumb";
import { ErrorBox } from "@/components/ErrorBox";
import { BigTile } from "@/components/BigTile";
import { RankTile } from "@/components/RankTile";
import { Carousel } from "@/components/Carousel";

export const dynamic = "force-dynamic";

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

// カドソバのホームと同じく、並びは5枚で止めて6枚目を「すべて見る」にする
const RANK_SIZE = 5;

/**
 * 並びの最後に置く「すべて見る」（カドソバの MoreTile と同じ）。
 * 隣のカードと同じ大きさにして、並びから浮かないようにしている。
 * グラフ付きの大きいタイルの並びには置かない（見出しの右の「すべて見る」で足りる）。
 */
function MoreTile({ href }: { href: string }) {
  return (
    <Link href={href} className="rank-tile more-tile">
      <div className="more-box">
        <span className="more-box-text">
          すべて見る
          <span aria-hidden="true"> →</span>
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let summary;
  let rareCards;
  let idols;
  let allCards: Card[];
  try {
    const [s, rare, idolList, list] = await Promise.all([
      getCatalogSummary(),
      getRareCards(14),
      getIdolList(),
      getCards({ per_page: 200 }),
    ]);
    summary = s;
    rareCards = rare;
    idols = idolList;
    allCards = list.items;
  } catch (error) {
    return <ErrorBox error={error instanceof Error ? error.message : String(error)} />;
  }

  // 実相場を追跡しているのはER・PR(26枚)だけ
  const tracked = allCards.filter((c) => c.code_suffix === "ER" || c.code_suffix === "PR");
  const trackedData = await getTrackedData(tracked.map((c) => c.id));

  const priced = tracked
    .map((card) => ({ card, data: trackedData.get(card.id) }))
    .filter((p): p is { card: Card; data: NonNullable<(typeof p)["data"]> } => Boolean(p.data));

  // 価格ランキングは全カードから。画面に出す金額（フリマの相場、無ければ
  // ショップ参考価格）で並べる（カドソバの effectivePrice と同じ考え方）
  const shops = await getLatestShopPrices();
  type Ranked = { card: Card; data: TrackedCardData | undefined; shop: ShopPrice | null; price: number };
  const ranked: Ranked[] = allCards
    .map((card): Ranked | null => {
      const data = trackedData.get(card.id);
      const shop = shops.get(card.id)?.normal ?? null;
      const price = data?.summary.current ?? shop?.price ?? null;
      return price === null ? null : { card, data, shop, price };
    })
    .filter((r): r is Ranked => r !== null);
  const topPriced = [...ranked].sort((a, b) => b.price - a.price).slice(0, RANK_SIZE);
  const overall = topPriced;
  // ショップ参考価格で出すタイルだけ、その推移を引く
  const shopHistories = await getShopMiniHistories(
    topPriced.filter((r) => r.data?.summary.current == null).map((r) => r.card.id),
  );
  const gainers = [...priced]
    .filter((p) => (p.data.summary.change7.ratio ?? 0) > 0)
    .sort((a, b) => (b.data.summary.change7.ratio ?? 0) - (a.data.summary.change7.ratio ?? 0))
    .slice(0, RANK_SIZE);
  const losers = [...priced]
    .filter((p) => (p.data.summary.change7.ratio ?? 0) < 0)
    .sort((a, b) => (a.data.summary.change7.ratio ?? 0) - (b.data.summary.change7.ratio ?? 0))
    .slice(0, RANK_SIZE);

  return (
    <>
      <section className="hero">
        <div className="hero-deco" aria-hidden="true" />
        <h1 className="hero-title">
          <span className="phrase">{SITE.game}</span>
          <span className="phrase flame">カード図鑑</span>
        </h1>
        <p className="hero-sub">{SITE.tagline}</p>
        <Link href="/cards" className="hero-cta">
          カードをさがす <span aria-hidden="true">→</span>
        </Link>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">{num(summary.total)}</div>
            <div className="hero-stat-label">収録カード</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{num(summary.seriesCount)}</div>
            <div className="hero-stat-label">シリーズ</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{num(summary.idolCount)}</div>
            <div className="hero-stat-label">登場アイドル</div>
          </div>
        </div>
      </section>

      {rareCards.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-gold">
            <h2 className="section-head-title">
              きらめくレアカード <small>プレミアム・アンコールレア</small>
            </h2>
            <Link href="/cards?rarity=PR" className="section-more">
              すべて見る
            </Link>
          </div>
          <div className="auto-marquee">
            <div className="auto-marquee-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="auto-marquee-copy" aria-hidden={copy === 1 ? true : undefined}>
                  {rareCards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/cards/${encodeURIComponent(card.official_code)}`}
                      className="flow-tile"
                    >
                      <CardArt card={card} />
                      <span className="flow-tile-name">{card.name ?? card.official_code}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {topPriced.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              価格ランキング <small>販売中の平均の高い順</small>
            </h2>
            <Link href="/cards?sort=price_desc" className="section-more">
              すべて見る
            </Link>
          </div>
          {/* 1枚ずつ止める（惰性で2枚3枚と飛ばさない）。カドソバと同じ */}
          <Carousel variant="snap-one">
            {topPriced.map(({ card, data, shop }) => (
              <BigTile
                key={card.id}
                card={card}
                data={data}
                shop={shop}
                shopPoints={shopHistories.get(card.id)}
              />
            ))}
          </Carousel>
        </section>
      ) : (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              価格ランキング <small>販売中の平均の高い順</small>
            </h2>
          </div>
          <div className="empty">まだ価格データがありません。記録が溜まると表示されます。</div>
        </section>
      )}

      {gainers.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              値上がり <small>前7日間・ER・PRのみ</small>
            </h2>
            <Link href="/cards?sort=change_desc" className="section-more">
              すべて見る
            </Link>
          </div>
          <Carousel>
            {gainers.map(({ card, data }, i) => (
              <RankTile
                key={card.id}
                card={card}
                no={i + 1}
                price={data.summary.current}
                ratio={data.summary.change7.ratio}
              />
            ))}
            <MoreTile href="/cards?sort=change_desc" />
          </Carousel>
        </section>
      ) : null}

      {losers.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              値下がり <small>前7日間・ER・PRのみ</small>
            </h2>
            <Link href="/cards?sort=change_asc" className="section-more">
              すべて見る
            </Link>
          </div>
          <Carousel>
            {losers.map(({ card, data }, i) => (
              <RankTile
                key={card.id}
                card={card}
                no={i + 1}
                price={data.summary.current}
                ratio={data.summary.change7.ratio}
              />
            ))}
            <MoreTile href="/cards?sort=change_asc" />
          </Carousel>
        </section>
      ) : null}

      {overall.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              総合ランキング <small>販売中の平均の高い順</small>
            </h2>
            <Link href="/cards?sort=price_desc" className="section-more">
              すべて見る
            </Link>
          </div>
          <div className="rank-list">
            {overall.map(({ card, price }, i) => (
              <Link
                key={card.id}
                href={`/cards/${encodeURIComponent(card.official_code)}`}
                className="rank-row-item"
              >
                <span className={`rank-row-no ${i < 3 ? `medal-${i + 1}` : ""}`}>{i + 1}</span>
                <div className="rank-row-art">
                  <CardArt card={card} showChip={false} />
                </div>
                <div className="rank-row-body">
                  <div className="rank-row-name">{card.name ?? card.official_code}</div>
                  <div className="rank-row-price">{yen(price)}</div>
                  <dl className="rank-row-kv">
                    {card.code_suffix ? (
                      <>
                        <dt>レアリティ</dt>
                        <dd>{RARITY_SHORT_LABEL[card.code_suffix] ?? card.code_suffix}</dd>
                      </>
                    ) : null}
                    {card.idol_name ? (
                      <>
                        <dt>アイドル</dt>
                        <dd>{card.idol_name}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              </Link>
            ))}
            {/* 6行目は続きへの入口。5枚で止まると、ここで終わりだと思われる */}
            <Link href="/cards?sort=price_desc" className="rank-row-item rank-row-more">
              すべて見る
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="sample-note">
            ※ ER・PRカードはYahoo!フリマの販売中の出品の平均、それ以外とフリマの相場が出せない
            カードはカードショップ（フルアヘッド）の販売価格です。
          </p>
        </section>
      ) : null}

      {idols.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              アイドルでさがす <small>{idols.length}人</small>
            </h2>
          </div>
          <div className="idol-chip-grid">
            {idols.map(({ idol_name, count }) => (
              <Link
                key={idol_name}
                href={`/cards?idol=${encodeURIComponent(idol_name)}`}
                className="idol-chip"
              >
                {idol_name}
                <span className="idol-chip-count">{count}枚</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
