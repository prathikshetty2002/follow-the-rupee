import { inrShort, int, pct } from "@/lib/format";
import type { Fill } from "@/lib/planner";

function Figure({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 first:pl-0">
      <dt className="label">{label}</dt>
      <dd className="num mt-1 text-3xl font-semibold leading-none">{value}</dd>
      {note && <dd className="num mt-1.5 text-xs text-muted">{note}</dd>}
    </div>
  );
}

/** The four numbers that summarise a plan, as a ledger header. No tiles. */
export function Figures({ fill, total, budget }: { fill: Fill; total: number; budget: number }) {
  const overrun = Math.max(fill.spendHigh - budget, 0);
  return (
    <div>
      <dl className="grid grid-cols-2 divide-rule border-y border-rule sm:grid-cols-4 sm:divide-x [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-rule sm:[&>div:nth-child(n+3)]:border-t-0 [&>div:nth-child(even)]:border-l [&>div:nth-child(even)]:border-rule sm:[&>div:nth-child(even)]:border-l-0">
        <Figure label="Issues paid for" value={<>{int(fill.funded.size)}<span className="text-lg font-normal text-muted"> of {int(total)}</span></>} />
        <Figure label="Risk covered" value={<span className="text-accent">{pct(fill.riskCovered)}</span>} note={`${int(total - fill.funded.size)} issues left out`} />
        <Figure label="Typical spend" value={inrShort(fill.spend)} note={fill.spendHigh > fill.spendLow ? `likely ${inrShort(fill.spendLow)} to ${inrShort(fill.spendHigh)}` : undefined} />
        <Figure label="Budget left" value={inrShort(Math.max(fill.left, 0))} />
      </dl>
      {overrun > 0 && (
        <p role="note" className="mt-3 border-l-4 border-warn pl-3 text-sm leading-snug">
          <strong className="text-warn">Watch the high end.</strong> If jobs cost at the top of their normal range, this plan could need about <span className="num">{inrShort(overrun)}</span> more than the budget.
        </p>
      )}
    </div>
  );
}
