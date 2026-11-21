import { inrShort, int, pct } from "@/lib/format";
import type { Fill } from "@/lib/planner";

function Figure({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-mist/60 px-5 py-4">
      <dt className="label">{label}</dt>
      <dd className="num mt-2 text-3xl font-semibold leading-none">{value}</dd>
      {note && <dd className="num mt-2 text-xs text-muted">{note}</dd>}
    </div>
  );
}

/** The four numbers that summarise a plan. */
export function Figures({ fill, total, budget }: { fill: Fill; total: number; budget: number }) {
  const overrun = Math.max(fill.spendHigh - budget, 0);
  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Issues paid for" value={<>{int(fill.funded.size)}<span className="text-lg font-normal text-muted"> of {int(total)}</span></>} />
        <Figure label="Risk covered" value={<span className="text-accent-ink">{pct(fill.riskCovered)}</span>} note={`${int(total - fill.funded.size)} issues left out`} />
        <Figure label="Typical spend" value={inrShort(fill.spend)} note={fill.spendHigh > fill.spendLow ? `likely ${inrShort(fill.spendLow)} to ${inrShort(fill.spendHigh)}` : undefined} />
        <Figure label="Budget left" value={inrShort(Math.max(fill.left, 0))} />
      </dl>
      {overrun > 0 && (
        <p role="note" className="mt-4 rounded-2xl bg-peach px-5 py-3 text-sm leading-snug">
          <strong className="text-accent-ink">Watch the high end.</strong> If jobs cost at the top of their normal range, this plan could need about <span className="num">{inrShort(overrun)}</span> more than the budget.
        </p>
      )}
    </div>
  );
}
