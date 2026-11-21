# Handoff log

Short notes between Prathik (data, models, pipeline) and Noel (dashboard). Newest first. Add an entry whenever you push
something the other person should know. After a pull, `SYNC_REPORT.md` lists the diffs; this file explains why.

Entry template:
```
## YYYY-MM-DD HH:MM, <name>, <branch>
**Changed:** one line on what and which files.
**Contract:** any change to shared/schema.md or types.ts (or "none").
**You need to:** what the other person must do, if anything (or "nothing").
**Status:** real / partial / stub, and what is still to come.
```

---

## 2026-11-21 13:24, Prathik, prathik/redesign
**Changed:** Full visual and UX redesign of the planner ("civic ledger"; direction and tokens in `brand.md`). Replaced the card-and-pill, serif and beige look, which read as generic AI output.
New: Public Sans + IBM Plex Mono, flat paper with hairline rules, one signal colour (vermilion) reserved for the budget line and short money, 2px corners, no pill badges, no hero tiles.
**New UX:** the plan is one **budget line** (every issue a segment, as wide as it costs, dark if paid, red line where the money runs out); a four-figure ledger header; a **ranked ledger** with a "Budget runs out here" row, running spend, risk and confidence;
each issue opens to a real **arithmetic table** (factor, standing, weight, points, total), the facts, the cost range, confidence and why it was not paid. The weighting picker is a table showing each weighting's backtest at the moment of choice.
New actions: copy a link to the plan, download the plan as CSV. Status is a glyph plus a word, never colour alone.
**Accessibility (WCAG 2.1 AA target):** all text pairs checked at 4.5:1 or better and control borders at 3:1 or better, in light and dark; visible 3px focus ring; 44px targets; one h1 and no skipped heading levels on any page;
labelled controls; tables with captions and scoped headers; live result announced after the user pauses; decorative map hidden from assistive tech (the table is the way in); no horizontal scroll at 320px with everything expanded; reduced motion honoured; skip link.
**Code:** `web/src/components/planner/` now has `controls`, `figures`, `budget-line`, `ledger`, `weights-panel`, `plan-map`, `csv`, `planner`; `lib/planner.ts` gained `cutoff`, `leftAtCutoff`, `fromLeftover`, `runningSpend` (tested). Removed `budget-panel`, `summary-panel`, `issue-row`, `skeletons`. No pipeline or data changes.
**You need to:** nothing is blocking. Checks: `cd web && npm test && npm run lint && npm run build`.

## 2026-11-21 13:06, Prathik, prathik/planner
**Changed:** Revamp. The site is now one tool, the **Next Rupee Planner**, and nothing else. Removed pages: audit, contractors, complaint lookup, work order, the old ward page.
Pages now: `/` (pick a ward: map and table), `/plan/[slug]` (the planner), `/method` (how it works, the backtest, limits). The pipeline still builds the other data; the site does not show it.
The planner (client side, `web/src/components/planner/`, logic in `web/src/lib/planner.ts`): type any budget; choose "riskiest first" or "most risk covered" (exact knapsack); change the weights live
(presets show their backtest accuracy); each issue expands to show its score breakdown, facts, method and cost range, confidence and why it was not covered. The plan is in the URL, so a link shares it.
**Pipeline:** `next_rupee.json` issues gained `factor_values`, `tiebreak`, `cost_range_inr`, `rank_range`, `confidence`, `confidence_notes`; new top-level `weight_presets` with a backtest per preset. See `shared/schema.md`. Run `uv run pipeline next-rupee` then `export`.
**You need to (Noel / UI help):** styling is deliberately plain and token-based (`web/src/app/globals.css`, `brand.md`). Components are small: `budget-panel`, `summary-panel`, `weights-panel`, `issue-row`, `plan-map`, `planner`. Restyle freely; keep the logic in `lib/planner.ts`.
**Checks:** `cd web && npm test` (7 planner tests incl. exact solver vs brute force), `npm run lint`, `npm run build`; `cd pipeline && uv run pytest` (49 tests).

## 2026-11-21 12:46, Prathik, prathik/dashboard
**Changed:** The dashboard is built (`web/`), since Noel is blocked and Prathik took the UI over. Pages: `/` overview with a ward map and key numbers,
`/ward/[slug]` (24 wards: summary, budget vs spend, how it held up vs expected, ranked next rupee with reasons, open-complaint map, billing flags, failed fixes, contractors),
`/contractors` and `/contractors/[id]` (scorecards with evidence), `/audit` (filters by type, severity, contractor, ward), `/work-order/[id]` (evidence page),
`/complaint` ("what happened to my complaint?"), `/method` (how it works, backtest, limits). Look: civic ledger palette in `brand.md`, Fraunces + Geist, light and dark.
**Contract:** none changed. The app only reads `web/public/data` through `web/src/lib/data.ts`. New: `lib/format.ts` (₹ formatting and labels), `lib/map.ts` (SVG map from the GeoJSON),
`components/`. Dependencies added: `d3-geo`, `lucide-react` (unused so far), `@types/d3-geo`. `.claude/launch.json` lets Claude start the dev server.
**You need to (Noel):** if you have UI work on your machine, do not push it to `main`. Rebase it onto `dev` (`git pull origin dev`), keep it small and in separate files where you can, and open a PR into `dev`;
`scripts/sync.sh` will flag overlaps. Good places to help: polish copy, add a ward search box, Hindi and Marathi labels, a printable one-page ward summary.
**Status:** verified in the browser at desktop and 375px, light and dark, no horizontal overflow; `npm run lint` and `npm run build` pass (43 pages, ward and contractor pages prerendered).
Known gaps: no automated UI tests; the map is SVG without zoom; Claude text is static (generated by the pipeline), nothing calls the API at view time.

## 2026-11-21 12:18, Prathik, prathik/data-models
**Changed:** Dashboard-ready views, so pages can load small files and evidence links resolve. `uv run pipeline export` (also the last step of `all`).
New in `web/public/data/`: `manifest.json` (start here), `work_orders.json`, `complaint_to_issue.json`, `by_ward/<slug>.json` (24 files),
`geo/wards.geojson`, `geo/roads.geojson`, `geo/open_issues.geojson`. `meta.json` is now real (`stub: false`; it said `true` before, so the
placeholder page showed "STUB DATA"). Code: `pipeline/src/pipeline/export.py`; 8 integrity tests in `tests/test_outputs.py` (45 tests total).
**Contract:** Additive. `Issue.plan_issue_id` (for never-fixed issues: their id in `next_rupee.json`, so you can join a trail issue to its rank, score and reasons).
New types `WorkOrder`, `WardBundle`, `Manifest`, `WardFeatureProps`, `OpenIssuePointProps`; `Meta` gained optional `text_sources`, `counts`.
New readers in `web/src/lib/data.ts`: `getManifest`, `getWorkOrders`, `getWorkOrdersById(ids)`, `getComplaintLookup`, `getWardBundle(code)`, `wardSlug(code)`.
Large files (`issues`, `flags`, `next_rupee`, `work_orders`) are now compact JSON (no indentation), so they are not readable in an editor; use the manifest or the types.
**You need to:** nothing is blocking. A ward page can be built from `getWardBundle(code)` alone (ward summary, ranked plan, flags with reasons, issues with trails, contractors).
`flags[].evidence_work_order_ids` resolve through `getWorkOrdersById`. A choropleth map reads `geo/wards.geojson` with no join; ranked open issues are
points in `geo/open_issues.geojson`. See the "Dashboard views" table in `shared/schema.md`.
**Status:** all data files real; 45 tests pass.

## 2026-11-21 12:02, Prathik, prathik/data-models
**Changed:** Every data file is now real. Claude-written text is live (key added): 8 scorecards and 24 ward summaries, each checked
(length, only supplied numbers including spelled-out ones, no accusatory words). New: the complaint trail. `uv run pipeline all` rebuilds everything.
Files: `web/public/data/` `issues.json` (3,529 issues), `issues_summary.json`, `wards.json` (real `summary`), `contractors.json` (Claude text).
Code: `pipeline/src/pipeline/trail.py`, `wards.py`; tests grew to 37.
**Contract:** Additive, except one new enum value. `Issue.status` gains `"not_bmc_scope"` (rejected or forwarded complaints, 486 issues): handle it in any
`switch` on status. `Issue` gains `trail`, `work_order`, `road_*`, `channels`, `languages`, `disposition`; new types `IssuesSummary`, `IssueStatus`;
`Ward` gains optional `summary_source`, `remaining_budget_inr`, `over_budget`, `adjusted`, `billing_flagged_*`; reader `getIssuesSummary()`. See `shared/schema.md`.
**You need to:** nothing is blocking. Ideas: (1) a "what happened to my complaint?" view: search by complaint id or locality and show `trail` plus the
`work_order` details; (2) a money-trail view per ward: issues by `status`, with `spend_on_failed_inr` from `issues_summary.json`; (3) the ward page header can use
`summary` as is. `trail` is one finished sentence, safe to show to citizens. `issues.json` is 3 MB, so read it on the server and send only what a page needs.
**Status:** all data files real. Next from Prathik: tidy and checks; open to requests for any field the dashboard needs.

## 2026-11-21 11:45, Prathik, prathik/data-models
**Changed:** Contractor scorecards are real. `uv run pipeline scorecards` writes `web/public/data/contractors.json` (8 contractors, best first).
Code: `pipeline/src/pipeline/scorecard.py` and `narrate.py`, tests in `pipeline/tests/test_scorecard.py`.
**Contract:** Additive. `Contractor` gained optional fields (`rank`, `scores`, `adjusted`, `context`, `billing`, `evidence`, `city`, `scorecard_source`);
new type `Verdict`. Fields and the scoring rules are in `shared/schema.md`.
**You need to:** nothing is blocking. Suggested UI: a card per contractor with the grade, `scorecard_text`, and the three `scores`;
show the raw rate next to `city` and `adjusted.*_expected_rate` so readers see what "expected" means; link `evidence_work_order_ids`
to the work orders. `adjusted.speed_verdict` / `durability_verdict` say "in line with expectations" when a gap is within normal
variation: show that wording rather than ranking those contractors against each other. Grade C means about as expected.
**Status:** `scorecard_text` is currently a template (`scorecard_source: "template"`) because no Anthropic API key is set yet.
Once Prathik adds one and reruns, the same field holds Claude-written text; it is checked (under 120 words, only supplied numbers,
no accusatory words) and falls back to the template if a draft fails. Still stubs: `issues.json`; `wards.json` `summary`.

## 2026-11-21 11:39, Prathik, prathik/data-models
**Changed:** Audit flags are real. `uv run pipeline audit` writes `web/public/data/flags.json` (1,746 flags) and a new `audit_summary.json`.
Code: `pipeline/src/pipeline/audit.py`, tests in `pipeline/tests/test_audit.py`.
**Contract:** Additive. `Flag` gained optional fields (`kind`, `contractor_name`, `work_type`, `repair_method`, `cost_inr`, `details`);
new types `AuditSummary`, `AuditBlock`, `FlagCounts` and reader `getAuditSummary()`. Rules per flag type are in `shared/schema.md`.
**You need to:** nothing is blocking. Suggested use: show **billing** flags (`kind: "billing"`) as the main audit view: over-billed 111,
double-billed 45, paid on DLP roads 493, about ₹3.8 cr across 622 work orders (each counted once in `audit_summary.json`).
Treat **performance** flags (`sla_missed`, `reopened`) as context, filterable by `severity`. Every flag's `evidence_work_order_ids`
should link to the work orders behind it, and `reason` is one plain-language line ready to display.
**Status:** `flags.json` and `audit_summary.json` real. `contractors.json` and `issues.json` still stubs; scorecards are next
and will use the audit numbers.

## 2026-11-21 12:00, Prathik, main
**Changed:** First real model output. The pipeline now ranks open complaints for the next rupee, per ward, and backtests the ranking.
Files: `pipeline/` (code), `web/public/data/next_rupee.json`, `validation.json`, `wards.json` (`next_rupee` and `risk_score` are now real).
**Contract:** Additive only, in `shared/schema.md` and `web/src/lib/types.ts`. `NextRupee` gained optional fields and `road_id` can be `null`.
New types: `NextRupeeFile`, `NextRupeeWard`, `NextRupeeIssue`, `Validation`. New readers in `web/src/lib/data.ts`: `getNextRupee()`, `getValidation()`.
**You need to:** nothing is blocking. To show the plan, read `next_rupee.json` (`wards[].issues[]` is ranked, best first).
Useful fields per issue: `priority_score` (0-100), `factors` (points that add up to the score), `reasons` (plain language),
`funded` (fits the ward's remaining budget), `dlp` (original contractor repairs at no cost), `recommended_method`,
`recommended_contractors`, `complaint_ids`. Over-budget wards have a `banner` to show.
`validation.json` has the backtest for a methods slide.
**Status per data file:**

| File | State |
|---|---|
| `next_rupee.json`, `validation.json` | real |
| `wards.json` | real (Claude-written `summary`) |
| `contractors.json` | real (Claude-written text) |
| `flags.json`, `audit_summary.json` | real |
| `issues.json`, `issues_summary.json` | real |

All data files are real now; the shapes did not change, so UI built on the stubs keeps working.
