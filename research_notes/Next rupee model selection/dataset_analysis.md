# Next rupee model selection: what the synthetic dataset can actually predict

All findings are from pandas and scikit-learn runs on `/home/silverfang/claude_lab_hackathon/data/*.csv`. No web sources were used; this is analysis of local data. "Source" links point to the data file plus the analysis script that produced each number. The scripts are in the session scratchpad: `SP = /tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/`. The scratchpad is session-scoped, so copy the scripts into the repo if you want to keep them.

Script index:
- `a1.py`: re-open rates by method, work type, contractor, ward, surface, DLP, bus route, road type, month and remark.
- `a2.py`: method by work type, contractor by method, contractor by ward, rainfall, hotspot and tide summaries.
- `feat.py` / `a3.py`: road feature build (nearest hotspot, facilities, accidents, traffic) and the rain-station vs ward correlation.
- `m1.py`: work-order features (rain and tide after completion, cost ratio and so on), quintile tables, and 5-fold CV ROC-AUC for logistic regression and gradient boosting.
- `m2.py`: multiplicative structure check, likelihood-ratio deviances, SLA (severity) drivers.
- `m3.py`: complaint-to-WO linking, severity words in the text, road-name matching.
- `m4.py`: open issues, road mapping, de-duplication, ward budget vs spend.
- `m5.py`: what drives issue volume per road (Spearman and Poisson CV).
- `m6.py`: temporal backtest, train Jun-Jul and test Aug-Sep.
- `m7.py`: planted-pattern checks, chi-square tests, durability economics.
- `m8.py`: follow-up WOs, in-sample "oracle" AUC, open-issue cost vs remaining budget.

---

## Q1. Is `reopened_within_30d` predictable, and what drives it?

### Takeaway
Re-opening is driven almost entirely by **who did the job (contractor) and how (repair method)**, with a smaller **surface** effect (Concrete CC worse). Rain after completion, flood hotspots, tides, traffic, DLP, bus route, road type, remarks, SLA and month carry **no signal** (single-feature AUC 0.49 to 0.52). The best 5-fold CV ROC-AUC is about **0.68** (logistic regression on contractor + method + surface). Adding the "risk" features lowers it. This looks like a planted generator rule of the form `p(reopen) ≈ base(method) × multiplier(contractor) × multiplier(surface)`, plus noise.

### Cited Findings
- Overall re-open rate: 611 / 2,499 = **24.4%**. [Source: work_orders.csv via SP/a1.py]
- Re-open rate by repair method, lowest first. [Source: work_orders.csv via SP/a1.py]

  | Method | n | Re-open | Mean cost (₹) |
  |---|---:|---:|---:|
  | Dewatering pump deployed | 200 | 0.140 | 64,420 |
  | Manhole cover replaced + grating | 202 | 0.173 | 49,045 |
  | Excavation, pipeline repair, PQC patch | 96 | 0.219 | 194,494 |
  | Pump + debris removal | 198 | 0.222 | 118,004 |
  | Desilting and garbage removal | 232 | 0.224 | 77,690 |
  | Hot mix patch | 318 | 0.226 | 16,813 |
  | Paver blocks relaid | 132 | 0.227 | 65,547 |
  | Mastic asphalt | 298 | 0.258 | 29,185 |
  | Drain desilting | 221 | 0.262 | 96,132 |
  | Cold mix patch | 602 | **0.322** | 12,518 |

- Re-open rate by contractor, in three clear tiers. [Source: work_orders.csv via SP/a1.py]
  - Good: CT05 0.091, CT08 0.116, CT01 0.136.
  - Middle: CT06 0.263, CT02 0.267.
  - Poor: CT07 0.323, CT03 0.376, CT04 0.388.
  - Implied multipliers against the 24.4% mean: CT05 0.37, CT08 0.47, CT01 0.56, CT06 1.08, CT02 1.09, CT07 1.32, CT03 1.54, CT04 1.59 (SP/m8.py).
- Surface: Asphalt 0.225, Concrete (CC) 0.290, Paver blocks 0.231, so CC is about 1.19× the mean. Surfaces are evenly spread across contractors (about 11 to 15% of each surface per contractor), so the surface effect is not contractor confounding. [Source: roads.csv + work_orders.csv via SP/a1.py, SP/m2.py]
- Chi-square independence tests against `re`: [Source: SP/m7.py]
  - contractor p = 2.1e-31
  - repair_method p = 7.8e-6
  - surface p = 3.6e-3
  - ward p = 0.013 (23 dof; this is probably contractor mix)
  - Not significant: under_dlp p = 0.35, bus_route p = 0.77, road_type p = 0.56, engineer_remark p = 0.90, sla_hours p = 0.61, month p = 0.39
- Single-feature ROC-AUC for re-open is null across the board. [Source: SP/m1.py]
  - rain_next7 0.493, rain_next14 0.505, max_rain_next7 0.486, heavy_days_next14 0.507
  - bigtide_next14 0.487, rain_on_day 0.497
  - hotspot distance 0.513, congestion 0.513
  - road age 0.486, cost_ratio 0.517, low_lying_index 0.487
  - accidents on road 0.503, schools 0.504, hospitals 0.500
  - prior WOs on the same road 0.486
- 5-fold stratified CV ROC-AUC (logistic regression / histogram gradient boosting): [Source: SP/m1.py]
  - contractor only: 0.655 / 0.655
  - method only: 0.561 / 0.560
  - contractor + method: **0.680** / 0.665
  - contractor + method + surface: **0.683** / 0.661
  - plus rain-after features: 0.679 / 0.645
  - all 95 features: 0.670 / 0.626
  - all features except contractor, method and surface: 0.541 / 0.494
  - risk-context only (rain, tide, hotspot, low-lying, traffic, accidents, facilities, age, DLP, bus): **0.511 / 0.524** (random)
- In-sample cell-mean AUC, an upper bound for lookup tables: contractor 0.665, contractor × method 0.710, contractor × method × surface 0.758. The last one is overfit, because some cells have fewer than 10 jobs. [Source: SP/m8.py]
- A multiplicative contractor × method model reproduces the 80 cell rates with a weighted MAE of 0.042. [Source: SP/m2.py]
- Likelihood-ratio deviances: [Source: SP/m2.py]
  - contractor: 2609.6 (8 parameters)
  - + method: 2569.1 (Δ 40.5 for 10 parameters, significant)
  - + surface: 2557.9 (Δ 11.1 for 3 parameters)
  - + DLP: Δ 2.5; + month: Δ 4.0 (both noise)
- Pothole re-open by surface × method: [Source: SP/m7.py]
  - Asphalt: cold 0.306, hot 0.219, mastic 0.200
  - CC: cold 0.420, hot 0.306, mastic 0.306
  - Paver: cold 0.248, hot 0.151, mastic 0.375 (only n = 48 for mastic)
- Contractor rates are fairly stable between halves (Jun-Jul → Aug-Sep): CT01 0.129 → 0.147, CT05 0.078 → 0.104, CT08 0.121 → 0.110, CT03 0.35 → 0.40, CT04 0.36 → 0.42. CT07 moved the most: 0.41 → 0.235. The per-road re-open *rate* barely persists (Spearman 0.13 over 141 roads with at least 3 WOs in each half). [Source: SP/m6.py]
- Method choice is independent of contractor: every contractor uses about 45 to 53% cold mix for potholes. Contractors are not tied to their `active_wards`: only 20.5% of WOs fall in a contractor's listed active wards, and re-open is the same in or out (0.24 vs 0.246). [Source: SP/m7.py]
- A re-open does not trigger a follow-up WO. The share of WOs followed by another WO on the same road and work type within 30 days is 0.55 for re-opened jobs and 0.524 for jobs that held. [Source: SP/m8.py]

### Inferences
- The generator almost certainly draws `reopened_within_30d` from a per-contractor quality factor times a per-method durability factor, with a surface tweak, and **no** dependence on rain, flooding, tide or traffic. Any "risk" story about failures is not supported by the data.
- For the next-rupee planner, re-open history is useful for **choosing the method and the contractor**. It is not useful for choosing **where** to spend.
- ML adds nothing over a lookup table of method and contractor re-open rates. A transparent table ("cold mix fails 32% of the time, hot mix 23%") fits the brief better and matches it within CV noise.

### Gaps
- Contractor × method × surface cells are small (5 to 93 jobs), so per-cell rates have wide confidence intervals. Use pooled method rates, with a contractor multiplier at most.
- The exact functional form (multiplicative or additive) can't be confirmed until the generator is published.

---

## Q2. What is an "open issue", and is there a severity column?

### Takeaway
The data splits cleanly by status. Every `Resolved` (3,934) and `Closed - Duplicate` (1,014) complaint is linked to a WO. **No** `Open` (617), `In Progress` (279), Forwarded or Rejected complaint is linked to one. Open issues = **896 Open/In Progress complaints → about 668 de-duplicated issues**. Severity exists only as `sla_hours` on WOs, and it depends only on `work_type` bands. It is random within a band and unrelated to location risk, text, or upvotes.

### Cited Findings
- Linked complaint IDs: 4,948, all unique, none linked to more than one WO. Status × linked: Resolved 3,934/3,934 and Closed - Duplicate 1,014/1,014 linked; Open 0/617, In Progress 0/279, Forwarded to MMRDA/PWD 0/279, Rejected - Not BMC road 0/301, Forwarded to SWM 0/47, Rejected - Not road issue 0/30. [Source: complaints.csv + work_orders.csv via SP/m3.py]
- Open/In Progress complaints by category: [Source: SP/m4.py]
  - Pothole 440, Waterlogging 132, Choked drain 82, Broken paver blocks 80
  - Road cave-in 45, Open or broken manhole 45, Road related 39, Other 33
- They were received across the season: Jun 150, Jul 329, Aug 285, Sep 130, Oct 2. [Source: SP/m4.py]
- Ward fill: 457 complaints have no ward_code. Matching `locality_text` against `localities.csv` names and aliases brings the gap down to 31. [Source: SP/m4.py]
- Road mapping: [Source: SP/m3.py, SP/m4.py]
  - For GPS complaints linked to a WO, the nearest road segment matches the WO road in 85.7% of cases (n = 2,906; median distance 25 m).
  - 60.8% of complaint descriptions contain a `roads.csv` road name, and that name matches the linked WO's road name in 94.7% of cases (n = 3,058).
  - The combined rule (GPS within 400 m, else road name + ward + locality) maps 87.2% of open complaints to a road_id.
- De-duplication (same road or locality + category, within 14 days) turns the 896 open complaints into **668 open issues**. Ward counts of complaints / issues: [Source: SP/m4.py]
  - L 81/55, G/N 69/45, P/N 68/42, F/S 55/43, F/N 53/43, K/E 52/37, K/W 48/38, H/E 46/32
  - M/E 41/30, S 41/36, R/S 41/32, E 38/27, N 38/33, T 35/31, R/C 34/23, M/W 32/25
  - G/S 28/21, P/S 25/18, R/N 17/16, H/W 13/11, B 12/8, C 10/8, A 8/7, D 7/7
- SLA (severity) by work type: [Source: work_orders.csv via SP/m2.py]

  | Work type | SLA hours (count of WOs) | Severity |
  |---|---|---|
  | Road cave-in | 24 only | sev 5 |
  | Open or broken manhole | 24 / 48 | sev 5 / 4 |
  | Waterlogging | 24 / 48 / 72 / 120 | |
  | Choked drain | 48 / 72 / 120 | |
  | Pothole | 48 (226) / 72 (426) / 120 (380) / 168 (186) | |
  | Broken paver blocks | 120 / 168 | |

- Within a band, SLA does not vary with hotspot distance (about 900 to 1,100 m mean in every band), hospitals, schools, congestion, accidents, low_lying_index or bus route. Upvotes are flat at a mean of about 10 to 11.5 per band. Severity keywords in the text (knee-deep, accident, school, hospital, danger) depend on category templates, not on SLA. [Source: SP/m2.py, SP/m3.py]
- `sla_met` is just response time against `sla_hours`: the met jobs have ratio ≤ 1.6 (median 0.30) and the missed jobs have median 0.82. This is consistent with timing measured from the first complaint. [Source: SP/m2.py]
- Repeat-failure roads: 97 roads have at least 3 re-opened WOs and 156 have at least 2. 285 of 291 roads have at least one WO (median 7 WOs per road). [Source: SP/m4.py]
- Accidents with road-defect causes (Pothole 101, Uneven road / open chamber 51, Waterlogged road 39) total 191 of 420. They peak in monsoon months (Jun 25, Jul 57, Aug 70, Sep 31). [Source: accidents.csv via SP/m5.py]
- 568 complaints use re-opened wording ("reopened", "phir se", "wahi gadda" and similar). 69 of them are still Open and 21 In Progress. [Source: SP/m8.py]

### Inferences
- The answer key's "open issues" set is almost certainly the generator's unlinked Open/In Progress complaints, perhaps clustered into issues. Our 668 is an estimate because the de-dup rule is ours.
- Complaints carry no severity, so a planner has to impute it from category, for example: cave-in and manhole = 5, waterlogging = 4, choked drain = 3, pothole = 3, paver = 2. Taking the mode of the WO `sla_hours` for each category is a defensible, data-backed mapping.

### Gaps
- It isn't certain whether the judges count issues at the complaint, issue or road level.
- 12.8% of open complaints could not be mapped to a road. A further step that resolves locality to the nearest segment in the ward would close most of that.

---

## Q3. Ward budget vs spend

### Takeaway
Total budget ₹14.91 cr against ₹13.43 cr spent. Budget tracks spend closely (r = 0.957): it looks like `spend × U(≈0.84, 1.36)` rounded to ₹1 lakh. **Six wards are over budget**: L, E, R/C, M/W, A and R/S. The largest headroom is in H/E, S, M/E, F/S and G/N.

### Cited Findings
Budget minus spend (₹), from work_orders.csv + wards.csv via SP/m4.py, ordered from most overspent:

| Ward | Budget | Spend | Remaining | Utilisation | Open issues | Est. cost of open issues | Remaining / est. need |
|---|---:|---:|---:|---:|---:|---:|---:|
| L | 11.9 M | 13.04 M | **−1,143,418** | 109.6% | 55 | 2.58 M | −0.44 |
| E | 5.3 M | 6.32 M | **−1,022,991** | 119.3% | 27 | 1.40 M | −0.73 |
| R/C | 2.9 M | 3.31 M | **−412,447** | 114.2% | 23 | 1.49 M | −0.28 |
| M/W | 4.4 M | 4.69 M | **−289,823** | 106.6% | 25 | 1.21 M | −0.24 |
| A | 1.6 M | 1.66 M | **−55,330** | 103.5% | 7 | 0.34 M | −0.16 |
| R/S | 6.6 M | 6.64 M | **−42,234** | 100.6% | 32 | 0.87 M | −0.05 |
| H/W | 4.3 M | 4.25 M | 54,758 | 98.7% | 11 | 0.82 M | 0.07 |
| C | 0.9 M | 0.80 M | 103,197 | 88.5% | 8 | 0.28 M | 0.37 |
| N | 6.2 M | 6.00 M | 200,443 | 96.8% | 33 | 1.58 M | 0.13 |
| D | 1.6 M | 1.27 M | 327,700 | 79.5% | 7 | 0.18 M | 1.84 |
| G/S | 3.2 M | 2.82 M | 378,014 | 88.2% | 21 | 0.71 M | 0.53 |
| P/S | 4.8 M | 4.35 M | 450,003 | 90.6% | 18 | 0.62 M | 0.73 |
| P/N | 7.7 M | 7.01 M | 693,538 | 91.0% | 42 | 1.92 M | 0.36 |
| B | 4.3 M | 3.51 M | 792,048 | 81.6% | 8 | 0.35 M | 2.27 |
| K/E | 9.1 M | 8.26 M | 835,952 | 90.8% | 37 | 1.74 M | 0.48 |
| K/W | 8.9 M | 7.85 M | 1,054,760 | 88.1% | 38 | 1.46 M | 0.72 |
| F/N | 10.5 M | 9.41 M | 1,087,426 | 89.6% | 43 | 1.87 M | 0.58 |
| T | 5.1 M | 3.95 M | 1,146,436 | 77.5% | 31 | 1.31 M | 0.87 |
| R/N | 4.8 M | 3.53 M | 1,266,162 | 73.6% | 16 | 0.88 M | 1.44 |
| G/N | 8.4 M | 6.76 M | 1,644,262 | 80.4% | 45 | 2.94 M | 0.56 |
| F/S | 9.8 M | 8.03 M | 1,773,849 | 81.9% | 43 | 2.30 M | 0.77 |
| M/E | 9.1 M | 7.24 M | 1,864,315 | 79.5% | 30 | 1.08 M | 1.73 |
| S | 9.5 M | 7.49 M | 2,010,730 | 78.8% | 36 | 1.40 M | 1.43 |
| H/E | 8.2 M | 6.15 M | 2,054,467 | 74.9% | 32 | 1.25 M | 1.64 |

- The "estimated cost of open issues" uses the mean cost of each category's cheapest durable method: pothole ₹16.8k (hot mix), waterlogging ₹64.4k (dewatering), drain ₹77.7k, paver ₹65.5k, cave-in ₹194.5k, manhole ₹49.0k. The citywide open-issue need is about ₹3.06 cr, against about ₹1.49 cr of net headroom. [Source: SP/m8.py]
- Spend already paid on DLP roads (which should have cost BMC nothing) is largest in L (₹39.6 L), E (₹25.0 L), H/W (₹22.4 L), F/N (₹22.2 L) and K/W (₹17.1 L). Recovering it would free budget. [Source: SP/m4.py]
- Spend on jobs that re-opened is largest in S (₹22.2 L), F/N (₹21.3 L), E (₹20.1 L), K/W (₹18.7 L) and L (₹18.2 L). [Source: SP/m4.py]

### Inferences
- Over-budget wards (L, E, R/C, M/W, A, R/S) have no headroom. Their next-rupee list should come with a recommendation to recover DLP money or reallocate, not a spend plan.
- `remaining` is a season-end number. The answer key may instead assume the full budget is available, or rank issues without a budget constraint, so present both.

### Gaps
- The brief doesn't say whether the next rupee is post-season (Oct onward) or a mid-season re-plan.

---

## Q4. How risk factors join to roads, and what actually drives where issues occur

### Takeaway
The joins are straightforward. The striking finding is that **issue volume per road is driven by ward population, the ward's `low_lying_index` and closeness to a flood hotspot**. Traffic, congestion, bus routes, schools and hospitals have essentially zero relationship with how many issues a road generates. Accidents follow the same exposure (population and low-lying), not traffic.

### Cited Findings
- Joins used:
  - `accidents.road_id` and `traffic.road_id` join directly to roads (traffic covers 291 of 291 roads).
  - `facilities.ambulance_entry_road` gives hospital and school counts per road.
  - Hotspots join by haversine distance from each road's midpoint and endpoints. The nearest road is 92 to 1,456 m from its hotspot (median about 350 m), and 54 of 291 roads lie within 500 m of a hotspot.
  - Rain stations: Colaba vs Santacruz daily rainfall correlates at r = 0.97, so the mapping barely matters. I used Colaba for the island-city wards A to G/N and Santacruz for the suburbs. Per-ward complaint-vs-rain correlations don't separate the stations (differences of ±0.05).

  [Source: SP/feat.py, SP/a3.py]
- Spearman correlation (n = 291 roads) between static features and per-road WO count, re-open count, complaint count and open complaints: [Source: SP/m5.py]
  - population_est: 0.600 / 0.398 / 0.569 / 0.413
  - low_lying_index: 0.522 / 0.368 / 0.491 / 0.351
  - accidents (all): 0.353; accidents (road-caused): 0.333
  - hotspot nearness exp(−d/500): 0.308 / 0.233 / 0.289 / 0.288
  - hotspots within 500 m: 0.291
  - years flagged: 0.238
  - congestion: −0.088; peak vehicles: −0.073; bus routes count: −0.086
  - schools: 0.009; hospitals: 0.100; DLP: −0.045; road age: −0.029
- By work type, hotspot nearness correlates with Choked drain counts (0.368) and Waterlogging (0.311), but not Pothole (0.041) or Manhole (0.027). low_lying_index correlates with Pothole (0.441) and Waterlogging (0.401). [Source: SP/m5.py]
- A Poisson regression on static road features predicts per-road WO count with 5-fold CV Spearman **0.716**. The top coefficients (standardised) are population 0.359, hotspot nearness 0.330, low_lying 0.197 and schools 0.133. Traffic terms are about 0. [Source: SP/m5.py]
- Road-caused accidents per road: Spearman with population 0.331, low_lying 0.289, WO count 0.333, hotspot nearness −0.01, congestion −0.033, two-wheeler share −0.083. [Source: SP/m7.py]
- Tides: 55 of 244 tide readings are big tides (≥ 4.5 m). Big tides in the 14 days after completion have no effect on re-open (AUC 0.487). 18 of 28 hotspots are tide-sensitive. [Source: SP/a2.py, SP/m1.py]

### Inferences
- The generator seems to create issues at a rate per road of roughly `ward_population × f(low_lying_index) × g(hotspot proximity)`, with work type tied to flood exposure. Traffic, bus routes, facilities and accidents look like **decorative attributes** that don't drive generated outcomes. The brief tells teams to weight them, so the answer key's *ranking formula* probably does include them, even though they don't predict anything.
- This distinction matters: "what is predictable" (exposure plus history) is not the same as "what the answer key rewards". The answer key is most likely a hand-written weighted formula over the listed factors applied to open issues, as the starter ideas describe.

### Gaps
- It's unknown whether the answer key weights hospitals and schools by beds/students or by count.
- The hotspot to road join is approximate, because hotspots are points and can sit more than 1 km from any segment (for example FH011 Dadar TT at 1,456 m).

---

## Q5. Durability and cost per durable fix: which method the answer key likely prefers

### Takeaway
On cost per durable fix (`mean cost / (1 − re-open)`), **hot mix patch is the best pothole method**: ₹21.7k vs ₹18.5k for cold mix, but with a 23% failure rate instead of 32%. Mastic is ₹39.4k. For waterlogging, **dewatering pump deployed** wins on both counts (cheapest at ₹64k and most durable at 14%). Each other work type has only one method, so the choice there is about contractor rather than method.

### Cited Findings
Re-open rate, mean cost and cost per durable fix by work type and method, from SP/m7.py:

| Work type | Method | n | Re-open | Mean cost (₹) | Cost / durable fix (₹) | Cost incl. one redo (₹) |
|---|---|---:|---:|---:|---:|---:|
| Pothole | Cold mix patch | 602 | 0.322 | 12,518 | 18,470 | 16,552 |
| Pothole | **Hot mix patch** | 318 | **0.226** | 16,813 | 21,733 | 20,619 |
| Pothole | Mastic asphalt | 298 | 0.258 | 29,185 | 39,353 | 36,726 |
| Waterlogging | **Dewatering pump deployed** | 200 | **0.140** | 64,420 | **74,907** | 73,439 |
| Waterlogging | Drain desilting | 221 | 0.262 | 96,132 | 130,339 | 121,362 |
| Waterlogging | Pump + debris removal | 198 | 0.222 | 118,004 | 151,719 | 144,227 |
| Open/broken manhole | Manhole cover replaced + grating | 202 | 0.173 | 49,045 | 59,324 | 57,543 |
| Choked drain | Desilting and garbage removal | 232 | 0.224 | 77,690 | 100,134 | 95,103 |
| Broken paver blocks | Paver blocks relaid | 132 | 0.227 | 65,547 | 84,826 | 80,445 |
| Road cave-in | Excavation, pipeline repair, PQC patch | 96 | 0.219 | 194,494 | 248,953 | 237,040 |

- Rate card (standard rates): cold mix ₹1,800/sqm, hot mix ₹2,600/sqm, mastic ₹4,200/sqm, paver ₹3,000/sqm; dewatering ₹60k/job, drain desilting ₹90k, pump + debris ₹110k, manhole ₹45k, excavation/PQC ₹180k, desilting + garbage ₹70k. [Source: rate_card.csv]
- Potholes on Concrete (CC) roads fail more with every method: cold 0.42, hot 0.31, mastic 0.31 (n = 143/85/85). On Paver-block roads hot mix is 0.151 (n = 73). [Source: SP/m7.py]
- Waterlogging within 500 m of a hotspot: dewatering 0.085, desilting 0.239, pump + debris 0.202. [Source: SP/m7.py]
- Using a good-tier contractor (CT05, CT08 or CT01) roughly halves the failure rate of any method. For example, cold mix with CT01 is 0.14, CT05 0.14 and CT08 0.15, against 0.50 with CT03 and 0.52 with CT04. [Source: SP/a2.py]

### Inferences
- The brief says to "prefer methods that last over the cheapest patch". The answer key's method choice is most likely: pothole → hot mix (lowest re-open among the patches) and waterlogging → dewatering pump. Mastic costs about twice as much as hot mix and fails more, so it is never preferred.
- Strictly on cost per durable fix, cold mix (₹18.5k) beats hot mix (₹21.7k). If the key is "lowest re-open rate", hot mix wins; if it is "lowest cost per durable fix", cold mix wins narrowly. Durability is what the brief names, so **use the lowest re-open rate**, and report cost per durable fix alongside it as the explanation.
- Steering work to the good-tier contractors (CT01, CT05, CT08) is a stronger durability lever than choosing the method.

### Gaps
- Method-level confidence intervals overlap for hot mix (0.226, n = 318) and mastic (0.258, n = 298); the 95% CI is about ±0.046. The cold mix gap is robust.

---

## Q6. Temporal backtest: does a risk index computed on Jun-Jul predict Aug-Sep?

### Takeaway
Yes, for **where issues happen**, mostly through history and exposure. Across all roads, past WO count gives Spearman 0.60 with Aug-Sep WO count. A Poisson or GBM model on static features fit to Jun-Jul gives 0.66 to 0.69, a small gain. **Within a ward**, which is the ranking the brief actually asks for, everything tops out around 0.30 to 0.39. A naive "equal weights on every listed factor" index is weaker (0.375 across all roads, 0.215 within wards), because traffic and facilities add noise. No index predicts Aug-Sep accidents within a ward.

### Cited Findings
Train window is Jun-Jul (assigned or received before 2025-08-01); test window is Aug-Sep. Spearman correlation is computed over 291 roads, and "in-ward" is the mean of per-ward correlations over the 24 wards (7 to 17 roads each). [Source: SP/m6.py]

| Score (built from Jun-Jul) | WO count | WO in-ward | Complaints | Complaints in-ward | Re-opens | Re-opens in-ward | Road accidents | Accidents in-ward | Spend in-ward |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Past WO count | 0.602 | 0.309 | 0.617 | **0.334** | 0.431 | 0.218 | 0.241 | 0.028 | 0.358 |
| Past complaints | 0.591 | 0.300 | 0.599 | 0.297 | 0.435 | 0.230 | 0.201 | −0.017 | 0.329 |
| Past re-opens | 0.403 | 0.264 | 0.379 | 0.277 | 0.325 | 0.221 | 0.245 | 0.141 | 0.231 |
| Past spend | 0.553 | 0.277 | 0.550 | 0.280 | 0.411 | 0.189 | 0.181 | −0.016 | 0.369 |
| Hotspot nearness | 0.295 | 0.236 | 0.301 | 0.233 | 0.222 | 0.227 | −0.018 | −0.165 | 0.304 |
| Low-lying (ward) | 0.451 | n/a | 0.455 | n/a | 0.314 | n/a | 0.236 | n/a | n/a |
| Population (ward) | 0.535 | n/a | 0.548 | n/a | 0.376 | n/a | 0.341 | n/a | n/a |
| Traffic congestion | −0.094 | −0.019 | −0.129 | −0.071 | −0.066 | −0.074 | −0.050 | 0.049 | −0.014 |
| Facilities (hospitals + schools) | 0.059 | 0.084 | 0.086 | 0.134 | 0.041 | 0.052 | −0.025 | −0.084 | 0.074 |
| Past road accidents | 0.168 | 0.043 | 0.150 | −0.010 | 0.101 | −0.005 | 0.232 | 0.123 | 0.038 |
| Equal-weight static index (hotspot, low-lying, traffic, accidents, facilities, bus) | 0.375 | 0.215 | 0.340 | 0.125 | 0.266 | 0.098 | 0.157 | 0.084 | 0.247 |
| Exposure index (hotspot + low-lying + log population + accidents) | 0.598 | 0.228 | 0.587 | 0.185 | 0.403 | 0.181 | 0.297 | −0.036 | 0.285 |
| History + static (log past complaints + hotspot + low-lying) | 0.597 | **0.315** | 0.593 | 0.284 | 0.409 | **0.322** | 0.185 | −0.118 | **0.393** |
| Poisson on static features, fit on Jun-Jul | 0.656 | 0.312 | 0.653 | 0.295 | 0.427 | 0.121 | 0.305 | −0.026 | 0.357 |
| GBM (Poisson loss) on static features, fit on Jun-Jul | **0.687** | 0.298 | **0.689** | 0.298 | **0.468** | 0.209 | 0.293 | −0.030 | 0.374 |

### Inferences
- Within a ward, ML (Poisson or GBM, 0.30 to 0.31) does no better than the transparent "history + hotspot + low-lying" index (0.32, and best on re-opens and spend). **ML adds nothing for the per-ward ranking.**
- Traffic and facilities lower predictive accuracy. They still belong in the ranking as *consequence* weights ("a failure here hurts more people"), not as likelihood weights. A clean design is `priority = likelihood × impact`:
  - likelihood: past complaints/WOs, re-opens, hotspot proximity, low-lying
  - impact: severity, traffic, bus route, hospitals/schools, accidents

  This is defensible to judges and explainable.
- The backtest makes a good "sensible methods" slide: "our index computed on June-July ranks the roads that failed in August-September with ρ = 0.6 citywide."

### Gaps
- A within-ward n of 7 to 17 roads makes per-ward Spearman noisy, so the means are indicative only.
- Accidents in Aug-Sep are sparse (101 road-cause accidents in the test window), which limits that outcome.

---

## Q7. Signs of planted generator rules

### Takeaway
There are several clean, planted structures. The cost ratio is uniform on [0.75, 1.30] with a separate block of about 111 over-billed jobs at 1.4 to 3.1×. SLA is banded by work type. Re-open depends on contractor tier × method. Budget equals spend × a random factor. All Resolved and Duplicate complaints are linked and all others are not. The 45 unlinked WOs are the double-billing plants.

### Cited Findings
- `cost_inr / rate-card expected`: min 0.75, 5th percentile 0.813, median 1.054, 95th percentile 1.298. The histogram is flat (about 456 to 480 per 0.1 bin from 0.8 to 1.3, and 76 in 0.7 to 0.8), with only 3 jobs between 1.3 and 1.4. Then a separate tail: 7 at 1.4 to 1.6, 40 at 1.6 to 2.0 and 64 at 2.0 to 5.0 (max 3.105). That makes **111 jobs > 1.4×**, a clear planted over-billing set. These jobs re-open at 0.306 vs 0.242. [Source: SP/m7.py]
- 45 WOs have no linked complaint; they re-open at 0.156. [Source: SP/m7.py]
- WO IDs run from 1 to 2,500 with exactly one missing. Complaint IDs run 1 to 6,501 with none missing. Costs are essentially never round (0.1% are multiples of ₹1,000). [Source: SP/m7.py]
- Rainfall categories are internally consistent with IMD thresholds (Extremely heavy ≥ 204.5 mm). Santacruz has 8 extremely-heavy days and Colaba 3. [Source: SP/a3.py]
- Engineer remarks are 6 templates in roughly equal numbers (334 to 392 each) with no relation to re-open (0.23 to 0.26, p = 0.90). They are decoys. [Source: SP/a1.py, SP/m7.py]
- Contractor `active_wards` doesn't constrain assignments: 79.5% of WOs fall outside the listed wards. [Source: SP/m7.py]
- Complaint text is templated by category ("As per caller …", "kids unable to go to school", "Ambulance could not pass"). Mentions of schools and hospitals in text are about 11 to 15% in waterlogging and about 5% elsewhere, and are not tied to severity. [Source: SP/m3.py]

### Inferences
- The generator was written with explicit audit plants: over-billing over 1.4×, unlinked double bills, and DLP-paid jobs. It probably also has a hidden severity or risk value per issue, drawn from category bands. The answer key for the next rupee is then likely `issue severity × location risk weights`, with method = lowest re-open method for the category.

### Gaps
- No hidden per-issue "risk" or "priority" column was found in any file. The open complaints have no severity, so the answer key must either impute it from category or use a value we can't see.

---

## Q8. Recommendations

### Takeaway
(1) Don't model where failures happen from `reopened_within_30d`. Use it only to choose the method and contractor. Rank **open issues** (unlinked Open/In Progress complaints, de-duplicated to about 668), aggregated to roads. (2) Use a transparent `likelihood × impact × severity` index. (3) Skip ML for the ranking, because it doesn't beat the index within wards. (4) Validate with the Jun-Jul → Aug-Sep backtest and report Spearman.

### Cited Findings
- Contractor + method + surface is the full extent of the re-open signal (CV AUC 0.683); risk-context features score 0.511. [Source: SP/m1.py]
- History + hotspot + low-lying gives within-ward Spearman of 0.315 (WOs), 0.322 (re-opens) and 0.393 (spend), on par with or better than Poisson/GBM. [Source: SP/m6.py]

### Inferences
1. **Targets to model**
   - (a) The *ranking target* is open issues per road and ward, scored by a formula. It is not a learned label.
   - (b) The *method/contractor target* is `reopened_within_30d`, which only needs group rates.
   - (c) The *validation target* is future WOs, complaints and spend per road (Aug-Sep).
2. **Features for the priority score**
   - Severity, imputed from category via the modal WO SLA band: cave-in and manhole 5, waterlogging 4, choked drain 3 or 4, pothole 3, paver 2.
   - Likelihood:
     - log(1 + past complaints or WOs on the road)
     - past re-opens on the road (repeat failure)
     - hotspot nearness exp(−d/500 m)
     - hotspot tide_sensitive and years_flagged
     - ward low_lying_index
   - Impact:
     - congestion or peak vehicles
     - bus_route or bus_routes_count
     - road-defect accidents (Pothole, Waterlogged, Uneven/open chamber), with fatal ones weighted higher
     - hospitals (emergency services) and schools on `ambulance_entry_road`
     - upvotes / duplicate count
   - Use simple round weights and normalise each factor to 0 to 1, for example 0.3 severity, 0.25 flood, 0.15 history, 0.1 traffic, 0.1 accidents, 0.1 facilities. A generator author probably did something similar.
   - Method: the lowest re-open method for the category (pothole → hot mix; waterlogging → dewatering pump; others have one method). Add a note to prefer CT05, CT08 or CT01, and to route DLP roads to the DLP contractor at ₹0 to BMC.
   - Budget: greedily fill each ward's remaining budget in priority order using the mean cost per method. For over-budget wards, show the list with a "needs reallocation or DLP recovery" banner.
3. **ML vs index**
   - ML doesn't help. For re-open, AUC moves from 0.68 (LR on two categoricals) to 0.63 to 0.67 (GBM on everything).
   - For per-ward future-issue ranking, the transparent index (0.315) matches or beats Poisson/GBM (0.30 to 0.31).
   - At most, use the backtest to *tune* the index weights and show they are evidence-based.
4. **Validation approach**
   - Compute the index from data before 1 Aug.
   - Report Spearman, citywide and the per-ward mean, against Aug-Sep WOs, complaints, re-opens and spend per road. Add precision@3 per ward (are the top 3 roads in the top third of Aug-Sep failures?).
   - Report method durability with 95% CIs.
   - Sensitivity check: show that the top-ranked roads stay stable under ±50% weight changes.

### Gaps
- The answer key's actual weights are unknown until the generator is published. A weighted formula over the brief's listed factors is a guess.
