import Link from "next/link";
import { num, yen } from "@/lib/format";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import type { Card } from "@/lib/cards";
import type { TrackedCardData } from "@/lib/realPrice";
import { CardArt } from "@/components/CardThumb";
import { PriceChart } from "@/components/PriceChart";
import { MiniChange } from "@/components/PriceBadges";

/**
 * カドソバの BigTile と同じ構成（絵・相場・ミニグラフが1枚に収まったタイル）。
 * ホームの総合カードランキングで横に並べる。ER・PRの実相場（Yahoo!フリマ）のみ。
 */
export function BigTile({ card, data }: { card: Card; data: TrackedCardData }) {
  const { summary } = data;
  const miniPoints = data.series.slice(-14);

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
          </div>
        </div>
      </div>

      <div className="big-tile-chart panel">
        {miniPoints.length > 0 ? (
          <PriceChart points={miniPoints} dense />
        ) : (
          <div className="chart-box chart-empty">
            <span>記録がたまるとグラフが出ます</span>
          </div>
        )}
      </div>

      <span className="big-tile-more">
        詳細を見る <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
