"use client";

import { FACTOR_INFO } from "@/lib/factors";
import { pct } from "@/lib/format";
import { FACTORS, FAMILIES, normaliseWeights, sameWeights, type Factor, type Weights } from "@/lib/planner";
import type { WeightPreset } from "@/lib/types";
import { cx } from "../ui";

export function WeightsPanel({ weights, onWeights, presets, defaults }: { weights: Weights; onWeights: (w: Weights) => void; presets: WeightPreset[]; defaults: Weights }) {
  const norm = normaliseWeights(weights);
  const current = presets.find((p) => sameWeights(p.weights, weights));
  const base = presets[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Weight presets">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onWeights(p.weights)}
            aria-pressed={current?.key === p.key}
            title={p.note}
            className={cx("min-h-10 rounded-lg border px-3 text-sm transition-colors", current?.key === p.key ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-2")}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {FAMILIES.map((fam) => (
          <div key={fam.key}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{fam.label}</p>
            <ul className="space-y-3">
              {fam.factors.map((f: Factor) => (
                <li key={f}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <label htmlFor={`w-${f}`}>{FACTOR_INFO[f].label}</label>
                    <span className="num text-muted">{pct(norm[f])}</span>
                  </div>
                  <input id={`w-${f}`} type="range" min={0} max={100} step={1} value={Math.round(weights[f] * 100)} onChange={(e) => onWeights({ ...weights, [f]: Number(e.target.value) / 100 })} className="w-full accent-[var(--accent)]" aria-describedby={`wh-${f}`} />
                  <p id={`wh-${f}`} className="text-xs leading-snug text-muted">
                    {FACTOR_INFO[f].help}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs leading-relaxed">
        <p className="mb-1 font-medium text-sm">How well does this weighting hold up?</p>
        {current ? (
          <>
            <p>
              Tested on what happened after 1 August: roads ranked high by the flood, past-trouble, traffic, accident and facility parts were compared with the roads that needed the most repairs.
            </p>
            <ul className="num mt-2 space-y-0.5">
              <li>
                Agreement within a ward: <strong>{current.backtest.in_ward.toFixed(2)}</strong>
                {current.key !== base.key && <span className="text-muted"> (default {base.backtest.in_ward.toFixed(2)})</span>}
              </li>
              <li>
                Top 3 roads right: <strong>{pct(current.backtest.precision_at_3)}</strong>
                {current.key !== base.key && <span className="text-muted"> (default {pct(base.backtest.precision_at_3)})</span>}
              </li>
              <li>
                Shares <strong>{pct(current.top3_overlap_with_default)}</strong> of each ward&apos;s top 3 with the default
              </li>
            </ul>
            <p className="mt-2 text-muted">Seriousness is a judgement the backtest cannot test. Picking 3 roads at random would be right about 25% of the time.</p>
          </>
        ) : (
          <p>These custom weights have not been tested. Pick a preset to see how it held up, or compare the list with the default order.</p>
        )}
      </div>

      {!FACTORS.every((f) => Math.abs(normaliseWeights(weights)[f] - normaliseWeights(defaults)[f]) < 0.005) && (
        <button type="button" onClick={() => onWeights(defaults)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset to the default weights
        </button>
      )}
    </div>
  );
}
