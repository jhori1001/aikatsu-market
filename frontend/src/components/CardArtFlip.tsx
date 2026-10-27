"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardArtLarge } from "@/components/CardThumb";
import type { Card } from "@/lib/cards";

/**
 * 表と裏を切り替えられるカード画像。押すと画面いっぱいに開く。
 * カドソバのCardArtFlipと同じ考え方（効果等の裏面も公式が公開しているため）。
 */
export function CardArtFlip({ card }: { card: Card }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const hasBack = card.has_back;
  const shown = hasBack ? side : "front";
  const label = (card.name ?? card.official_code) + (shown === "back" ? "の裏面" : "の画像");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [open]);

  const sideButtons = (className: string) =>
    hasBack ? (
      <div className={className}>
        <button
          type="button"
          className={side === "front" ? "current" : ""}
          onClick={() => setSide("front")}
          aria-pressed={side === "front"}
        >
          表面
        </button>
        <button
          type="button"
          className={side === "back" ? "current" : ""}
          onClick={() => setSide("back")}
          aria-pressed={side === "back"}
        >
          裏面
        </button>
      </div>
    ) : null;

  const overlay = (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
      <div className="lightbox-body">
        <div className="lightbox-art" onClick={(e) => e.stopPropagation()}>
          <CardArtLarge card={card} side={shown} />
          <button type="button" className="lightbox-close" onClick={() => setOpen(false)} aria-label="閉じる">
            ×
          </button>
        </div>
      </div>
      <div className="lightbox-foot" onClick={(e) => e.stopPropagation()}>
        {sideButtons("lightbox-sides")}
        <p className="lightbox-hint">カードの外を押すと閉じます</p>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className="art-open" onClick={() => setOpen(true)} aria-label={`${label}を大きく見る`}>
        <CardArtLarge card={card} side={shown} />
        <span className="art-open-hint" aria-hidden="true">
          押すと大きくなります
        </span>
      </button>

      {sideButtons("art-sides")}

      {mounted && open ? createPortal(overlay, document.body) : null}
    </>
  );
}
