"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inrShort, int, pct } from "@/lib/format";
import { fillBudget, rankItems, sameWeights, type Strategy, type Weights } from "@/lib/planner";
import { cx } from "../ui";
import { BudgetLine } from "./budget-line";
import { Controls } from "./controls";
import { download, planCsv } from "./csv";
import { Figures } from "./figures";
import { Ledger } from "./ledger";
import { PlanMap } from "./plan-map";
import type { PlannerData } from "./types";
import { WeightsPanel } from "./weights-panel";

type View = "all" | "paid" | "not";

/** Write one setting into the address bar so a link shares the plan: ?budget=500000&plan=most_risk&weights=likelihood */
function setParam(key: string, value: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (value === null) q.delete(key);
  else q.set(key, value);
  const s = q.toString();
  window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
}

/** Lags behind a fast-changing value, so a screen reader hears the result once the user pauses. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

export function Planner({ data }: { data: PlannerData }) {
  // The plan lives in the URL, so a link shares it. Custom slider weights are the one thing kept only here.
  const params = useSearchParams();
  const [view, setView] = useState<View>("all");
  const [custom, setCustom] = useState<Weights | null>(null);
  const [notice, setNotice] = useState("");

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
  const shown = ranked.filter((i) => (view === "all" ? true : view === "paid" ? fill.funded.has(i.id) : !fill.funded.has(i.id)));
  const cutoffId = view === "all" && fill.cutoff !== null ? ranked[fill.cutoff].id : null;
  const presetName = custom ? "Custom weights" : (preset ?? data.presets[0]).label;

  const sentence = `With ${inrShort(budget)}, ${int(fill.funded.size)} of ${int(ranked.length)} open issues are paid for, covering ${pct(fill.riskCovered)} of the risk.`;
  const settledSentence = useSettled(sentence, 700);

  const say = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      say("Link copied.");
    } catch {
      say("Could not copy. Copy the address from the browser bar.");
    }
  };
  const exportCsv = () => {
    download(`next-rupee-plan-ward-${data.ward.code.replace("/", "-")}.csv`, planCsv(data.ward.code, ranked, fill));
    say("Downloaded.");
  };

  return (
    <div className="space-y-14">
      <Controls budget={budget} onBudget={setBudget} strategy={strategy} onStrategy={setStrategy} defaultBudget={data.defaultBudget} need={data.need} onCopy={copyLink} onCsv={exportCsv} notice={notice} />

      <section aria-labelledby="result-h" className="space-y-6">
        <h2 id="result-h" className="max-w-3xl text-2xl font-bold leading-snug">
          With <span className="num">{inrShort(budget)}</span>, <span className="num">{int(fill.funded.size)} of {int(ranked.length)}</span> open issues are paid for, covering <span className="num text-accent">{pct(fill.riskCovered)}</span> of the risk.
        </h2>
        <p role="status" className="sr-only">
          {settledSentence}
        </p>
        <BudgetLine items={ranked} fill={fill} budget={budget} strategy={strategy} />
        <Figures fill={fill} total={ranked.length} budget={budget} />
      </section>

      <details className="group border-y-2 border-foreground">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3">
          <span>
            <span className="block text-lg font-bold">Change how risk is weighed</span>
            <span className="block text-sm text-muted">Now using: {presetName}</span>
          </span>
          <span aria-hidden className="text-muted transition-transform duration-150 ease group-open:rotate-90">
            ▸
          </span>
        </summary>
        <div className="border-t border-rule py-6">
          <WeightsPanel weights={weights} onWeights={setWeights} presets={data.presets} defaults={data.weights} />
        </div>
      </details>

      <section aria-labelledby="ledger-h">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="ledger-h" className="text-2xl font-bold">
              Open issues, riskiest first
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted">Risk is out of 100: how serious it is, how likely it is to get worse, and what is at stake if it fails. Open any issue to see the arithmetic.</p>
          </div>
          <div role="group" aria-label="Show" className="flex">
            {(
              [
                ["all", `All ${ranked.length}`],
                ["paid", `Paid ${fill.funded.size}`],
                ["not", `Not paid ${ranked.length - fill.funded.size}`],
              ] as const
            ).map(([k, label], n) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cx("num min-h-11 border border-line px-4 text-sm font-semibold transition-colors duration-150 ease", n > 0 && "-ml-px", n === 0 && "rounded-l-sm", n === 2 && "rounded-r-sm", view === k ? "border-foreground bg-foreground text-background" : "bg-panel hover:bg-foreground/5")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="border-y border-rule py-8 text-muted">{view === "paid" ? "This budget does not pay for any issue yet. Raise it, or pick a quick amount above." : "Every issue is paid for."}</p>
        ) : (
          <Ledger items={shown} defaultRank={defaultRank} fill={fill} weights={weights} strategy={strategy} cutoffId={cutoffId} />
        )}
      </section>

      <section aria-labelledby="map-h" className="border-t-2 border-foreground pt-4">
        <h2 id="map-h" className="mb-4 text-2xl font-bold">
          Where they are
        </h2>
        <div className="max-w-3xl">
          <PlanMap map={data.map} items={ranked} funded={fill.funded} />
        </div>
      </section>
    </div>
  );
}
