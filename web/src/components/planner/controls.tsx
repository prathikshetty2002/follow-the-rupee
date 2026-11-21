"use client";

import { inr, inrShort } from "@/lib/format";
import type { Strategy } from "@/lib/planner";
import { Card, btnQuiet, cx, field } from "../ui";

const group = new Intl.NumberFormat("en-IN");

export function Controls({
  budget,
  onBudget,
  strategy,
  onStrategy,
  defaultBudget,
  need,
  onCopy,
  onCsv,
  notice,
}: {
  budget: number;
  onBudget: (n: number) => void;
  strategy: Strategy;
  onStrategy: (s: Strategy) => void;
  defaultBudget: number;
  need: number;
  onCopy: () => void;
  onCsv: () => void;
  notice: string;
}) {
  const sliderMax = Math.max(Math.ceil((need * 1.1) / 10_000) * 10_000, 100_000);
  const chips = [
    { label: `Budget left ${inrShort(defaultBudget)}`, value: defaultBudget },
    { label: "₹5 L", value: 500_000 },
    { label: "₹10 L", value: 1_000_000 },
    { label: `Everything ${inrShort(need)}`, value: Math.ceil(need / 100) * 100 },
  ];
  return (
    <Card>
      <section aria-label="Plan settings" className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="budget" className="label mb-3 block">
            Budget to spend
          </label>
          <div className="flex items-center gap-3">
            <span aria-hidden className="font-serif text-4xl text-muted">
              ₹
            </span>
            <input id="budget" inputMode="numeric" autoComplete="off" aria-describedby="budget-help" value={group.format(budget)} onChange={(e) => onBudget(Number(e.target.value.replace(/\D/g, "")) || 0)} className={cx(field, "num rounded-2xl text-4xl font-semibold")} style={{ minHeight: "4rem" }} />
          </div>
          <p id="budget-help" className="mt-2 text-sm text-muted">
            Digits only. The ward&apos;s season budget minus what it has spent leaves {inr(defaultBudget)}.
          </p>
          <input type="range" aria-label="Budget slider" aria-valuetext={`${inr(budget)}`} min={0} max={sliderMax} step={5000} value={Math.min(budget, sliderMax)} onChange={(e) => onBudget(Number(e.target.value))} className="mt-5 h-11 w-full" />
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button key={c.label} type="button" onClick={() => onBudget(c.value)} aria-pressed={budget === c.value} className={cx(btnQuiet, "num !min-h-11 !px-4", budget === c.value && "!border-foreground !bg-foreground !text-background")}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <fieldset className="min-w-0">
            <legend className="label mb-3">How to spend it</legend>
            <div className="space-y-3">
              {(
                [
                  ["risk_first", "Riskiest first", "Pay for issues in risk order until the money runs out. Anything left over goes to cheaper issues further down."],
                  ["most_risk", "Most risk covered", "Find the mix that removes the most total risk for this budget. It may skip one costly issue to pay for several cheaper ones."],
                ] as const
              ).map(([value, label, help]) => (
                <label key={value} className="flex min-h-12 cursor-pointer gap-3 rounded-2xl border border-line bg-card p-4 transition-colors duration-150 ease hover:bg-mist/60 has-[:checked]:border-sea has-[:checked]:bg-sea-soft">
                  <input type="radio" name="strategy" value={value} checked={strategy === value} onChange={() => onStrategy(value)} className="mt-0.5 size-5 shrink-0" />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-sm leading-snug text-muted">{help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCopy} className={btnQuiet}>
              Copy link to this plan
            </button>
            <button type="button" onClick={onCsv} className={btnQuiet}>
              Download as CSV
            </button>
            <span role="status" className="text-sm text-muted">
              {notice}
            </span>
          </div>
        </div>
      </section>
    </Card>
  );
}
