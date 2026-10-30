"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ShopPricePoint } from "@/lib/shopPrice";

/** LazyChart のショップ参考価格版。見える位置に来るまで読み込まない。 */
const ShopPriceChart = dynamic(
  () => import("@/components/ShopPriceChart").then((m) => m.ShopPriceChart),
  { ssr: false, loading: () => <div className="chart-box" /> },
);

export function LazyShopChart({
  points,
  shopLabel,
  dense = false,
}: {
  points: ShopPricePoint[];
  shopLabel: string;
  dense?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // LazyChart と同じ理由（横に流れる並びでは、切り取る親を見張る）
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
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? (
        <ShopPriceChart points={points} shopLabel={shopLabel} showLegend={false} dense={dense} />
      ) : (
        <div className="chart-box" />
      )}
    </div>
  );
}
