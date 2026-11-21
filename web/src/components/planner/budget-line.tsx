import { inrShort } from "@/lib/format";
import type { Fill, Scored, Strategy } from "@/lib/planner";
import type { PlannerIssue } from "./types";

/**
 * The whole plan in one line. Every open issue is a segment, in risk order, as wide as it costs.
 * Deep blue segments are paid for. In riskiest-first mode the orange line is where the money runs out.
 */
export function BudgetLine({ items, fill, budget, strategy }: { items: Scored<PlannerIssue>[]; fill: Fill; budget: number; strategy: Strategy }) {
  const total = items.reduce((s, i) => s + i.cost, 0) || 1;
  const markerAt = Math.min(budget / total, 1) * 100;
  const showMarker = strategy === "risk_first" && budget < total;
  const description =
    strategy === "risk_first"
      ? fill.cutoff === null
        ? `All ${items.length} issues are paid for.`
        : `Issues are in risk order. The first ${fill.cutoff} are paid for in full, then the money runs out before issue ${fill.cutoff + 1}.`
      : `${fill.funded.size} of ${items.length} issues are paid for, chosen to cover the most risk.`;
  return (
    <figure>
      <div className="relative pt-3">
        <div role="img" aria-label={`Budget line. ${description}`} className="flex h-11 gap-0.5 overflow-hidden rounded-2xl">
          {items.map((i) => (
            <div key={i.id} title={`#${i.rank} ${i.workType} on ${i.road}: ${i.cost ? inrShort(i.cost) : "free"}${fill.funded.has(i.id) ? ", paid for" : ", not paid for"}`} className={fill.funded.has(i.id) ? "bg-sea-fill" : "bg-unpaid"} style={{ flex: `${Math.max(i.cost, total * 0.004)} 1 0`, minWidth: 2 }} />
          ))}
        </div>
        {showMarker && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 w-[3px]" style={{ left: `calc(${markerAt}% - 1.5px)` }}>
            <span className="absolute -top-0.5 left-1/2 size-3.5 -translate-x-1/2 rounded-full border-2 border-card bg-accent" />
            <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm text-muted">
        <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            <span aria-hidden className="mr-1.5 inline-block size-3 rounded-sm bg-sea-fill align-baseline" />
            Paid for
          </span>
          <span>
            <span aria-hidden className="mr-1.5 inline-block size-3 rounded-sm bg-unpaid align-baseline" />
            Not paid for
          </span>
          {showMarker && (
            <span>
              <span aria-hidden className="mr-1.5 inline-block h-3 w-[3px] rounded-full bg-accent align-middle" />
              <span className="font-semibold text-accent-ink">Budget runs out here.</span>
              {fill.fromLeftover.size > 0 && " Blue segments after it are paid from what is left."}
            </span>
          )}
        </span>
        <span className="num">All {items.length} issues: {inrShort(total)}</span>
      </figcaption>
    </figure>
  );
}
