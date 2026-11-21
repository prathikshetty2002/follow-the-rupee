# Next Rupee Planner (Follow the Rupee: Mumbai Monsoon Roads)

A ward-by-ward planner: given the road repair budget a ward has left, it recommends what to fix first, ranked by risk, and shows its working. The pipeline also builds audit flags, contractor scorecards and a complaint trail, which feed the planner's data but are not shown in the site.

Original brief: Claude-powered tool showing where each Mumbai ward's monsoon road-repair money went, whether the
fixes held, who is responsible, and where the next rupee should go. Built at Claude Impact Lab
Mumbai (21 Nov 2026). All data is synthetic; see `docs/CHALLENGE.md`.

```
data/        input CSVs (synthetic, read-only)
pipeline/    Python: complaints → issues → work orders, audit flags, scorecards, budget, Claude narration
web/         Next.js dashboard, reads web/public/data/*.json
shared/      schema.md, the JSON contract between the two
```

## Run
```bash
cd pipeline && cp .env.example .env   # add ANTHROPIC_API_KEY
uv run pipeline
cd ../web && npm install && npm run dev
```
