import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllCards, type Card } from "@/lib/cards";
import { getTrackedData } from "@/lib/realPrice";
import { getLatestShopPrices, getShopMiniHistories } from "@/lib/shopPrice";
import { SITE } from "@/lib/site";
import { RankingFromUrl, RankingView, type RankedItem } from "@/components/RankingView";

// 毎日の更新のあとに1回だけ作り、あとは作り置きを出す（日輪と同じ F2）。
// タブ（?type=）の切り替えはブラウザ側（RankingView）で行う。
export const dynamic = "force-static";
export const revalidate = false;

/**
 * ランキングのページ（日輪の /ranking と同じ作り、2026-11-11）。
 * ホームの「価格ランキング」の「すべて見る」を押した先。ホームと同じ、
 * カードの絵・相場・グラフが1枚に収まったタイルを高い順に並べる。
 */

/** タブごとに最大40枚。タブで重なるので、その和だけ推移を引く */
const MAX = 40;

export const metadata: Metadata = {
  title: `カードランキング｜${SITE.game}の相場・価格推移｜${SITE.name}`,
  description:
    `${SITE.game}のカードを販売中の平均の高い順に並べています。`
    + "30日ぶんの値動きもカードごとにグラフで見られます。",
  alternates: { canonical: "/ranking" },
};

export default async function RankingPage() {
  const allCards: Card[] = await getAllCards();
  const tracked = allCards.filter((c) => c.code_suffix === "ER" || c.code_suffix === "PR");
  const [trackedData, shops] = await Promise.all([
    getTrackedData(tracked.map((c) => c.id)),
    getLatestShopPrices(),
  ]);

  // 画面に出す金額（フリマの相場、無ければショップ参考価格）で並べる（ホームと同じ）
  const ranked = allCards
    .map((card) => {
      const data = trackedData.get(card.id);
      const shop = shops.get(card.id)?.normal ?? null;
      const price = data?.summary.current ?? shop?.price ?? null;
      return price === null ? null : { card, data, shop, price };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.price - a.price);

  const picked = [
    ...ranked.slice(0, MAX),
    ...ranked.filter((r) => r.card.is_parallel).slice(0, MAX),
    ...ranked.filter((r) => !r.card.is_parallel).slice(0, MAX),
  ].filter((r, i, list) => list.findIndex((x) => x.card.id === r.card.id) === i);
  const order = new Map(ranked.map((r, i) => [r.card.id, i]));
  picked.sort((a, b) => (order.get(a.card.id) ?? 0) - (order.get(b.card.id) ?? 0));

  // ショップ参考価格で出すタイルだけ、その推移を引く
  const shopHistories = await getShopMiniHistories(
    picked.filter((r) => r.data?.summary.current == null).map((r) => r.card.id),
  );
  const items: RankedItem[] = picked.map((r) => ({
    card: r.card,
    data: r.data,
    shop: r.shop,
    shopPoints: shopHistories.get(r.card.id) ?? [],
  }));

  return (
    <>
      <div className="section-head accent-pink" style={{ marginTop: 4 }}>
        <h1 className="section-head-title">
          カードランキング <small>販売中の平均の高い順</small>
        </h1>
      </div>

      <Suspense fallback={<RankingView items={items} />}>
        <RankingFromUrl items={items} />
      </Suspense>

      <div className="home-note">
        相場は Yahoo!フリマ の出品を毎日記録して出しています。フリマの相場が無いカードは
        ショップ参考価格で並べています。
      </div>
    </>
  );
}
