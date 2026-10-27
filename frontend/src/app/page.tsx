import Link from "next/link";
import { getCatalogSummary, getIdolList, getRareCards } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { CardArt } from "@/components/CardThumb";
import { ErrorBox } from "@/components/ErrorBox";

export const dynamic = "force-dynamic";

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default async function HomePage() {
  let summary;
  let rareCards;
  let idols;
  try {
    [summary, rareCards, idols] = await Promise.all([
      getCatalogSummary(),
      getRareCards(14),
      getIdolList(),
    ]);
  } catch (error) {
    return <ErrorBox error={error instanceof Error ? error.message : String(error)} />;
  }

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
