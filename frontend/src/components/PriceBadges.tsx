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

