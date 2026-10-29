"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ChartPoint } from "@/components/PriceChart";

/**
 * グラフの部品は重い（描画の道具一式で100KBほどある）。
 * 見える位置に来るまで読み込まないことで、ページを開いた直後の負担を減らす。
 */
const PriceChart = dynamic(
  () => import("@/components/PriceChart").then((m) => m.PriceChart),
  { ssr: false, loading: () => <div className="chart-box" /> },
);

/**
 * 画面に入ったときだけ描くグラフ（カドソバの LazyChart と同じ）。
 *
 * ホームにはグラフ付きのタイルが並ぶ。全部を最初から描くと、見えていない分
 * まで作ることになり、スマホでは目に見えて重くなる。少し手前から用意して、
 * 指が届く頃には描き終わっているようにする。
 */
export function LazyChart({ points, dense = false }: { points: ChartPoint[]; dense?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    // 対応していない環境では、待たずにそのまま描く
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // 横に流れる並びの中では、右にはみ出したタイルは親に切り取られるため、
    // いつまでも「画面の外」と判定される。そういう並びでは、タイルではなく
    // 並びそのものを見張って、行ごとまとめて描く。
    let target: Element = el;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const overflowX = getComputedStyle(p).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") {
        target = p;
        break;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      // 画面の少し外にいるうちから用意を始める
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? (
        <PriceChart points={points} showLegend={false} dense={dense} />
      ) : (
        // 高さを先に取っておく。あとから差し込んでも周りがずれない
        <div className="chart-box" />
      )}
    </div>
  );
}
