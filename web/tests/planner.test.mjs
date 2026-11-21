import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FACTORS, bestSet, contributions, fillBudget, normaliseWeights, rankItems, sameWeights, scoreItem } from "../src/lib/planner.ts";

const data = JSON.parse(readFileSync(new URL("../public/data/next_rupee.json", import.meta.url), "utf8"));
const weights = data.weights;
const toItem = (i) => ({ id: i.issue_id, baseRank: i.rank, values: i.factor_values, tiebreak: i.tiebreak, cost: i.cost_to_bmc_inr, costLow: i.cost_range_inr[0], costHigh: i.cost_range_inr[1], dlp: i.dlp });
const wards = data.wards.map((w) => ({ code: w.ward_code, raw: w.issues, items: w.issues.map(toItem) }));

test("re-scoring with the pipeline weights reproduces its scores and ranking", () => {
  let moved = 0;
  let total = 0;
  for (const w of wards) {
    const ranked = rankItems(w.items, weights);
    const byId = new Map(w.raw.map((i) => [i.issue_id, i]));
    for (const r of ranked) {
      const pipe = byId.get(r.id);
      assert.ok(Math.abs(r.score * 100 - pipe.priority_score) < 0.06, `${r.id}: ${r.score * 100} vs ${pipe.priority_score}`);
      total++;
      if (r.rank !== pipe.rank) moved++;
    }
  }
  assert.ok(moved / total < 0.01, `${moved} of ${total} issues changed rank (only near-ties may)`);
});

test("weights are normalised, and all-zero weights fall back to equal", () => {
  const n = normaliseWeights({ severity: 3, flood: 1, history: 0, traffic: 0, accidents: 0, facilities: 0 });
  assert.equal(n.severity, 0.75);
  assert.equal(n.flood, 0.25);
  const eq = normaliseWeights(Object.fromEntries(FACTORS.map((f) => [f, 0])));
  assert.ok(FACTORS.every((f) => Math.abs(eq[f] - 1 / 6) < 1e-9));
  assert.ok(sameWeights(weights, Object.fromEntries(FACTORS.map((f) => [f, weights[f] * 10]))));
});

test("contributions add up to the score", () => {
  const item = wards[0].items[0];
  const sum = Object.values(contributions(item, weights)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum + item.tiebreak * 100 - scoreItem(item, weights) * 100) < 1e-9);
});

test("a budget fill never overspends and always pays for free (warranty) repairs", () => {
  for (const w of wards) {
    const ranked = rankItems(w.items, weights);
    const need = ranked.reduce((s, i) => s + i.cost, 0);
    for (const budget of [0, 10_000, 100_000, need / 2, need, need * 2]) {
      for (const strategy of ["risk_first", "most_risk"]) {
        const f = fillBudget(ranked, budget, strategy);
        assert.ok(f.spend <= budget, `${w.code} ${strategy} spent ${f.spend} of ${budget}`);
        for (const i of ranked.filter((x) => x.cost === 0)) assert.ok(f.funded.has(i.id), `${w.code}: free repair ${i.id} must be funded`);
        assert.ok(f.riskCovered >= 0 && f.riskCovered <= 1);
      }
    }
  }
});

test("risk-first pays for the riskiest affordable issues; with enough money everything is paid", () => {
  const ranked = rankItems(wards[3].items, weights);
  const need = ranked.reduce((s, i) => s + i.cost, 0);
  const all = fillBudget(ranked, need, "risk_first");
  assert.equal(all.funded.size, ranked.length);
  assert.equal(all.riskCovered, 1);
  const top = ranked.find((i) => i.cost > 0);
  const tight = fillBudget(ranked, top.cost, "risk_first");
  assert.ok(tight.funded.has(top.id) || ranked.slice(0, top.rank - 1).every((i) => tight.funded.has(i.id) || i.cost > top.cost));
});

test("the exact solver matches brute force and is never worse than risk-first", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let trial = 0; trial < 60; trial++) {
    const n = 4 + Math.floor(rnd() * 8);
    const items = Array.from({ length: n }, (_, k) => ({ id: `i${k}`, baseRank: k, values: Object.fromEntries(FACTORS.map((f) => [f, rnd()])), tiebreak: 0, cost: rnd() < 0.15 ? 0 : Math.round(rnd() * 90) * 1000 + 1000, costLow: 0, costHigh: 0, dlp: false }));
    const ranked = rankItems(items, weights);
    const budget = Math.round(rnd() * 200) * 1000;
    let best = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let c = 0;
      let s = 0;
      ranked.forEach((i, k) => {
        if (mask & (1 << k)) {
          c += i.cost;
          s += i.score;
        }
      });
      if (c <= budget && s > best) best = s;
    }
    const chosen = bestSet(ranked, budget);
    const got = ranked.filter((i) => chosen.has(i.id)).reduce((s, i) => s + i.score, 0);
    assert.ok(Math.abs(got - best) < 1e-9, `trial ${trial}: solver ${got} vs brute force ${best}`);
    const greedy = fillBudget(ranked, budget, "risk_first");
    const greedyScore = ranked.filter((i) => greedy.funded.has(i.id)).reduce((s, i) => s + i.score, 0);
    assert.ok(got >= greedyScore - 1e-9);
  }
});

test("explains why an issue is not covered", () => {
  const ranked = rankItems(wards[0].items, weights);
  const f = fillBudget(ranked, 0, "risk_first");
  const first = ranked.find((i) => i.cost > 0);
  const why = f.notCovered.get(first.id);
  assert.equal(why.short, first.cost);
  assert.equal(why.needs, first.cost);
});

test("riskiest-first has a clean cutoff: everything above it is paid, the rest only from leftovers", () => {
  for (const w of wards) {
    const ranked = rankItems(w.items, weights);
    const need = ranked.reduce((s, i) => s + i.cost, 0);
    for (const budget of [0, need / 4, need / 2, need]) {
      const f = fillBudget(ranked, budget, "risk_first");
      if (f.cutoff === null) {
        assert.equal(f.funded.size, ranked.length);
        assert.equal(f.fromLeftover.size, 0);
        continue;
      }
      ranked.slice(0, f.cutoff).forEach((i) => assert.ok(f.funded.has(i.id), `${w.code}: ${i.id} is above the cutoff so must be paid`));
      assert.ok(!f.funded.has(ranked[f.cutoff].id), "the cutoff issue itself did not fit");
      assert.ok(ranked[f.cutoff].cost > f.leftAtCutoff);
      for (const id of f.fromLeftover) assert.ok(ranked.findIndex((i) => i.id === id) > f.cutoff);
      assert.ok(f.runningSpend.at(-1) === f.spend);
    }
  }
});
