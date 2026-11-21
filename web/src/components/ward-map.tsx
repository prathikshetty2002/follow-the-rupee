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

/** Deeper sea means more serious open issues. */
const fill = (t: number) => `color-mix(in oklab, var(--sea-fill) ${Math.round(8 + t * 72)}%, var(--card))`;

/** A picture of where the wards are. The table beside it is the real way to choose, so the map is hidden from assistive tech. */
export function WardMap({ wards, width, height }: { wards: MapWard[]; width: number; height: number }) {
  const [active, setActive] = useState<MapWard | null>(null);
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false" className="h-auto w-full">
        {wards.map((w) => (
          <Link key={w.slug} href={`/plan/${w.slug}`} tabIndex={-1} onMouseEnter={() => setActive(w)} onMouseLeave={() => setActive(null)}>
            <path d={w.d} style={{ fill: fill(w.need / 100) }} className="stroke-card" strokeWidth={active?.slug === w.slug ? 3 : 1.5} strokeLinejoin="round" />
          </Link>
        ))}
        {wards.map((w) => (
          <text key={`t-${w.slug}`} x={w.cx} y={w.cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none text-[10px] font-semibold" style={{ fill: w.need > 52 ? "var(--card)" : "var(--foreground)" }}>
            {w.code}
          </text>
        ))}
      </svg>
      <figcaption className="mt-3 min-h-12 text-sm">
        {active ? (
          <p>
            <strong>
              Ward {active.code}, {active.name}.
            </strong>{" "}
            <span className="num text-muted">
              {active.openIssues} open issues, {active.budgetLeft} left.
            </span>
          </p>
        ) : (
          <p className="text-muted">Deeper blue means more serious open issues. Point at a ward, or use the table to open its plan.</p>
        )}
      </figcaption>
    </figure>
  );
}
