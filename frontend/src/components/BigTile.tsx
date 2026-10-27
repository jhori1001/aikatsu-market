import Link from "next/link";
import { num, yen } from "@/lib/format";
import { fakePriceSeries, fakeSummary } from "@/lib/fakePrice";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import type { Card } from "@/lib/cards";
import { CardArt } from "@/components/CardThumb";
import { PriceChart } from "@/components/PriceChart";
import { MiniChange } from "@/components/PriceBadges";

/**
 * カドソバの BigTile と同じ構成（絵・相場・ミニグラフが1枚に収まったタイル）。
 * ホームの総合カードランキングで横に並べる。
 */
export function BigTile({ card }: { card: Card }) {
  const series = fakePriceSeries(card.official_code, card.code_suffix);
  const summary = fakeSummary(card.official_code, series);
  const miniPoints = series.slice(-14);

  return (
    <Link href={`/cards/${encodeURIComponent(card.official_code)}`} className="big-tile">
      <div className="big-tile-head">
        <div className="big-tile-name">{card.name ?? "（名称未入力）"}</div>
        <div className="chip-row big-tile-chips">
          <span className="badge mono">{card.official_code}</span>
          {card.code_suffix ? (
            <span className={`badge ${rarityClass(card.code_suffix)}`}>
              {RARITY_SHORT_LABEL[card.code_suffix] ?? card.code_suffix}
            </span>
          ) : null}
        </div>

        <div className="big-tile-body">
          <div className="big-tile-art">
            <CardArt card={card} showChip={false} />
          </div>

          <div className="panel big-tile-panel">
            <div className="stat-label">参考価格（サンプル）</div>
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
        </div>
      </div>

      <div className="big-tile-chart panel">
        <PriceChart points={miniPoints} dense />
      </div>

      <span className="big-tile-more">
        詳細を見る <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
