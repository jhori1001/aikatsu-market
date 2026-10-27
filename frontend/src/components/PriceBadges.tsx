import { yen } from "@/lib/format";
import type { FakeChange } from "@/lib/fakePrice";

export function MiniChange({ change }: { change: FakeChange }) {
  if (change.amount === null) {
    return <span className="stat-mini-value diff-none">—</span>;
  }
  const cls = change.amount > 0 ? "diff-up" : change.amount < 0 ? "diff-down" : "diff-none";
  const sign = change.amount > 0 ? "+" : "";
  return (
    <span className={cls}>
      <span className="stat-mini-value">
        {sign}
        {yen(change.amount)}
      </span>
    </span>
  );
}

export function RatioTag({ ratio }: { ratio: number | null }) {
  if (ratio === null || ratio === 0) return null;
  const cls = ratio > 0 ? "diff-up" : "diff-down";
  return (
    <span className={`rank-tile-delta ${cls}`}>
      {ratio > 0 ? "+" : ""}
      {ratio.toFixed(1)}%
    </span>
  );
}
