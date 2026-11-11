import { yen } from "@/lib/format";
import type { ShopPrice, ShopPricePoint } from "@/lib/shopPrice";
import { ShopPriceSection } from "@/components/ShopPriceSection";

/**
 * フリマの相場の横（下）に添える、ショップ参考価格の箱（カドソバの ShopRef と同じ）。
 *
 * 置き場所は2つ。同じ中身を2回描いて、CSS でどちらか一方だけを見せる。
 *   aside … PC幅（820px以上）。価格パネルの右端。パネルの高さは変えない
 *   below … それより狭いとき。グラフのすぐ下。パネルが狭くて並べると崩れるため
 *
 * アイカツはパラレル版がカードとして別に無いので、店にパラレル版があれば
 * その値段も1行添える。
 */
export function ShopRef({
  shop,
  parallel,
  variant,
  history,
}: {
  shop: ShopPrice;
  parallel: ShopPrice | null;
  variant: "aside" | "below";
  /** 価格推移。無ければ「価格推移」の開閉自体を出さない */
  history: ShopPricePoint[];
}) {
  const soldOut = shop.stock === 0;
  return (
    <div className={`shop-ref shop-ref-${variant}${soldOut ? " shop-ref-soldout" : ""}`}>
      <div className="shop-ref-info">
        <div className="shop-ref-head">
          <span className="shop-ref-label">ショップ参考価格</span>
          {soldOut ? <span className="shop-ref-soldout-chip">在庫なし</span> : null}
        </div>
        <div className="shop-ref-price">{yen(shop.price)}</div>
        <div className="shop-ref-note">
          {shop.shop}の{soldOut ? "参考価格（在庫なし）" : "販売価格"}
          {!soldOut && shop.stock !== null ? `（在庫${shop.stock}）` : ""}
        </div>
        {parallel ? (
          <div className="shop-ref-note">
            パラレル版 {yen(parallel.price)}
            {parallel.stock === 0 ? "（在庫なし）" : parallel.stock !== null ? `（在庫${parallel.stock}）` : ""}
          </div>
        ) : null}
      </div>
      {/* 価格推移は金額・ボタンの下に、箱の幅いっぱいで出す（2026-11-11、
          ユーザー指摘「横幅狭いから広くして」。カドソバと同じ置き方） */}
      {history.length > 0 ? (
        <details className="shop-ref-history">
          <summary>価格推移</summary>
          <ShopPriceSection points={history} shopLabel={shop.shop} />
        </details>
      ) : null}
    </div>
  );
}
