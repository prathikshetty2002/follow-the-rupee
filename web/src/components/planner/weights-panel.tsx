"use client";

import { FACTOR_INFO } from "@/lib/factors";
import { pct } from "@/lib/format";
import { FAMILIES, normaliseWeights, sameWeights, type Factor, type Weights } from "@/lib/planner";
import type { WeightPreset } from "@/lib/types";
import { btnQuiet, cx, td, th } from "../ui";

export function WeightsPanel({ weights, onWeights, presets, defaults }: { weights: Weights; onWeights: (w: Weights) => void; presets: WeightPreset[]; defaults: Weights }) {
  const norm = normaliseWeights(weights);
  const current = presets.find((p) => sameWeights(p.weights, weights));
  const base = presets[0];
  return (
    <div className="space-y-8">
      <fieldset className="min-w-0">
        <legend className="mb-1 text-base font-bold">Pick a weighting, and see how it held up</legend>
        <p className="mb-3 max-w-3xl text-sm text-muted">
          We tested each one against what happened after 1 August: roads it ranked high on flooding, past trouble, traffic, accidents and facilities were compared with the roads that needed the most repairs. Seriousness cannot be tested, so it is a stated judgement.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem]">
            <caption className="sr-only">Weightings and their test results</caption>
            <thead>
              <tr>
                <th scope="col" className={cx(th, "w-[46%]")}>Weighting</th>
                <th scope="col" className={cx(th, "text-right")}>Within-ward agreement</th>
                <th scope="col" className={cx(th, "text-right")}>Top 3 roads right</th>
                <th scope="col" className={cx(th, "text-right")}>Top 3 shared with default</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((p) => (
                <tr key={p.key} className={cx("hover:bg-foreground/5", current?.key === p.key && "bg-panel")}>
                  <td className={td}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3">
                      <input type="radio" name="weighting" checked={current?.key === p.key} onChange={() => onWeights(p.weights)} className="mt-1 size-5 shrink-0" />
                      <span>
                        <span className="block font-semibold">{p.label}</span>
                        <span className="block text-xs text-muted">{p.key === base.key ? "The weighting the ranking is built on. " : ""}{p.note}</span>
                      </span>
                    </label>
                  </td>
                  <td className={cx(td, "num text-right")}>{p.backtest.in_ward.toFixed(2)}</td>
                  <td className={cx(td, "num text-right")}>{pct(p.backtest.precision_at_3)}</td>
                  <td className={cx(td, "num text-right")}>{pct(p.top3_overlap_with_default)}</td>
                </tr>
              ))}
              {!current && (
                <tr className="bg-panel">
                  <td className={td} colSpan={4}>
                    <strong>Custom weights.</strong> These have not been tested. Picking three roads at random would be right about 25% of the time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </fieldset>

      <div>
        <h3 className="mb-1 text-base font-bold">Or set your own</h3>
        <p className="mb-4 max-w-3xl text-sm text-muted">Each slider is that factor&apos;s share of the score. The shares always add up to 100%.</p>
        <div className="grid gap-x-12 gap-y-6 md:grid-cols-3">
          {FAMILIES.map((fam) => (
            <div key={fam.key}>
              <p className="label mb-2 border-b border-rule pb-1">{fam.label}</p>
              <ul className="space-y-4">
                {fam.factors.map((f: Factor) => (
                  <li key={f}>
                    <div className="flex items-baseline justify-between gap-2">
                      <label htmlFor={`w-${f}`} className="font-semibold">
                        {FACTOR_INFO[f].label}
                      </label>
                      <span className="num text-sm">{pct(norm[f])}</span>
                    </div>
                    <input id={`w-${f}`} type="range" min={0} max={100} step={1} value={Math.round(weights[f] * 100)} aria-valuetext={`${pct(norm[f])} of the score`} aria-describedby={`wh-${f}`} onChange={(e) => onWeights({ ...weights, [f]: Number(e.target.value) / 100 })} className="h-9 w-full" />
                    <p id={`wh-${f}`} className="text-xs leading-snug text-muted">
                      {FACTOR_INFO[f].help}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {!sameWeights(weights, defaults) && (
          <button type="button" onClick={() => onWeights(defaults)} className={cx(btnQuiet, "mt-5")}>
            Reset to the default weights
          </button>
        )}
      </div>
    </div>
  );
}
