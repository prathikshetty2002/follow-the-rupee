import type { Scored } from "@/lib/planner";
import type { PlannerIssue, PlannerMap } from "./types";

/** Where the open issues are. The ledger above has the same issues in text, so the map is for orientation only. */
export function PlanMap({ map, items, funded }: { map: PlannerMap; items: Scored<PlannerIssue>[]; funded: Set<string> }) {
  const placed = items.filter((i) => i.x !== null && i.y !== null);
  const missing = items.length - placed.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} aria-hidden="true" focusable="false" className="h-auto w-full rounded-2xl bg-mist/60">
        <path d={map.ward} className="fill-card stroke-line" strokeWidth={1.25} />
        {map.roads.map((r) => (
          <path key={r.id} d={r.d} fill="none" className="stroke-unpaid" strokeWidth={3} strokeLinecap="round" />
        ))}
        {placed.map((i) => {
          const paid = funded.has(i.id);
          return (
            <g key={i.id} transform={`translate(${i.x},${i.y})`}>
              <circle r={12} className={paid ? "fill-sea-fill stroke-card" : "fill-card stroke-sea-fill"} strokeWidth={2} />
              <text textAnchor="middle" dominantBaseline="central" className={paid ? "fill-card text-[10px] font-semibold" : "fill-foreground text-[10px] font-semibold"}>
                {i.rank}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-3 rounded-full bg-sea-fill align-middle" />
          Paid for
        </span>
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-3 rounded-full border-2 border-sea-fill align-middle" />
          Not paid for
        </span>
        <span>Numbers are ranks. {missing > 0 ? `${missing} issue${missing > 1 ? "s" : ""} with no usable location are not shown.` : ""}</span>
      </figcaption>
    </figure>
  );
}
