import Link from "next/link";
import { yen } from "@/lib/format";
import type { Card } from "@/lib/cards";
import { CardArt } from "@/components/CardThumb";

/** カドソバのRankCarouselのタイルと同じ構成（番号バッジ・絵・名前・価格・増減率）。 */
export function RankTile({
  card,
  no,
  price,
  ratio,
}: {
  card: Card;
  no: number;
  price: number | null;
  ratio: number | null;
}) {
  const moved = ratio !== null && ratio !== 0;
  return (
    <Link href={`/cards/${encodeURIComponent(card.official_code)}`} className="rank-tile">
      <div className="rank-tile-art">
        <CardArt card={card} showChip={false} />
        <span className={`rank-tile-no ${no <= 3 ? `medal-${no}` : ""}`}>{no}</span>
      </div>
      <div className="rank-tile-meta">
        <div className="rank-tile-name">{card.name ?? "（名称未入力）"}</div>
        <div className="rank-tile-label">参考価格</div>
        <div className="rank-tile-row">
          <span className="rank-tile-price">{yen(price)}</span>
          {moved ? (
            <span className={`rank-tile-delta ${ratio > 0 ? "diff-up" : "diff-down"}`}>
              {ratio > 0 ? "+" : ""}
              {ratio.toFixed(1)}%
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
