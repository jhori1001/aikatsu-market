"use client";

import { useState } from "react";
import { num, yen } from "@/lib/format";
import type { Grade, GradeData } from "@/lib/realPrice";
import { MiniChange } from "@/components/PriceBadges";
import { PriceSection } from "@/components/PriceSection";
import { useUrlParams } from "@/lib/useUrlParams";

/**
 * 詳細ページの「状態タブ・相場のパネル・価格推移のグラフ」（日輪の DetailPrice と同じ作り、2026-11-11）。
 * ページは毎日の更新のあとに1回だけ作るので、3つの状態の相場をまとめて受け取り、ここで切り替える。
 * URL の ?condition= で開く状態を指定できる（共有したリンクもそのまま開ける）。
 */

// 状態が混ざると相場がぶれるので、既定は「美品」を見せる（日輪と同じ）
export const CONDITIONS: [Grade, string][] = [
  ["mint", "美品"],
  ["damaged", "傷あり"],
  ["all", "すべて"],
];

type Props = {
  grades: Record<Grade, GradeData>;
  /** PC幅でパネルの右端に出すショップ参考価格（無ければ null） */
  shopAside: React.ReactNode;
  /** 狭い画面でグラフの下に出すショップ参考価格（無ければ null） */
  shopBelow: React.ReactNode;
};

export function DetailPriceFromUrl(props: Props) {
  const params = useUrlParams();
  const condition = params.get("condition");
  return <DetailPrice key={condition ?? ""} {...props} initialCondition={condition} />;
}

export function DetailPrice({ grades, shopAside, shopBelow, initialCondition }: Props & { initialCondition?: string | null }) {
  const [condition, setCondition] = useState<Grade>(
    CONDITIONS.some(([c]) => c === initialCondition) ? (initialCondition as Grade) : "mint",
  );

  function pick(value: Grade) {
    setCondition(value);
    // 画面は作り直さず、URLの ?condition= だけ合わせておく（共有・再読み込みで同じ状態を開く）
    const url = new URL(window.location.href);
    url.searchParams.set("condition", value);
    window.history.replaceState(null, "", url.toString());
  }

  const g = grades[condition];
  const hasPrice = g.current !== null;
  const bySold = g.basis === "sold";

  return (
    <>
      <div className="detail-price">
        {/* 状態の切り替え。美品と傷ありで相場は別に集計している */}
        <div className="segmented" style={{ marginBottom: 12 }}>
          {CONDITIONS.map(([value, label]) => (
            <button key={value} type="button" className={value === condition ? "active" : ""} onClick={() => pick(value)}>
              {label}
            </button>
          ))}
        </div>

        <div className={`panel ${shopAside ? "has-shop" : ""}`}>
          <div className="price-main">
            <div className="stat-label">{bySold ? "売れた価格の平均" : "販売中の平均"}</div>
            <div className={`price-hero ${hasPrice ? "" : "no-data"}`}>{hasPrice ? yen(g.current) : "データ無"}</div>

            {hasPrice && !bySold ? (
              <div className="big-tile-diff">
                <span className="big-tile-diff-label">前日比</span>
                <MiniChange change={g.change1} />
              </div>
            ) : null}

            {hasPrice ? (
              <div className="stat-mini-row">
                <div className="stat-mini-item">
                  <span className="stat-mini-label">{bySold ? "取引件数" : "出品数"}</span>
                  <span className="stat-mini-value">{num(bySold ? g.soldCount : g.askingCount)}件</span>
                </div>
                <div className="stat-mini-item">
                  <span className="stat-mini-label">7日間</span>
                  <MiniChange change={g.change7} />
                </div>
                <div className="stat-mini-item">
                  <span className="stat-mini-label">30日間</span>
                  <MiniChange change={g.change30} />
                </div>
              </div>
            ) : null}

            {bySold ? (
              <div className="stat-note" style={{ marginTop: 10 }}>
                販売中の出品が3件未満のため、売れた価格の平均を表示
              </div>
            ) : null}
            {!hasPrice ? (
              <div className="stat-note" style={{ marginTop: 10 }}>
                {g.askingCount ? `出品中 ${g.askingCount}件（相場の表示は3件以上から）` : "現在1件も出品されていません"}
              </div>
            ) : null}
          </div>

          {/* PC幅だけ、パネルの右端に置く（狭いときは CSS で隠れ、グラフの下に出る） */}
          {shopAside}
        </div>
      </div>

      {/* グラフは独立させる。スマホでは [画像｜価格] の下に全幅で置く */}
      <div className="detail-chart">
        {g.series.length > 0 ? (
          <PriceSection points={g.series} sample={false} />
        ) : (
          <div className="panel price-panel">
            <div className="empty">この状態の価格データがまだありません。記録が溜まると表示されます。</div>
          </div>
        )}
        {shopBelow}
      </div>
    </>
  );
}
