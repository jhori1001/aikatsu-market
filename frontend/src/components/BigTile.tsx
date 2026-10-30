import Link from "next/link";
import { dayLabel, num, yen } from "@/lib/format";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import type { Card } from "@/lib/cards";
import type { TrackedCardData } from "@/lib/realPrice";
import type { ShopPrice, ShopPricePoint } from "@/lib/shopPrice";
import { CardArt } from "@/components/CardThumb";
import { LazyChart } from "@/components/LazyChart";
import { LazyShopChart } from "@/components/LazyShopChart";
import { MiniChange } from "@/components/PriceBadges";

const NO_CHANGE = { amount: null, ratio: null };

/** 日付を "2026-10-29" の形にそろえる（DBからは Date で来ることもある）。 */
function dayKey(value: string | Date): string {
  return (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
}

/** 今日（日本時間）を含めた直近7日の初日。カドソバのホームと同じ7日固定。 */
function miniCutoff(): string {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
  today.setUTCDate(today.getUTCDate() - 6);
  return today.toISOString().slice(0, 10);
}

/**
 * カドソバの BigTile と同じ構成（絵・相場・ミニグラフが1枚に収まったタイル）。
 * ホームの価格ランキングで横に並べる。
 *
 * フリマの相場（ER・PRのみ）が出せるカードはそれを、出せないカード（R・N など）は
 * ショップ参考価格を出す（カドソバのサポートカードと同じ切り替え）。
 * タイル全体がリンク。横にスライドさせた後の指離しで開かないよう、
 * Carousel 側がドラッグとクリックを区別する。
 */
export function BigTile({
  card,
  data,
  shop = null,
  shopPoints = [],
  dense = false,
}: {
  card: Card;
  /** フリマの相場（ER・PRのみ）。無ければショップ参考価格を出す */
  data?: TrackedCardData;
  shop?: ShopPrice | null;
  /** ショップ参考価格の推移。フリマの相場が無いタイルのグラフに使う */
  shopPoints?: ShopPricePoint[];
  /** 2枚並べる場所に置くとき。中のグラフの軸を細くする */
  dense?: boolean;
}) {
  const summary = data?.summary ?? null;
  const useShop = (summary === null || summary.current === null) && shop !== null;
  // 7日ぶんを固定で見せる（カドソバのホームと同じ）。細かく見たい人は詳細ページへ
  const cutoff = miniCutoff();
  const miniPoints = (data?.series ?? []).filter((p) => dayKey(p.date) >= cutoff);

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
            <div className="stat-label">{useShop ? shop!.shop : "販売中の平均（Yahoo!フリマ）"}</div>
            <div className={`price-hero ${useShop || summary?.current != null ? "" : "no-data"}`}>
              {useShop ? yen(shop!.price) : summary?.current != null ? yen(summary.current) : "データ無"}
            </div>
            {useShop ? <div className="price-asof">{dayLabel(shop!.date)}時点</div> : null}
            <div className="big-tile-diff">
              {useShop ? null : <span className="big-tile-diff-label">前日比</span>}
              <MiniChange change={useShop ? NO_CHANGE : (summary?.change1 ?? NO_CHANGE)} />
            </div>
            <div className="stat-mini-row">
              <div className="stat-mini-item">
                <span className="stat-mini-label">{useShop ? "在庫" : "出品数"}</span>
                <span className="stat-mini-value">
                  {useShop
                    ? shop!.stock === null
                      ? "—"
                      : `${num(shop!.stock)}点`
                    : `${num(summary?.askingCount ?? 0)}件`}
                </span>
              </div>
              <div className="stat-mini-item">
                <span className="stat-mini-label">7日間</span>
                <MiniChange change={useShop ? NO_CHANGE : (summary?.change7 ?? NO_CHANGE)} />
              </div>
              <div className="stat-mini-item">
                <span className="stat-mini-label">30日間</span>
                <MiniChange change={useShop ? NO_CHANGE : (summary?.change30 ?? NO_CHANGE)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* グラフの枠は必ず置く。記録が少ないカードだけ枠ごと消えると、
          横に並べたとき1枚だけ背が低くなって崩れて見える（カドソバと同じ） */}
      <div className="big-tile-chart panel">
        {useShop ? (
          shopPoints.length > 0 ? (
            <LazyShopChart points={shopPoints} shopLabel={shop!.shop} dense={dense} />
          ) : (
            <div className="chart-box chart-empty">
              <span>記録がたまるとグラフが出ます</span>
            </div>
          )
        ) : miniPoints.length > 0 ? (
          <LazyChart points={miniPoints} dense={dense} />
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
