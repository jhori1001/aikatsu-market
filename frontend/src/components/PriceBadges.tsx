import { yen } from "@/lib/format";

export type PriceChange = { amount: number | null; ratio: number | null };

export function MiniChange({ change }: { change: PriceChange }) {
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

