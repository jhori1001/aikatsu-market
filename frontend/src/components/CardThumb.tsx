import { rarityClass } from "@/lib/rarity";
import type { Card } from "@/lib/cards";

type ThumbCard = Pick<Card, "official_code" | "name" | "code_suffix" | "has_front" | "has_back">;

export function thumbUrl(card: ThumbCard): string | null {
  return card.has_front ? `/img/cards/${encodeURIComponent(card.official_code)}/front-thumb.webp` : null;
}

export function largeUrl(card: ThumbCard, side: "front" | "back"): string | null {
  const has = side === "front" ? card.has_front : card.has_back;
  return has ? `/img/cards/${encodeURIComponent(card.official_code)}/${side}-large.webp` : null;
}

/** 一覧のタイル。画像を主役にして、レアリティだけ角に出す。 */
export function CardArt({ card, showChip = true }: { card: ThumbCard; showChip?: boolean }) {
  const src = thumbUrl(card);
  const alt = card.name ?? card.official_code;
  const cls = rarityClass(card.code_suffix);
  return (
    <div className="card-art">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <div className="card-art-empty">画像なし</div>
      )}
      {showChip && card.code_suffix ? (
        <span className={`rarity-chip ${cls}`}>{card.code_suffix}</span>
      ) : null}
    </div>
  );
}

/** 詳細・拡大表示用の大きい画像。 */
export function CardArtLarge({ card, side }: { card: ThumbCard; side: "front" | "back" }) {
  const src = largeUrl(card, side);
  const alt = `${card.name ?? card.official_code}の${side === "back" ? "裏面" : "画像"}`;
  return (
    <div className="detail-art">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} decoding="async" />
      ) : (
        <div className="card-art-empty">画像なし</div>
      )}
    </div>
  );
}
