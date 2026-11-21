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

## 2026-11-21 17:50, Noel, noel/dashboard-claude
**Changed:** (1) `guide.tsx` `STOPS`: Mumbai Central opens `/audit?ward=F%2FN` (was `/audit`) and Dadar opens `/complaints?issue=ISS-1794` (was ISS-0001, which is ward F/S), so a Guide tour stays in ward F/N from map to audit to complaint trail. Two string literals, nothing else in the code. (2) A 93 s ward F/N story video (AI voiceover, driven through the Guide) is recorded for LinkedIn. It lives outside the repo (13.8 MB); `docs/walkthrough.mp4` stays the site tour. The LinkedIn post and thumbnail are drafted, not posted. (3) Already on `dev` and `main` at a5d6822, not noted before: hero problem line reworded and set in serif regular; the repeated "Pick a ward" title in the map panel is `sr-only`.
**Contract:** none.
**You need to:** (1) Merge this branch into `dev`; it is up to date with `dev` at eb0f712, so it fast-forwards. Until then the live Guide still opens ISS-0001 and an unfiltered audit, which does not match the video. (2) Add `rupeespeaks.vercel.app` to the README (it has no live URL yet). The same URL goes in the LinkedIn first comment. (3) Event name: our docs say "Claude Impact Lab Mumbai", the post says "Claude Code Impact Lab". Check the event page and fix whichever is wrong.
**Status:** real. tsc, lint and 13 tests pass on the merged branch. The full build was not run in my sandbox (no Google Fonts access), but this `guide.tsx` change was built and clicked through while recording the video. Figures in the video and post, all from `web/public/data`: F/N budget ₹1.05 cr, spent ₹94.1 L, left ₹10.9 L; 39 open issues, 25 funded for ₹10.8 L of ₹14.0 L need; rank 1 is OI-0293 (Eastern Express Highway, Sion, ₹62,400), the same issue as ISS-1794; audit F/N has 44 of 150 jobs billing-flagged (₹32.4 L) and 37 reopened within 30 days (₹21.3 L, `by_type.reopened.amount_at_risk_inr` in `audit_summary.json`).

## 2026-11-21 16:10, Noel, noel/dashboard-claude
**Changed:** Team decision (Noel, 16:00): the Planner stays the hero and the audit, contractor and complaint-trail pages stay on the site as the evidence behind it (the brief asks for connect, audit, hold to account and budget; the rubric scores them). New: `/audit`, `/contractors`, `/complaints`, cross-links from the planner to each and back, the non-modal guided tour (`guide.tsx`), logo, light mode only, hero fit, README with demo video (`docs/demo.mp4`, `docs/img/`), `next.config.ts` file-tracing include so Vercel ships `public/data`.
**Contract:** none. Added readers to `web/src/lib/data.ts` (getFlags, getIssues, getAuditSummary, getIssuesSummary, getWorkOrders, getComplaintLookup, getWorkOrdersById) and helpers to `format.ts`.
**You need to:** update the **Scope** line in `CLAUDE.md` (it still says "do not add pages for audit, contractors or complaint lookup"), so a fresh session does not delete these pages. Deploy to Vercel with Root Directory `web`.
**Status:** real. Lint, build and 13 tests pass.


---

## 2026-11-21 17:45, Prathik, prathik/mobile
**Changed:** Mobile and tablet pass. No page scrolls sideways at 320, 360, 375, 390, 768, 1024, 1280 or 1440 px (checked every page). (1) **Header:** below 768 px the five links become a **Menu** button (shows the current page) with a drop-down list; the pill row is unchanged on wider screens. The old scrolling pill row was 465 px wide and made phones zoom out. (2) **Hero picture** is drawn larger on phones and tablets (the building fills the width; the sides are cropped), full scene from 1024 px. (3) **Map controls** use the stacked layout (layers, tabs, search on separate rows) below 1024 px, and the one-row layout with the summary card on the right from 1024 px; layer labels hide between 1024 and 1280 so nothing wraps. (4) **Tables:** the method factor table and the contractor "against what is expected" table now fit a phone (help text moves under the factor name); wide tables that still scroll say "Swipe the table sideways to see every column" on phones. (5) Audit ward filter and the complaint search box and button go full width on phones. (6) The guide's collapsed bar sits at the right on phones instead of spanning the screen.
**You need to:** nothing. Checks: web 13 tests, lint, build pass.

## 2026-11-21 16:35, Prathik, prathik/hero-motion
**Changed:** (1) The hero picture **keeps moving even when the system asks for reduced motion** (the global reduced-motion rule was switching it off; `[data-hero] .ch-*` now overrides it). To stay accessible it has a **Pause the animation** button (top left of the hero, `components/motion-toggle.tsx`) that stops and resumes it. (2) The **guide opens by itself for first-time visitors** on the home page, about 1.4 seconds after load, once (`guide-seen` in localStorage; not on deep links with a query like `?ward=`); a "Chalo, shuru karein" button closes it. To see it again, clear that key.
**You need to:** nothing. Checks: web 13 tests, lint, build pass; verified in headless Chrome with reduced motion emulated.

## 2026-11-21 16:10, Prathik, prathik/guide-bigger
**Changed:** (1) **Light is the default**: the system dark setting is ignored; dark applies only after the visitor presses the toggle (`data-theme="dark"`, remembered). (2) **Desktop fit**: the page container is wider (`max-w-[90rem]`; the planner and method pages keep a `max-w-6xl` column), the hero fills the first screen on large displays (headline on one line, building illustration fills the rest, scene extended sideways so it never crops the crown), the map stage fills the viewport height (max 62rem), and the three stat cards are larger. (3) **Livelier hero illustration**: clouds drift in 9s (was 26s), the sun breathes in 3s, the BEST bus and two taxis now drive across the road in a loop, a flock of birds crosses the sky, the flag flutters and the lamp glows flicker (all off with reduced motion). (4) **Guide**: a Guide button (bottom right, every page) opens a dialog, "Site ka guide", told as a ride down the Western line (Churchgate to Dadar, six stops) in Mumbaiya Hinglish with a plain English line under each tag; each stop can take you there (map, ward F/N, planner, method page). A first-visit nudge says "Pehli baar aaye ho? Guide dekh lo." until the guide is opened once (`localStorage` key `guide-seen`). Copy lives in `components/guide.tsx` (`STOPS`).
**You need to:** nothing. Checks: web 13 tests, lint, build pass; headless Chrome at 1440x900, 1280x720 and 1920x1080. If the dev server shows old styles after a branch switch, delete `web/.next` and restart it.

## 2026-11-21 15:40, Prathik, prathik/theme-toggle
**Changed:** (1) A **light / dark toggle** in the header (sun or moon button, next to the nav). It follows the system until the visitor chooses, then remembers the choice in this browser (`localStorage` key `theme`, set as `data-theme` on `<html>`; a tiny inline script in `layout.tsx` applies it before first paint so there is no flash). The dark tokens in `globals.css` now exist twice (system dark, and `data-theme="dark"`): change both together. (2) The hero illustration is now the **BMC head office** (Victorian Gothic front with clock tower, pointed crown, turrets, banded stone, the statue, gulmohar trees, a BEST bus and kaali-peeli taxis) in `components/bmc-office.tsx`, replacing the Churchgate one. The picture now sits under the hero text instead of behind it, so the tower never crosses the headline.
**You need to:** nothing. Checks: web 13 tests, lint, build pass; looked at in headless Chrome, light and dark, 1280 and 390 wide.

## 2026-11-21 15:10, Prathik, prathik/map-search
**Changed:** (1) **Search** in the map: a combobox top-left finds wards (code, area name, zone) and roads (name); choosing a result flies to its ward, and a road result also highlights that road (a note in the summary card says so). Arrow keys, Enter and Escape work; results are announced. (2) **Auto-fit:** choosing a ward by any route (map, card, arrows, search) now fits it to the free part of the map (tighter padding, accounts for the summary card). (3) **3D rebuilt:** smoother walls (10 height steps of 4.5px, shaded darker toward the base), the selected ward pops up two steps, roads, open-issue markers and labels now sit on each ward's own top instead of floating, labels and markers stay upright and round when the map is tipped, the 3D fit uses the turned and tipped size so the map fills the space, and layers no longer use overflow (they extend 12% past the stage instead) to keep memory down.
**Code:** `StageData.roads` gained `name`; `fitView` takes `{bearing, pitch}` for 3D (tests updated). Mobile top bar is now three rows (layers, colour tabs, search).
**You need to:** nothing. Checks: web 13 tests, lint, build pass. Looked at in headless Chrome (note: a full-page capture with `captureBeyondViewport` sometimes shows the 3D map blank; it renders fine in the page, capture without it).

## 2026-11-21 14:40, Prathik, prathik/map-3d
**Changed:** Brought the **Mumbai dawn** look back and rebuilt the home page on it. New hero: a full-width illustration of **Churchgate station** at sunrise (sandstone front with pediment clock and arcade, the domed Western Railway headquarters, a local train under the canopy, a kaali-peeli taxi, a BEST bus, Marine Drive palms, the Nariman Point towers); it follows light and dark (`components/churchgate.tsx`, `--ch-*` tokens). The user asked for a photo; they chose an illustration instead, so no image file was downloaded. The map stage is restyled in the same tokens (dawn sea chart, glass panels) instead of the forced night look.
**Map interaction:** a **3D** toggle stands each ward up as tall as its value (risk, budget gap or open issues) using stacked layers and CSS 3D, with turn buttons and Shift + drag to turn. Zoom with the buttons, Ctrl or Cmd + scroll (zooms toward the pointer), trackpad pinch or two-finger pinch; drag to pan; the map itself is focusable (arrows pan, + and - zoom, 0 recentres, Shift + left or right turns). The camera maths moved into `lib/view.ts` (free-area fit, zoom at a point, screen-to-map movement under turn and tilt; 5 tests).
**Notes:** plain scrolling still scrolls the page (wheel zoom needs Ctrl). Heights are in `LEVELS` steps of `STEP` px in `ward-stage.tsx`.
**You need to:** nothing. Checks: web 13 tests, lint, build pass; looked at in headless Chrome at 1280 and 390 wide, light and dark.

## 2026-11-21 14:20, Prathik, prathik/map-dashboard
**Changed:** The home page is now an immersive **map dashboard**, after the Raktor drone-mission Dribbble shot the user pointed to (full-bleed dark map, centred pill tabs, floating card, bottom strip of cards, zoom stack). All 24 wards are drawn from `geo/wards.geojson`, with roads and the 577 open issues on top. Choose a ward (click it, or its card in the strip) and the camera flies to it, the other wards dim, its issues appear numbered by rank (filled = paid for, ring = not paid for) and a summary card opens with the figures, the first three things to fix and **Open the ward planner**. Tabs colour the map by Risk, Budget gap or Open issues; layer buttons toggle roads and issues; zoom, centre, drag to pan, previous and next ward. The selected ward lives in the URL (`/?ward=F-N`) and the planner links back to it ("Back to the map").
**Code:** new `components/stage/` (`ward-stage.tsx` client, `types.ts`), `lib/view.ts` (camera maths, 5 tests in `tests/view.test.mjs`), `projectFeatures` now also returns `bounds`. The stage's night-sea look is its own tokens (`.stage`, `.stage-panel`, ...) in `globals.css`, the same in light and dark mode. Removed `ward-map.tsx` and `mumbai-skyline.tsx` (still in git history). The ward table stays below the map as the accessible, no-map way in.
**Accessibility:** the SVG map is `aria-hidden`; the strip of ward cards and the summary are real buttons and links (44px targets, focus ring, `aria-pressed`). Choosing by keyboard moves focus to the summary heading; Escape closes it and returns focus to the card. A polite live region announces the choice. Status is a shape plus a word. Motion is skipped with reduced motion. On phones the summary becomes a bottom sheet and the strip hides until it is closed.
**You need to:** nothing. Checks: web 13 tests, lint, build all pass.

## 2026-11-21 13:33, Prathik, prathik/mumbai-theme
**Changed:** Re-themed the whole site as **Mumbai dawn**, taking the soft, elegant style of the "Axion" Dribbble shot the user liked (Orbix Studio): a refined serif headline with one italic accent phrase, a sunrise gradient, charcoal pill buttons with an arrow, frosted stat cards, rounded white cards.
Mumbai identity: Marine Drive dawn gradient; kaali-peeli palette (charcoal and marigold); Arabian-Sea teal for "paid"; a skyline illustration on the home hero (Rajabai Tower, CST dome, Gateway of India, Bandra-Worli Sea Link, the Queen's Necklace of lights); the logo is the Gateway arch on a marigold tile. Dark mode is "Mumbai night". Details and tokens in `brand.md`.
**Fonts:** Instrument Serif (display, italic accent) and Instrument Sans (text and tabular figures); the IBM Plex fonts are gone.
**Code:** only styling and layout. New: `components/mumbai-skyline.tsx` (decorative SVG), `Chip`, `Display`, `Card` in `ui.tsx`. Restyled: layout, nav, home, ward map, plan page, controls, figures, budget line, ledger, weights panel, plan map, method page, 404. No logic, data or pipeline changes; all tests unchanged and passing (8 planner, 49 pipeline).
**Accessibility kept (WCAG 2.1 AA target):** every text pair 4.5:1 or better and large display text 3:1 or better, in light and dark (computed); control borders 3:1; one h1 per page and no skipped headings; labelled controls; 44px targets; no horizontal scroll at 320px with everything open; reduced motion honoured; status is a shape plus a word.
**You need to:** nothing is blocking. Run `cd web && npm run dev`.

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
