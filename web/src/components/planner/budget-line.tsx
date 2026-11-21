import { inrShort } from "@/lib/format";
import type { Fill, Scored, Strategy } from "@/lib/planner";
import type { PlannerIssue } from "./types";

/**
 * The whole plan in one line. Every open issue is a segment, in risk order, as wide as it costs.
 * Dark segments are paid for. In riskiest-first mode the red line is where the money runs out.
 */
export function BudgetLine({ items, fill, budget, strategy }: { items: Scored<PlannerIssue>[]; fill: Fill; budget: number; strategy: Strategy }) {
  const total = items.reduce((s, i) => s + i.cost, 0) || 1;
  const markerAt = Math.min(budget / total, 1) * 100;
  const showMarker = strategy === "risk_first";
  const description =
    strategy === "risk_first"
      ? fill.cutoff === null
        ? `All ${items.length} issues are paid for.`
        : `Issues are in risk order. The first ${fill.cutoff} are paid for in full, then the money runs out before issue ${fill.cutoff + 1}.`
      : `${fill.funded.size} of ${items.length} issues are paid for, chosen to cover the most risk.`;
  return (
    <figure>
      <div className="relative">
        <div role="img" aria-label={`Budget line. ${description}`} className="flex h-9 gap-px">
          {items.map((i) => (
            <div key={i.id} title={`#${i.rank} ${i.workType} on ${i.road}: ${i.cost ? inrShort(i.cost) : "free"}${fill.funded.has(i.id) ? ", paid for" : ", not paid for"}`} className={fill.funded.has(i.id) ? "bg-foreground" : "bg-rule"} style={{ flex: `${Math.max(i.cost, total * 0.004)} 1 0`, minWidth: 2 }} />
          ))}
        </div>
        {showMarker && budget < total && (
          <div aria-hidden className="pointer-events-none absolute inset-y-[-6px] w-[3px] bg-accent" style={{ left: `calc(${markerAt}% - 1px)` }} />
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm text-muted">
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2.5 bg-foreground align-baseline" />
          Paid for
          <span aria-hidden className="ml-4 mr-1.5 inline-block size-2.5 bg-rule align-baseline" />
          Not paid for
          {showMarker && budget < total && (
            <>
              <span aria-hidden className="ml-4 mr-1.5 inline-block h-3 w-[3px] bg-accent align-middle" />
              <span className="font-semibold text-accent">Budget runs out here</span>
              {fill.fromLeftover.size > 0 && <span className="ml-3">Dark segments after the line are paid from what is left.</span>}
            </>
          )}
        </span>
        <span className="num">All {items.length} issues: {inrShort(total)}</span>
      </figcaption>
    </figure>
  );
}
