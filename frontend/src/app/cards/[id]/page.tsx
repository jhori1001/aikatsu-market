import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/cards";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id)).catch(() => null);
  const name = card?.name ?? card?.official_code ?? "カード";
  return {
    title: `${name}｜${SITE.name}`,
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

  const frontSrc = card.has_front
    ? `/img/cards/${encodeURIComponent(card.official_code)}/front-large.webp`
    : null;
  const backSrc = card.has_back
    ? `/img/cards/${encodeURIComponent(card.official_code)}/back-large.webp`
    : null;

  return (
    <>
      <p className="breadcrumb">
        <Link href="/cards">カード図鑑</Link>
      </p>
      <h1 className="page-title">{card.name ?? "（名称未入力）"}</h1>
      <p className="page-sub">
        {card.official_code}
        {card.idol_name ? ` · ${card.idol_name}` : ""}
        {card.rarity ? ` · ${card.rarity}` : ""}
        {card.is_parallel ? " · パラレル" : ""}
      </p>

      <div className="card-detail-art-row">
        <div className="card-art">
          {frontSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frontSrc} alt={`${card.name ?? card.official_code} 表面`} />
          ) : (
            <div className="card-art-empty">画像なし</div>
          )}
        </div>
        {backSrc ? (
          <div className="card-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backSrc} alt={`${card.name ?? card.official_code} 裏面`} />
          </div>
        ) : null}
      </div>

      <div className="notice" style={{ marginTop: 24 }}>
        <p style={{ margin: 0 }}>いまは図鑑（カード名・画像）のみで、相場はまだ出していません。</p>
      </div>
    </>
  );
}
