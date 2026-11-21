# Follow the Rupee: Mumbai Monsoon Roads

Claude-powered tool showing where each Mumbai ward's monsoon road-repair money went, whether the
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
