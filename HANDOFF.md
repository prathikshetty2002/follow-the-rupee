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
| `wards.json` | partial: budget, spend, `next_rupee`, `risk_score` real; `summary` is a placeholder |
| `contractors.json` | stub (scorecards not built yet) |
| `flags.json` | stub (audit flags not built yet) |
| `issues.json` | stub (complaint-to-work-order trail not built yet) |

Next from Prathik: audit flags, then contractor scorecards, then Claude-written ward summaries. Each will replace a stub with
the same shape, so UI built on the stubs keeps working.
