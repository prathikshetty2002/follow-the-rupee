import { cx } from "../ui";
import type { PlannerIssue, PlannerMap } from "./types";
import type { Scored } from "@/lib/planner";

export function PlanMap({ map, items, funded }: { map: PlannerMap; items: Scored<PlannerIssue>[]; funded: Set<string> }) {
  const placed = items.filter((i) => i.x !== null && i.y !== null);
  const missing = items.length - placed.length;
  return (
    <div>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} role="img" aria-label={`Map of the ward with ${placed.length} numbered open issues`} className="h-auto w-full">
        <path d={map.ward} className="fill-surface-2 stroke-border" strokeWidth={1.5} />
        {map.roads.map((r) => (
          <path key={r.id} d={r.d} fill="none" className="stroke-foreground/25" strokeWidth={2} strokeLinecap="round" />
        ))}
        {placed.map((i) => (
          <g key={i.id} transform={`translate(${i.x},${i.y})`}>
            <title>{`#${i.rank} ${i.workType} on ${i.road}`}</title>
            <circle r={11} className={cx("stroke-background", funded.has(i.id) ? "fill-success" : "fill-muted/70")} strokeWidth={2} />
            <text textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-background text-[10px] font-semibold">
              {i.rank}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-success" aria-hidden /> Covered by this plan
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-muted/70" aria-hidden /> Not covered
        </li>
        {missing > 0 && <li>{missing} issue{missing > 1 ? "s" : ""} with no usable location not shown</li>}
      </ul>
    </div>
  );
}
