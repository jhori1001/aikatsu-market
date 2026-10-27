import Link from "next/link";
import { getCards, getCatalogSummary, getIdolList, getRareCards, type Card } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { fakePriceSeries, fakeSummary } from "@/lib/fakePrice";
import { yen } from "@/lib/format";
import { CardArt } from "@/components/CardThumb";
import { ErrorBox } from "@/components/ErrorBox";
import { RatioTag } from "@/components/PriceBadges";

export const dynamic = "force-dynamic";

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

function priced(card: Card) {
  const summary = fakeSummary(fakePriceSeries(card.official_code, card.code_suffix));
  return { card, price: summary.current ?? 0, ratio7: summary.change7.ratio };
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

  const pricedCards = allCards.map(priced);
  const overall = [...pricedCards].sort((a, b) => b.price - a.price).slice(0, 8);
  const gainers = [...pricedCards]
    .filter((p) => p.ratio7 !== null && p.ratio7 > 0)
    .sort((a, b) => (b.ratio7 ?? 0) - (a.ratio7 ?? 0))
    .slice(0, 10);
  const losers = [...pricedCards]
    .filter((p) => p.ratio7 !== null && p.ratio7 < 0)
    .sort((a, b) => (a.ratio7 ?? 0) - (b.ratio7 ?? 0))
    .slice(0, 10);

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

      <section className="rank-section">
        <div className="section-head accent-pink">
          <h2 className="section-head-title">
            価格ランキング <small>サンプルデータ</small>
          </h2>
          <Link href="/cards" className="section-more">
            すべて見る
          </Link>
        </div>
        <div className="rank-list">
          {overall.map(({ card, price }, i) => (
            <Link key={card.id} href={`/cards/${encodeURIComponent(card.official_code)}`} className="rank-row-item">
              <span className="rank-row-no">{i + 1}</span>
              <div className="rank-row-art">
                <CardArt card={card} showChip={false} />
              </div>
              <div className="rank-row-body">
                <div className="rank-row-name">{card.name ?? card.official_code}</div>
                <div className="rank-row-price">{yen(price)}</div>
              </div>
            </Link>
          ))}
        </div>
        <p className="sample-note">※ 価格・ランキングはサンプルデータです。実際の取引価格ではありません。</p>
      </section>

      {gainers.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              値上がり <small>サンプルデータ・7日間</small>
            </h2>
          </div>
          <div className="rank-scroll">
            {gainers.map(({ card, price, ratio7 }) => (
              <Link
                key={card.id}
                href={`/cards/${encodeURIComponent(card.official_code)}`}
                className="flow-tile"
              >
                <CardArt card={card} />
                <span className="flow-tile-name">{card.name ?? card.official_code}</span>
                <span className="rank-tile-price">{yen(price)}</span>
                <RatioTag ratio={ratio7} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {losers.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              値下がり <small>サンプルデータ・7日間</small>
            </h2>
          </div>
          <div className="rank-scroll">
            {losers.map(({ card, price, ratio7 }) => (
              <Link
                key={card.id}
                href={`/cards/${encodeURIComponent(card.official_code)}`}
                className="flow-tile"
              >
                <CardArt card={card} />
                <span className="flow-tile-name">{card.name ?? card.official_code}</span>
                <span className="rank-tile-price">{yen(price)}</span>
                <RatioTag ratio={ratio7} />
              </Link>
            ))}
          </div>
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
