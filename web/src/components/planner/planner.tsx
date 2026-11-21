"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { inrShort, int, pct } from "@/lib/format";
import { fillBudget, rankItems, sameWeights, type Strategy, type Weights } from "@/lib/planner";
import { cx } from "../ui";
import { BudgetPanel } from "./budget-panel";
import { IssueRow } from "./issue-row";
import { PlanMap } from "./plan-map";
import { SummaryPanel } from "./summary-panel";
import type { PlannerData } from "./types";
import { WeightsPanel } from "./weights-panel";

type View = "all" | "covered" | "not";

/** Write one setting into the address bar so a link shares the plan: ?budget=500000&plan=most_risk&weights=likelihood */
function setParam(key: string, value: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (value === null) q.delete(key);
  else q.set(key, value);
  const s = q.toString();
  window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
}

export function Planner({ data }: { data: PlannerData }) {
  // The plan lives in the URL, so a link shares it. Custom slider weights are the one thing kept only here.
  const params = useSearchParams();
  const [view, setView] = useState<View>("all");
  const [custom, setCustom] = useState<Weights | null>(null);

  const raw = Number(params.get("budget"));
  const budget = params.has("budget") && Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : data.defaultBudget;
  const strategy: Strategy = params.get("plan") === "most_risk" ? "most_risk" : "risk_first";
  const preset = data.presets.find((p) => p.key === params.get("weights"));
  const weights: Weights = custom ?? preset?.weights ?? data.weights;

  const setBudget = (n: number) => setParam("budget", n === data.defaultBudget ? null : String(n));
  const setStrategy = (s: Strategy) => setParam("plan", s === "risk_first" ? null : s);
  const setWeights = (w: Weights) => {
    const match = data.presets.find((p) => sameWeights(p.weights, w));
    if (match) {
      setCustom(null);
      setParam("weights", match.key === data.presets[0].key ? null : match.key);
    } else {
      setCustom(w);
      setParam("weights", null);
    }
  };

  const ranked = useMemo(() => rankItems(data.issues, weights), [data.issues, weights]);
  const defaultRank = useMemo(() => new Map(rankItems(data.issues, data.weights).map((i) => [i.id, i.rank])), [data.issues, data.weights]);
  const fill = useMemo(() => fillBudget(ranked, budget, strategy), [ranked, budget, strategy]);
  const shown = ranked.filter((i) => (view === "all" ? true : view === "covered" ? fill.funded.has(i.id) : !fill.funded.has(i.id)));
  const freeCovered = ranked.filter((i) => i.dlp && fill.funded.has(i.id)).length;
  const customWeights = !sameWeights(weights, data.weights);

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <aside aria-label="Plan settings" className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        <section className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <BudgetPanel budget={budget} onBudget={setBudget} strategy={strategy} onStrategy={setStrategy} defaultBudget={data.defaultBudget} need={data.need} />
          <div className="border-t border-border pt-4">
            <SummaryPanel fill={fill} total={ranked.length} budget={budget} free={freeCovered} />
          </div>
        </section>
        <details className="group rounded-xl border border-border bg-surface">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-medium sm:px-5">
            <span>How risk is weighed {customWeights && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">changed</span>}</span>
            <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="border-t border-border p-4 sm:p-5">
            <WeightsPanel weights={weights} onWeights={setWeights} presets={data.presets} defaults={data.weights} />
          </div>
        </details>
      </aside>

      <div className="min-w-0 space-y-8">
        <div>
          <p aria-live="polite" className="text-lg leading-snug">
            With <strong className="num">{inrShort(budget)}</strong>, the planner pays for <strong className="num">{int(fill.funded.size)} of {int(ranked.length)}</strong> open issues and covers{" "}
            <strong className="num text-accent">{pct(fill.riskCovered)}</strong> of the risk.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Show">
            {(
              [
                ["all", `All ${ranked.length}`],
                ["covered", `Covered ${fill.funded.size}`],
                ["not", `Not covered ${ranked.length - fill.funded.size}`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cx("min-h-10 rounded-lg border px-3.5 text-sm transition-colors", view === k ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-2")}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted">Select an issue to see the working.</span>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{view === "covered" ? "This budget does not cover any issue yet. Raise it, or pick a quick amount." : "Everything is covered."}</p>
        ) : (
          <ol className="space-y-3">
            {shown.map((i) => (
              <IssueRow key={i.id} item={i} defaultRank={defaultRank.get(i.id) ?? i.rank} covered={fill.funded.has(i.id)} why={fill.notCovered.get(i.id)} weights={weights} />
            ))}
          </ol>
        )}

        <section aria-labelledby="map-h" className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 id="map-h" className="mb-3 font-serif text-xl font-semibold">
            Where they are
          </h2>
          <PlanMap map={data.map} items={ranked} funded={fill.funded} />
        </section>
      </div>
    </div>
  );
}
