"use client";

import Link from "next/link";
import { useState } from "react";
import { cx } from "./ui";

export type MapWard = {
  slug: string;
  code: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
  risk: number; // 0-100
  budgetUsed: number; // %
  reopen: number; // 0-1
  openIssues: number;
  over: boolean;
};

const METRICS = {
  risk: {
    label: "Need for money",
    help: "Darker wards have more serious open complaints, so the next rupee matters most there.",
    colorVar: "--accent",
    intensity: (w: MapWard) => w.risk / 100,
    show: (w: MapWard) => `${w.openIssues} open issues, need score ${w.risk}/100`,
    low: "Lower need",
    high: "Higher need",
  },
  budget: {
    label: "Budget used",
    help: "Wards in red have already spent more than their monsoon repair budget.",
    colorVar: "--danger",
    intensity: (w: MapWard) => Math.min(Math.max((w.budgetUsed - 70) / 50, 0), 1),
    show: (w: MapWard) => `${Math.round(w.budgetUsed)}% of budget used${w.over ? ", over budget" : ""}`,
    low: "70% or less",
    high: "120% or more",
  },
  failed: {
    label: "Repairs that failed",
    help: "Share of repairs that had to be redone within 30 days.",
    colorVar: "--danger",
    intensity: (w: MapWard) => Math.min(Math.max((w.reopen - 0.1) / 0.3, 0), 1),
    show: (w: MapWard) => `${Math.round(w.reopen * 100)}% redone within 30 days`,
    low: "10% or less",
    high: "40% or more",
  },
} as const;
type MetricKey = keyof typeof METRICS;

const fill = (colorVar: string, t: number) => `color-mix(in oklab, var(${colorVar}) ${Math.round(10 + t * 78)}%, var(--surface))`;

export function WardMap({ wards, width, height }: { wards: MapWard[]; width: number; height: number }) {
  const [metric, setMetric] = useState<MetricKey>("risk");
  const [active, setActive] = useState<MapWard | null>(null);
  const m = METRICS[metric];

  return (
    <div>
      <div role="group" aria-label="Colour the map by" className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(METRICS) as MetricKey[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={metric === k}
            onClick={() => setMetric(k)}
            className={cx(
              "min-h-10 rounded-lg border px-3.5 text-sm font-medium transition-colors",
              metric === k ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            {METRICS[k].label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted">{m.help}</p>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Map of Mumbai wards" className="h-auto w-full">
          {wards.map((w) => (
            <Link key={w.slug} href={`/ward/${w.slug}`} aria-label={`Ward ${w.code}, ${w.name}: ${m.show(w)}`} onMouseEnter={() => setActive(w)} onFocus={() => setActive(w)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)}>
              <path d={w.d} style={{ fill: fill(m.colorVar, m.intensity(w)) }} className="stroke-background transition-[stroke-width]" strokeWidth={active?.slug === w.slug ? 3 : 1.25} strokeLinejoin="round" />
            </Link>
          ))}
          {wards.map((w) => (
            <text key={`t-${w.slug}`} x={w.cx} y={w.cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-foreground text-[10px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
              {w.code}
            </text>
          ))}
        </svg>
        <div aria-live="polite" className="pointer-events-none mt-2 min-h-12 rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:w-56">
          {active ? (
            <>
              <p className="font-medium">
                Ward {active.code}: {active.name}
              </p>
              <p className="text-muted">{m.show(active)}</p>
            </>
          ) : (
            <p className="text-muted">Point at or tab to a ward. Select it to open its page.</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span>{m.low}</span>
        <div className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${fill(m.colorVar, 0)}, ${fill(m.colorVar, 1)})` }} />
        <span>{m.high}</span>
      </div>
    </div>
  );
}
