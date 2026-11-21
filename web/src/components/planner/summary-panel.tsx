import { inrShort, int, pct } from "@/lib/format";
import type { Fill } from "@/lib/planner";

export function SummaryPanel({ fill, total, budget, free }: { fill: Fill; total: number; budget: number; free: number }) {
  const covered = fill.funded.size;
  const overrun = Math.max(fill.spendHigh - budget, 0);
  return (
    <div aria-live="polite" className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted">Issues covered</p>
          <p className="num text-2xl font-semibold">
            {int(covered)}
            <span className="text-base font-normal text-muted"> of {int(total)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Risk covered</p>
          <p className="num text-2xl font-semibold text-accent">{pct(fill.riskCovered)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Typical spend</p>
          <p className="num text-lg font-semibold">{inrShort(fill.spend)}</p>
          {fill.spendHigh > fill.spendLow && (
            <p className="num text-xs text-muted">
              likely {inrShort(fill.spendLow)} to {inrShort(fill.spendHigh)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted">Budget left</p>
          <p className="num text-lg font-semibold">{inrShort(Math.max(fill.left, 0))}</p>
        </div>
      </div>
      {free > 0 && <p className="text-xs text-muted">{free} of the covered repairs cost BMC nothing: the road is under warranty, so the original contractor fixes it.</p>}
      {overrun > 0 && (
        <p role="note" className="rounded-lg border border-warn/30 bg-warn-soft p-2.5 text-xs leading-snug text-warn">
          If jobs cost at the high end of normal, this plan could need about {inrShort(overrun)} more than the budget.
        </p>
      )}
    </div>
  );
}
