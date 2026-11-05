import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllCards, getIdolList, getRarityList, getSeriesList } from "@/lib/cards";
import { SITE } from "@/lib/site";
import { getLatestPrices, getTrackedData } from "@/lib/realPrice";
import { getLatestShopPrices } from "@/lib/shopPrice";
import { CardFilters } from "@/components/CardFilters";
import {
  CardListFromUrl,
  CardListHead,
  CardListHeadFromUrl,
  CardListView,
  type ListRow,
} from "@/components/CardListView";

// 毎日の更新のあとに1回だけ作り、あとは作り置きを出す（カドソバの F2 と同じ、2026-11-05）。
// 作り直しは /api/revalidate が行う。見に来た人やロボットが来てもDBは起きない。
// 絞り込み・並び替え・ページ送り（?series= ?rarity= ?idol= ?q= ?sort= ?page= ?parallel=）は
// ブラウザ側（CardListView）で行う。
export const dynamic = "force-static";
export const revalidate = false;

export const metadata: Metadata = {
  title: `カード一覧｜${SITE.game}の相場・価格推移｜${SITE.name}`,
  description: `『${SITE.game}』の収録カードを一覧で。シリーズ・レアリティ・アイドル・パラレルで絞り込み、販売中の出品の平均をカードごとに確認できます。`,
  // 絞り込みや並び替えを付けたURLも同じ一覧なので、本物はここだと伝える
  alternates: { canonical: "/cards" },
};

export default async function CardsPage() {
  // DBが落ちていれば例外のまま（エラー表示を作り置きしない。前の作り置きが出続ける）
  const [cards, seriesOptions, rarityOptions, idolList, prices, shops] = await Promise.all([
    getAllCards(),
    getSeriesList(),
    getRarityList(),
    getIdolList(),
    getLatestPrices(),
    getLatestShopPrices(),
  ]);
  // 値上がり・値下がり順用の7日間の変化率。フリマの相場があるカード全部ぶんを渡しておく
  const tracked = await getTrackedData(
    cards.filter((c) => (prices.get(c.id) ?? null) !== null).map((c) => c.id),
  );
  const rows: ListRow[] = cards.map((card) => ({
    card,
    price: prices.get(card.id) ?? null,
    shop: shops.get(card.id)?.normal ?? null,
    change7: tracked.get(card.id)?.summary.change7.ratio ?? null,
  }));
  const idolOptions = idolList.map((i) => i.idol_name);

  return (
    <>
      <Suspense fallback={<CardListHead rows={rows} />}>
        <CardListHeadFromUrl rows={rows} />
      </Suspense>

      <Suspense fallback={<div className="toolbar" />}>
        <CardFilters seriesOptions={seriesOptions} rarityOptions={rarityOptions} idolOptions={idolOptions} />
      </Suspense>

      {/* 作り置きのHTMLには条件なしの1ページ目を入れておく（検索エンジン向けにも中身がある）。
          ブラウザで開くと URL の条件に合わせて並び直す */}
      <Suspense fallback={<CardListView rows={rows} />}>
        <CardListFromUrl rows={rows} />
      </Suspense>
    </>
  );
}
