"use client";

import { inr, inrShort } from "@/lib/format";
import type { Strategy } from "@/lib/planner";
import { cx } from "../ui";

const group = new Intl.NumberFormat("en-IN");

export function BudgetPanel({
  budget,
  onBudget,
  strategy,
  onStrategy,
  defaultBudget,
  need,
}: {
  budget: number;
  onBudget: (n: number) => void;
  strategy: Strategy;
  onStrategy: (s: Strategy) => void;
  defaultBudget: number;
  need: number;
}) {
  const sliderMax = Math.max(Math.ceil((need * 1.1) / 10_000) * 10_000, 100_000);
  const chips = [
    { label: `Budget left: ${inrShort(defaultBudget)}`, value: defaultBudget },
    { label: "₹5 L", value: 500_000 },
    { label: "₹10 L", value: 1_000_000 },
    { label: `Everything: ${inrShort(need)}`, value: Math.ceil(need / 100) * 100 },
  ];
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="budget" className="mb-1.5 block text-sm font-medium">
          Budget to spend
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            ₹
          </span>
          <input
            id="budget"
            inputMode="numeric"
            autoComplete="off"
            value={group.format(budget)}
            onChange={(e) => onBudget(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="num min-h-11 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-lg"
          />
        </div>
        <input
          type="range"
          aria-label="Budget slider"
          min={0}
          max={sliderMax}
          step={5000}
          value={Math.min(budget, sliderMax)}
          onChange={(e) => onBudget(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--accent)]"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onBudget(c.value)}
              aria-pressed={budget === c.value}
              className={cx("min-h-10 rounded-lg border px-3 text-sm transition-colors", budget === c.value ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-2")}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">The ward&apos;s season budget minus what it has already spent is {inr(defaultBudget)}.</p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">How to spend it</legend>
        <div className="space-y-2">
          {(
            [
              ["risk_first", "Riskiest first", "Go down the risk order and pay for each issue that still fits."],
              ["most_risk", "Most risk covered", "Find the mix that removes the most total risk for this budget. It may skip a costly top issue to pay for several cheaper ones."],
            ] as const
          ).map(([value, label, help]) => (
            <label key={value} className={cx("flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors", strategy === value ? "border-foreground bg-surface-2" : "border-border bg-surface hover:bg-surface-2")}>
              <input type="radio" name="strategy" value={value} checked={strategy === value} onChange={() => onStrategy(value)} className="mt-1 accent-[var(--accent)]" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs leading-snug text-muted">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
