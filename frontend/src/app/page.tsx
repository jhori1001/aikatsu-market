import Link from "next/link";
import { getCards, getCatalogSummary, getIdolList, getRareCards, type Card } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { getTrackedData } from "@/lib/realPrice";
import { yen } from "@/lib/format";
import { RARITY_SHORT_LABEL } from "@/lib/rarity";
import { CardArt } from "@/components/CardThumb";
import { ErrorBox } from "@/components/ErrorBox";
import { BigTile } from "@/components/BigTile";
import { RankTile } from "@/components/RankTile";

export const dynamic = "force-dynamic";

function num(n: number): string {
  return n.toLocaleString("ja-JP");
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

  const topPriced = [...priced]
    .filter((p) => p.data.summary.current !== null)
    .sort((a, b) => (b.data.summary.current ?? 0) - (a.data.summary.current ?? 0))
    .slice(0, 8);
  const overall = topPriced.slice(0, 10);
  const gainers = [...priced]
    .filter((p) => (p.data.summary.change7.ratio ?? 0) > 0)
    .sort((a, b) => (b.data.summary.change7.ratio ?? 0) - (a.data.summary.change7.ratio ?? 0))
    .slice(0, 10);
  const losers = [...priced]
    .filter((p) => (p.data.summary.change7.ratio ?? 0) < 0)
    .sort((a, b) => (a.data.summary.change7.ratio ?? 0) - (b.data.summary.change7.ratio ?? 0))
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

      {topPriced.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              価格ランキング <small>Yahoo!フリマ・ER・PRのみ</small>
            </h2>
            <Link href="/cards?sort=price_desc" className="section-more">
              すべて見る
            </Link>
          </div>
          <div className="rank-scroll">
            {topPriced.map(({ card, data }) => (
              <BigTile key={card.id} card={card} data={data} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              価格ランキング <small>Yahoo!フリマ・ER・PRのみ</small>
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
          </div>
          <div className="rank-scroll">
            {gainers.map(({ card, data }, i) => (
              <RankTile
                key={card.id}
                card={card}
                no={i + 1}
                price={data.summary.current}
                ratio={data.summary.change7.ratio}
              />
            ))}
          </div>
        </section>
      ) : null}

      {losers.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              値下がり <small>前7日間・ER・PRのみ</small>
            </h2>
          </div>
          <div className="rank-scroll">
            {losers.map(({ card, data }, i) => (
              <RankTile
                key={card.id}
                card={card}
                no={i + 1}
                price={data.summary.current}
                ratio={data.summary.change7.ratio}
              />
            ))}
          </div>
        </section>
      ) : null}

      {overall.length > 0 ? (
        <section className="rank-section">
          <div className="section-head accent-pink">
            <h2 className="section-head-title">
              総合ランキング <small>ER・PRのみ</small>
            </h2>
          </div>
          <div className="rank-list">
            {overall.map(({ card, data }, i) => (
              <Link
                key={card.id}
                href={`/cards/${encodeURIComponent(card.official_code)}`}
                className="rank-row-item"
              >
                <span className="rank-row-no">{i + 1}</span>
                <div className="rank-row-art">
                  <CardArt card={card} showChip={false} />
                </div>
                <div className="rank-row-body">
                  <div className="rank-row-name">{card.name ?? card.official_code}</div>
                  <div className="rank-row-price">{yen(data.summary.current)}</div>
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
          </div>
          <p className="sample-note">
            ※ 価格・ランキングはER・PRカードのみ、Yahoo!フリマの販売中の出品から算出しています。
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
