"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RARITY_SHORT_LABEL } from "@/lib/rarity";

const SERIES_LABEL: Record<string, string> = { E1: "1弾", EP: "プロモ" };

function seriesLabel(code: string): string {
  return SERIES_LABEL[code] ?? code;
}

type Chip = { key: "series" | "rarity" | "idol"; value: string; label: string };

export function CardFilters({
  seriesOptions,
  rarityOptions,
  idolOptions,
}: {
  seriesOptions: string[];
  rarityOptions: string[];
  idolOptions: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `/cards?${qs}` : "/cards");
  }

  const seriesChips: Chip[] = seriesOptions.map((v) => ({ key: "series", value: v, label: seriesLabel(v) }));
  const rarityChips: Chip[] = rarityOptions.map((v) => ({
    key: "rarity",
    value: v,
    label: RARITY_SHORT_LABEL[v] ?? v,
  }));
  const idolChips: Chip[] = idolOptions.map((v) => ({ key: "idol", value: v, label: v }));

  const hasFilter = Boolean(params.get("series") || params.get("rarity") || params.get("idol") || params.get("q"));

  function ChipRow({ chips }: { chips: Chip[] }) {
    if (chips.length === 0) return null;
    return (
      <div className="chip-scroll">
        {chips.map((chip) => {
          const active = params.get(chip.key) === chip.value;
          return (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              className={`chip ${active ? "active" : ""}`}
              onClick={() => apply({ [chip.key]: active ? "" : chip.value })}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="toolbar">
      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <input
          type="search"
          placeholder="カード名・アイドル名で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
        />
        <button type="submit" className="primary">
          検索
        </button>
      </form>

      <div className="chip-scroll">
        <button
          type="button"
          className={`chip ${hasFilter ? "" : "active"}`}
          onClick={() => router.push("/cards")}
        >
          すべて
        </button>
        {seriesChips.map((chip) => {
          const active = params.get(chip.key) === chip.value;
          return (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              className={`chip ${active ? "active" : ""}`}
              onClick={() => apply({ [chip.key]: active ? "" : chip.value })}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <ChipRow chips={rarityChips} />
      <ChipRow chips={idolChips} />
    </div>
  );
}
