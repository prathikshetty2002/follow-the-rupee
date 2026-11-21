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

/** Darker ink means more serious open issues. Ink tints keep the red reserved for the budget line. */
const fill = (t: number) => `color-mix(in oklab, var(--foreground) ${Math.round(6 + t * 62)}%, var(--panel))`;

/** A picture of where the wards are. The table beside it is the real way to choose, so the map is hidden from assistive tech. */
export function WardMap({ wards, width, height }: { wards: MapWard[]; width: number; height: number }) {
  const [active, setActive] = useState<MapWard | null>(null);
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false" className="h-auto w-full">
        {wards.map((w) => (
          <Link key={w.slug} href={`/plan/${w.slug}`} tabIndex={-1} onMouseEnter={() => setActive(w)} onMouseLeave={() => setActive(null)}>
            <path d={w.d} style={{ fill: fill(w.need / 100) }} className="stroke-background" strokeWidth={active?.slug === w.slug ? 3 : 1} strokeLinejoin="round" />
          </Link>
        ))}
        {wards.map((w) => (
          <text key={`t-${w.slug}`} x={w.cx} y={w.cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none text-[10px] font-semibold" style={{ fill: w.need > 55 ? "var(--background)" : "var(--foreground)" }}>
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
          <p className="text-muted">Darker wards have more serious open issues. Point at a ward, or use the table to open its plan.</p>
        )}
      </figcaption>
    </figure>
  );
}
