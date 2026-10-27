import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { RARITY_SHORT_LABEL, rarityClass } from "@/lib/rarity";
import { CardArtFlip } from "@/components/CardArtFlip";
import { FavoriteButton } from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id)).catch(() => null);
  const name = card?.name ?? card?.official_code ?? "カード";
  const bits = [card?.idol_name, card?.rarity].filter(Boolean);
  return {
    title: `${name}${bits.length ? `（${bits.join(" ")}）` : ""}｜${SITE.name}`,
    alternates: { canonical: `/cards/${encodeURIComponent(id)}` },
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

  return (
    <>
      <p className="breadcrumb">
        <Link href="/cards">カード図鑑</Link>
      </p>

      <div className="detail-hero">
        <div className="detail-head">
          <div className="detail-head-main">
            <h1 className="page-title" style={{ marginTop: 0 }}>
              {card.name ?? "（名称未入力）"}
            </h1>
            <div className="chip-row">
              <span className="badge mono">{card.official_code}</span>
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
      </div>
    </>
  );
}
