import { SITE } from "@/lib/site";
import { PROTECTION_GOODS } from "@/lib/protectionGoods";

/**
 * カード保護グッズ（Amazonアソシエイト）の紹介セクション。
 * 相場とグラフを見終わった直後、最も関心が高いタイミングで出す。
 *
 * 画像をタップすると商品リンクが開く（<details>/<summary>。JSを足さず、
 * 既存の「詳細」と同じ仕組みで開閉できるようにしている）。
 *
 * SITE.showProtectionGoods が false のうちは何も描画しない
 * （リンクのタグ確認が済むまで、誰にも見えないようにするため）。
 */
export function ProtectionGoods() {
  if (!SITE.showProtectionGoods) return null;

  return (
    <details className="goods-section">
      <summary className="goods-summary">
        <picture>
          <source srcSet="/goods/protection-banner.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="goods-banner"
            src="/goods/protection-banner.jpg"
            alt="大切なカードを傷から守る、カードスリーブ・バインダー・ローダー"
            width={2079}
            height={756}
            loading="lazy"
          />
        </picture>
        <span className="goods-summary-hint">
          商品を見る <span className="goods-summary-arrow">▾</span>
        </span>
      </summary>

      <div className="goods-list">
        {PROTECTION_GOODS.map((item) => (
          <a
            key={item.id}
            className="goods-item"
            href={item.href}
            target="_blank"
            rel="sponsored nofollow noreferrer"
          >
            <span className="goods-item-label">{item.label}</span>
            <span className="goods-item-blurb">{item.blurb}</span>
            <span className="goods-item-cta">Amazonで見る</span>
          </a>
        ))}
      </div>

      {/* Amazonアソシエイト・プログラムの表記義務。分かりやすい場所に必ず出す */}
      <p className="goods-disclosure">
        Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。
      </p>
    </details>
  );
}
