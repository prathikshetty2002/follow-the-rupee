/**
 * The Next Rupee Planner's logic: re-score issues for any set of weights, then decide which ones a budget can pay for.
 * Pure functions with no imports, so they can be tested on their own and run in the browser.
 *
 * Rules that match the pipeline (pipeline/src/pipeline/index.py and budget.py):
 *   score  = sum(weight * factor value) + a small tie-break for public concern, each factor value between 0 and 1
 *   fill   = go down the risk order and pay for each issue that still fits (skipping ones that do not)
 *   exact  = the combination with the highest total risk that fits the budget
 * Repairs on roads under warranty cost BMC nothing (cost 0), so every strategy pays for them.
 */

export const FACTORS = ["severity", "flood", "history", "traffic", "accidents", "facilities"] as const;
export type Factor = (typeof FACTORS)[number];
export type Weights = Record<Factor, number>;

/** The three questions behind the score, so the six factors are easy to explain. */
export const FAMILIES = [
  { key: "serious", label: "How serious is it", factors: ["severity"] as Factor[] },
  { key: "likely", label: "How likely is more trouble", factors: ["flood", "history"] as Factor[] },
  { key: "stakes", label: "What is at stake if it fails", factors: ["traffic", "accidents", "facilities"] as Factor[] },
] as const;

export type PlanItem = {
  id: string;
  baseRank: number; // the pipeline's rank, used only to break exact ties
  values: Record<Factor, number>; // 0 to 1
  tiebreak: number;
  cost: number; // rupees BMC pays (0 when the road is under warranty)
  costLow: number;
  costHigh: number;
  dlp: boolean;
};

export type Scored<T extends PlanItem> = T & { score: number; rank: number };

export function normaliseWeights(w: Weights): Weights {
  const total = FACTORS.reduce((s, f) => s + Math.max(w[f], 0), 0);
  if (total <= 0) return Object.fromEntries(FACTORS.map((f) => [f, 1 / FACTORS.length])) as Weights;
  return Object.fromEntries(FACTORS.map((f) => [f, Math.max(w[f], 0) / total])) as Weights;
}

/** Risk score from 0 to about 1 for one issue under these weights (weights are normalised first). */
export function scoreItem(item: PlanItem, weights: Weights): number {
  const w = normaliseWeights(weights);
  return FACTORS.reduce((s, f) => s + w[f] * item.values[f], 0) + item.tiebreak;
}

/** Points each factor adds to the 0-100 score, for the explanation bars. */
export function contributions(item: PlanItem, weights: Weights): Record<Factor, number> {
  const w = normaliseWeights(weights);
  return Object.fromEntries(FACTORS.map((f) => [f, w[f] * item.values[f] * 100])) as Record<Factor, number>;
}

/** Highest score first; exact ties keep the pipeline's order. */
export function rankItems<T extends PlanItem>(items: T[], weights: Weights): Scored<T>[] {
  return items
    .map((i) => ({ ...i, score: scoreItem(i, weights) }))
    .sort((a, b) => b.score - a.score || a.baseRank - b.baseRank)
    .map((i, k) => ({ ...i, rank: k + 1 }));
}

export type Strategy = "risk_first" | "most_risk";

export type Fill = {
  funded: Set<string>;
  spend: number; // typical cost of what is paid for
  spendLow: number;
  spendHigh: number;
  left: number; // budget left at typical costs
  riskCovered: number; // share of all open risk that is paid for, 0 to 1
  riskLeft: number; // total score not paid for, on the 0-100 scale
  /** For each unpaid issue: why it is not covered. */
  notCovered: Map<string, { needs: number; short: number; cheaperFundedAbove: boolean }>;
  /**
   * Riskiest-first only. Going down the ranking, the first issue that did not fit (its index), or null when everything fits.
   * Issues above it are paid in plain risk order; funded issues below it are paid from the money left over.
   */
  cutoff: number | null;
  /** Money left at the moment the cutoff issue came up. */
  leftAtCutoff: number;
  /** Funded issues below the cutoff: paid from what was left. */
  fromLeftover: Set<string>;
  /** Running spend after each issue, in ranking order (only grows at funded issues). */
  runningSpend: number[];
};

const UNIT = 100; // rupees per step in the exact solver

/** The exact best set: highest total score within the budget. Costs are rounded up to the next ₹100, so it never overspends. */
export function bestSet<T extends PlanItem>(ranked: Scored<T>[], budget: number): Set<string> {
  const free = ranked.filter((i) => i.cost <= 0).map((i) => i.id);
  const paid = ranked.filter((i) => i.cost > 0);
  const cap = Math.max(0, Math.floor(budget / UNIT));
  const costs = paid.map((i) => Math.ceil(i.cost / UNIT));
  const limit = Math.min(cap, costs.reduce((s, c) => s + c, 0));
  const best = new Float64Array(limit + 1);
  const take = paid.map(() => new Uint8Array(limit + 1));
  paid.forEach((item, k) => {
    for (let c = limit; c >= costs[k]; c--) {
      const candidate = best[c - costs[k]] + item.score;
      if (candidate > best[c] + 1e-12) {
        best[c] = candidate;
        take[k][c] = 1;
      }
    }
  });
  const chosen = new Set<string>(free);
  let c = limit;
  for (let k = paid.length - 1; k >= 0; k--) {
    if (take[k][c]) {
      chosen.add(paid[k].id);
      c -= costs[k];
    }
  }
  return chosen;
}

export function fillBudget<T extends PlanItem>(ranked: Scored<T>[], budget: number, strategy: Strategy): Fill {
  let funded: Set<string>;
  let cutoff: number | null = null;
  let leftAtCutoff = budget;
  const fromLeftover = new Set<string>();
  if (strategy === "most_risk") {
    funded = bestSet(ranked, budget);
  } else {
    funded = new Set();
    let left = budget;
    ranked.forEach((i, k) => {
      if (i.cost <= left) {
        funded.add(i.id);
        left -= i.cost;
        if (cutoff !== null) fromLeftover.add(i.id);
      } else if (cutoff === null) {
        cutoff = k;
        leftAtCutoff = left;
      }
    });
  }
  let running = 0;
  const runningSpend = ranked.map((i) => (running += funded.has(i.id) ? i.cost : 0));
  const sum = (key: "cost" | "costLow" | "costHigh") => ranked.filter((i) => funded.has(i.id)).reduce((s, i) => s + i[key], 0);
  const spend = sum("cost");
  const total = ranked.reduce((s, i) => s + i.score, 0);
  const covered = ranked.filter((i) => funded.has(i.id)).reduce((s, i) => s + i.score, 0);
  const left = budget - spend;
  const notCovered = new Map<string, { needs: number; short: number; cheaperFundedAbove: boolean }>();
  ranked.forEach((i, k) => {
    if (funded.has(i.id)) return;
    notCovered.set(i.id, { needs: i.cost, short: Math.max(i.cost - left, 0), cheaperFundedAbove: ranked.slice(k + 1).some((j) => funded.has(j.id)) });
  });
  return { funded, spend, spendLow: sum("costLow"), spendHigh: sum("costHigh"), left, riskCovered: total ? covered / total : 0, riskLeft: (total - covered) * 100, notCovered, cutoff, leftAtCutoff, fromLeftover, runningSpend };
}

/** Plain-English check that the weights are what the planner was tested with. */
export function sameWeights(a: Weights, b: Weights, tolerance = 0.005): boolean {
  const x = normaliseWeights(a);
  const y = normaliseWeights(b);
  return FACTORS.every((f) => Math.abs(x[f] - y[f]) <= tolerance);
}
