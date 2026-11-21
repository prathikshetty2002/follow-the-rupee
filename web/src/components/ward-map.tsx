"use client";

import Link from "next/link";
import { useState } from "react";

export type MapWard = {
  slug: string;
  code: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
  need: number; // 0-100 risk score for the ward's open issues
  openIssues: number;
  budgetLeft: string;
  covered: string;
};

const fill = (t: number) => `color-mix(in oklab, var(--accent) ${Math.round(10 + t * 78)}%, var(--surface))`;

/** Picks a ward: darker means more serious open issues. */
export function WardMap({ wards, width, height }: { wards: MapWard[]; width: number; height: number }) {
  const [active, setActive] = useState<MapWard | null>(null);
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Map of Mumbai wards" className="h-auto w-full">
          {wards.map((w) => (
            <Link key={w.slug} href={`/plan/${w.slug}`} aria-label={`Plan for ward ${w.code}, ${w.name}: ${w.openIssues} open issues, ${w.budgetLeft} budget left`} onMouseEnter={() => setActive(w)} onFocus={() => setActive(w)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)}>
              <path d={w.d} style={{ fill: fill(w.need / 100) }} className="stroke-background" strokeWidth={active?.slug === w.slug ? 3 : 1.25} strokeLinejoin="round" />
            </Link>
          ))}
          {wards.map((w) => (
            <text key={`t-${w.slug}`} x={w.cx} y={w.cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-foreground text-[10px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
              {w.code}
            </text>
          ))}
        </svg>
        <div aria-live="polite" className="pointer-events-none mt-2 min-h-14 rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:w-56">
          {active ? (
            <>
              <p className="font-medium">
                Ward {active.code}: {active.name}
              </p>
              <p className="text-muted">
                {active.openIssues} open issues. {active.budgetLeft} left. {active.covered}
              </p>
            </>
          ) : (
            <p className="text-muted">Point at or tab to a ward. Select it to open its plan.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span>Less serious open issues</span>
        <div className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${fill(0)}, ${fill(1)})` }} />
        <span>More serious</span>
      </div>
    </div>
  );
}
