"use client";

import { useEffect, useRef, useState } from "react";

export type SortOption = { value: string; label: string; note?: string };

/** 並び順の選択。押すと一覧が開く（カドソバのSortSheetと同じ構成）。 */
export function SortSheet({
  options,
  current,
  onChange,
}: {
  options: SortOption[];
  current: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === current) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(value: string) {
    setOpen(false);
    if (value !== current) onChange(value);
  }

  return (
    <div className="sort-wrap" ref={wrapRef}>
      <button
        type="button"
        className="sort-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sort-btn-label">並び順</span>
        <span className="sort-btn-value">{selected?.label}</span>
        <span className="sort-btn-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <>
          <div className="sort-scrim" onClick={() => setOpen(false)} />
          <div className="sort-menu" role="listbox" aria-label="並び順">
            <div className="sort-menu-head">並び順</div>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === current}
                className={`sort-item ${o.value === current ? "active" : ""}`}
                onClick={() => pick(o.value)}
              >
                <span className="sort-item-check" aria-hidden="true">
                  {o.value === current ? "✓" : ""}
                </span>
                <span>
                  {o.label}
                  {o.note ? <small className="sort-item-note">{o.note}</small> : null}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
