# Continue here: project context for a fresh Claude Code session

Written 2026-11-21 so the work can continue in Claude Code on **Anthropic Console credits** after the subscription limit is hit.
`CLAUDE.md` (rules, ownership, git workflow) and `HANDOFF.md` (dated change log) load automatically; this file is the short version of everything else.

## 1. Switch to Console credits (2 minutes)
1. Open a terminal in the repo: `cd claude_lab_hackathon`.
2. In Claude Code run `/login` and choose the **Anthropic Console account** option (API usage billing), or start it with an API key from the Console: `export ANTHROPIC_API_KEY=...` then `claude`. Never paste a key into chat or commit it.
3. Credits are pay-per-token, so stretch them: `/model` and pick **Sonnet 5.5** for routine work, Opus 5.5 only for hard design or debugging.
4. Paste the **resume prompt** at the bottom of this file.

`pipeline/.env` (git-ignored) holds a separate key, `ANTHROPIC_API_KEY`, used by the data pipeline to write scorecard and ward text. It is only needed to regenerate that text; the committed JSON already contains it.

## 2. What this is
Hackathon: **Claude Impact Lab Mumbai, 21 Nov 2026**, brief "Follow the Rupee" (`docs/CHALLENGE.md`, data dictionary and rubric in `docs/`). All data is synthetic.
**Scope:** the **Next Rupee Planner** (use case 4) is the hero: given a ward's remaining road-repair budget, recommend what to fix first, ranked by risk, with **precision and transparency**. Since 16:00 (team decision, on `main`) the `/audit`, `/contractors` and `/complaints` pages are back as the evidence behind it, cross-linked from the planner; keep them. The site is light mode only. Rubric weights: audit accuracy 25%, fair accountability 20%, budget recommendation 20%, connecting the trail 15%, usability 10%, demo 10%.
Team: Prathik (owns pipeline and now the web app). Noel (`technoelogy`) was blocked and has pushed nothing; his work should come as a PR into `dev`.

## 3. Where things stand
- Repo: `https://github.com/prathikshetty2002/follow-the-rupee` (public). Branches: `main` (what judges see), `dev` (integration), `prathik/*` feature branches, `noel/dashboard` (empty).
- **`dev` has everything and is the branch to continue from.** `main` is about 10 commits behind: it has the data, audit flags and scorecards but **not the planner, the redesign or the Mumbai theme**. Merging `dev` into `main` is pending Prathik's say-so (`git switch main && git merge --no-ff dev && git push`, after the checks below).
- Latest work: the planner revamp, a "civic ledger" redesign (kept in git history), the **Mumbai dawn theme** (Axion Dribbble shot), then the **map dashboard** home page (Raktor Dribbble shot: click a ward to fly to it and open its summary and planner link), then restyled back into Mumbai dawn with a Churchgate station hero illustration and a 3D mode (branch `prathik/map-3d`), then map search, tighter auto-fit and a rebuilt 3D (branch `prathik/map-search`), then a light/dark toggle and the BMC head office hero (branch `prathik/theme-toggle`), then light as default, a desktop-fit layout, a livelier hero and the Guide (branch `prathik/guide-bigger`). All checks pass: web 13 tests, pipeline 49 tests, lint, build.
- Not done: the **demo script and 3-minute walkthrough and submission text** (10% of the score), a Vercel deploy, a visual check at full desktop width (the browser pane here is small).
- `docs/PLAN.md` is an early hour-by-hour plan, untracked and out of date. Ignore or delete it. `SYNC_REPORT.md` is generated and git-ignored.

## 4. Map of the code
```
data/            synthetic CSV/GeoJSON inputs (read-only)
pipeline/        Python (uv). `uv run pipeline all` rebuilds every output; steps: audit, next-rupee, scorecards, trail, wards, export
  src/pipeline/  config.py (ALL weights and thresholds), issues.py (complaints -> open issues), roads.py, index.py (risk score),
                 budget.py (methods, fill, knapsack), backtest.py (Jun-Jul -> Aug-Sep backtest, rank ranges, weight presets),
                 nextrupee.py (writes next_rupee.json), audit.py, scorecard.py, narrate.py (guarded Claude text), trail.py, wards.py, export.py
  tests/         49 tests, including integrity checks on the JSON the web app reads
web/             Next.js 16 (Cache Components), Tailwind v4. Reads web/public/data/*.json on the server
  src/app/       page.tsx (home: BMC head office hero, interactive map, stats, ward table), plan/[slug]/page.tsx (the planner), method/page.tsx, layout.tsx, globals.css (all tokens)
  src/components/stage/    ward-stage.tsx (the map: flat or 3D, camera, ward cards, summary card), types.ts; lib/view.ts is its tested camera maths; components/bmc-office.tsx is the hero illustration, components/theme-toggle.tsx the light/dark button, components/guide.tsx the Mumbaiya site guide (STOPS)
  src/components/planner/  planner.tsx (state in the URL), controls, figures, budget-line, ledger (rows + score arithmetic), weights-panel, plan-map, csv
  src/lib/       planner.ts (re-score, fill, exact knapsack: pure, tested), data.ts (server JSON readers), types.ts, format.ts, factors.ts, map.ts
  tests/planner.test.mjs   run with `npm test` (Node's test runner)
shared/schema.md the JSON contract. brand.md the design brief and tokens. research_notes/, reports/  the model-selection research
```

## 5. Commands
```bash
cd pipeline && uv run pytest -q && uv run pipeline all          # all outputs (Claude text is reused; add --no-claude to skip the API)
cd web && npm test && npm run lint && npm run build             # must all pass before merging to dev
cd web && npm run dev                                           # http://localhost:3000, try /plan/F-N
bash scripts/setup-collab.sh                                    # once per clone: post-merge sync report hook, merge-not-rebase
```
Git: work on a `prathik/<topic>` branch, merge into `dev` with `--no-ff`, push. Never force-push `dev` or `main`. Author identity is set locally in this repo; `Co-Authored-By` trailers are used on commits.

## 6. Facts and decisions worth remembering
- **Data:** 2,499 work orders (₹13.4 cr), 6,501 complaints -> 3,529 issues -> **589 open issues** to rank, 24 wards. Planner "need" totals about ₹1.95 cr against ₹1.77 cr budget left; 6 wards are already over budget (L, E, R/C, M/W, A, R/S).
- **Ranking is a transparent weighted score, not ML** (see `reports/Next rupee model selection.md`): severity 30, flood 25, history 15, traffic 10, accidents 10, facilities 10, each scaled 0 to 1. Reason: the only learnable signal in the data is contractor and repair method, location risk factors do not predict failures, and the answer key is most likely a formula. Seriousness cannot be backtested; it is a stated judgement.
- **Backtest** (train before 1 Aug, test Aug-Sep): default weighting is about as good as past work-order counts city-wide and slightly better within a ward; equal weights and "brief-literal" are clearly worse; city-wide uncertainty is about plus or minus 0.08. Each weighting preset's backtest is shown at the moment of choice.
- **Per-issue precision aids:** exact re-scoring in the browser from raw `factor_values`, cost ranges (middle half of normal jobs), rank range under 1,000 weight perturbations, a confidence level (road matched by GPS about 87% right, by name about 54%, by locality about 32%, plus rank stability and complaint count; mix is 139 high, 351 medium, 99 "check on site").
- **Budget logic:** "riskiest first" pays in rank order until the first issue that does not fit (the budget line), then fills leftover with cheaper issues; "most risk covered" is an exact knapsack. Warranty (DLP) roads cost BMC nothing. Both are tested (solver checked against brute force).
- **Audit and scorecards** (not on the site): billing flags use a 1.4x rate-card threshold, unlinked repeat jobs within 7 days, DLP-paid; scorecards compare each contractor with what is expected for the same work, and Claude-written text is checked for length, supplied numbers (including spelled-out ones) and tone, with a template fallback.

## 7. Gotchas
- The dev server can serve a stale stylesheet after a branch switch (symptoms: black or unstyled page, old colours). Stop it, `rm -rf web/.next`, start it again.
- **Next.js 16 is not the Next.js in your training data.** Read `web/node_modules/next/dist/docs/` before using APIs (`web/AGENTS.md` says so). With Cache Components: `await params` and `useSearchParams` must sit under `<Suspense>`; `dynamicParams` is rejected; the JSON reader uses `"use cache"`; rebuild or restart dev after the pipeline rewrites JSON.
- The map stage keeps its camera in React state (`camera` null means follow the selected ward) and its selection in the URL `?ward=<slug>`; animations use requestAnimationFrame (lint forbids `performance.now()` in components, use the rAF timestamp). Pan starts only after 6px of movement so ward clicks still work.
- Plan state (budget, strategy, weighting preset) lives in the URL via `window.history.replaceState` and `useSearchParams`, not in an effect. Do not add setState-in-effect (the lint rule blocks it).
- GeoJSON polygons wind the opposite way to what d3-geo expects; `lib/map.ts` flips them. Do not remove that.
- Fieldsets need `min-width: 0` or wide tables overflow on phones (set globally).
- Contrast is computed, not eyeballed: any new colour pair needs 4.5:1 text, 3:1 large text and control borders. Status is always a shape plus a word.
- The built-in browser pane is small: use viewport emulation plus the `zoom` screenshot action; screenshots after scrolling can crop.
- Never commit `pipeline/.env`, never print keys. Check the staged diff for key-like strings before each commit (grep for the key prefix); none has ever been committed.

## 8. Suggested next steps (in order)
1. Prathik reviews the site (`npm run dev`: the map at `/`, `/?ward=F-N`, then `/plan/F-N`, `/plan/L?budget=500000`); adjust the look or copy. Map ideas not done: a real photo for the hero (the user chose an illustration; a CC-licensed Wikimedia photo would need their OK to download), a check on a real phone. For screenshots the in-app browser pane is small; headless Chrome driven over the DevTools protocol works well (see how the pane was used in this session: `google-chrome-stable --headless=new --remote-debugging-port=...`).
2. Merge `dev` into `main` once happy, so judges see the planner. Deploy `web/` to Vercel from `main`.
3. Write the **3-minute demo script** and submission text (write it to `docs/DEMO.md`): problem, the budget line, riskiest-first vs most-risk, open an issue to show the arithmetic, change the weights and show the backtest, confidence and limits, how Claude is used (guarded text, research).
4. Precision ideas if time allows: improve road placement for non-GPS complaints; revisit the paver severity (1.4/5 pushes all paver issues to the bottom); tune presets; add a per-ward "what changed if budget +10%" note.
5. Optional: invite Noel to help with UI via a PR into `dev`.

## 9. How Prathik likes to work
Short plain answers; decisions made for them when one option is clearly better; precise, transparent and honest about limits over impressive; no sprawl (they asked to cut the site to one use case); they will give UI direction and reference designs; always ask before merging to `main`; check their request literally (they asked for a design inspired by a Dribbble link, so open it and look).

## Resume prompt (paste this into the new session)
```
Read CONTINUE.md, CLAUDE.md and HANDOFF.md in this repo. We are building the Next Rupee Planner for the Claude Impact Lab Mumbai hackathon.
Switch to the dev branch and run the checks in CONTINUE.md section 5 to confirm everything passes.
Then continue with the next steps in section 8, starting with: <say which one, or "ask me what to do first">.
Use Sonnet 5.5 for routine work. Ask before merging to main.
```
