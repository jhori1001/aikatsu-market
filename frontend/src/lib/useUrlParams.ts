"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const EMPTY = new URLSearchParams();

/**
 * URL の ?〜 を読む。ただし、画面を組み立てた直後（ハイドレーション）は空として返す。
 *
 * 公開ページは毎日の更新のあとに1回だけ作った作り置き（F2、2026-11-05。カドソバと同じ）で、
 * 作り置きのHTMLは「条件なし」で作られている。最初から URL の条件で描くと、
 * HTMLと食い違って React が警告を出し（#418）、作り直しが走る。
 * いったん作り置きと同じ「条件なし」で組み立ててから、URL の条件に切り替える。
 */
export function useUrlParams(): URLSearchParams | ReturnType<typeof useSearchParams> {
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? params : EMPTY;
}
