"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { inrShort, int, pct } from "@/lib/format";
import { fillBudget, rankItems, sameWeights, type Strategy, type Weights } from "@/lib/planner";
import { Card, Display, cx } from "../ui";
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
    <div className="space-y-8">
      <Controls budget={budget} onBudget={setBudget} strategy={strategy} onStrategy={setStrategy} defaultBudget={data.defaultBudget} need={data.need} onCopy={copyLink} onCsv={exportCsv} notice={notice} />

      <Card>
        <section aria-labelledby="result-h" className="space-y-7">
          <h2 id="result-h" className="display max-w-3xl text-3xl sm:text-4xl">
            With <span className="num">{inrShort(budget)}</span>, <em className="num">{int(fill.funded.size)} of {int(ranked.length)}</em> open issues are paid for, covering <em className="num">{pct(fill.riskCovered)}</em> of the risk.
          </h2>
          <p role="status" className="sr-only">
            {settledSentence}
          </p>
          <BudgetLine items={ranked} fill={fill} budget={budget} strategy={strategy} />
          <Figures fill={fill} total={ranked.length} budget={budget} />
        </section>
      </Card>

      <details className="group soft rounded-3xl">
        <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <span>
            <span className="block text-xl font-semibold">Change how risk is weighed</span>
            <span className="block text-sm text-muted">Now using: {presetName}</span>
          </span>
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-mist text-muted transition-transform duration-150 ease group-open:rotate-90">
            ▸
          </span>
        </summary>
        <div className="border-t border-rule px-6 py-6 sm:px-8">
          <WeightsPanel weights={weights} onWeights={setWeights} presets={data.presets} defaults={data.weights} />
        </div>
      </details>

      <section aria-labelledby="ledger-h" className="pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <Display as="h2" id="ledger-h" accent="riskiest first" className="text-3xl sm:text-4xl">
              Open issues, riskiest first
            </Display>
            <p className="mt-2 max-w-xl text-sm text-muted">Risk is out of 100: how serious it is, how likely it is to get worse, and what is at stake if it fails. Open any issue to see the arithmetic.</p>
          </div>
          <div role="group" aria-label="Show" className="soft flex rounded-full p-1">
            {(
              [
                ["all", `All ${ranked.length}`],
                ["paid", `Paid ${fill.funded.size}`],
                ["not", `Not paid ${ranked.length - fill.funded.size}`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cx("num min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ease", view === k ? "bg-foreground text-background" : "text-muted hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <Card>
            <p className="text-muted">{view === "paid" ? "This budget does not pay for any issue yet. Raise it, or pick a quick amount above." : "Every issue is paid for."}</p>
          </Card>
        ) : (
          <Ledger items={shown} defaultRank={defaultRank} fill={fill} weights={weights} strategy={strategy} cutoffId={cutoffId} />
        )}
      </section>

      <Card>
        <section aria-labelledby="map-h">
          <Display as="h2" id="map-h" accent="they are" className="mb-5 text-3xl">
            Where they are
          </Display>
          <div className="max-w-3xl">
            <PlanMap map={data.map} items={ranked} funded={fill.funded} />
          </div>
        </section>
      </Card>
    </div>
  );
}
