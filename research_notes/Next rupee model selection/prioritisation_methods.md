# Prioritising road maintenance budget under risk ("where the next rupee goes") and validating without labels

Scope note: 17 tool calls (searches plus fetches, including the full text of IRC:82-2015). Sources were mostly abstracts and search snippets, except IRC:82-2015, which was read in full via pdftotext. Formulas and Python recipes in the "Inferences" sections are standard OR/IR/MCDA textbook material written from general knowledge, not from a fetched source. They are marked as such so the report writer does not cite them to a URL.

## 1. MCDA methods used in pavement/road maintenance prioritisation, and what the standards actually use

### Takeaway
Official practice is simpler than the academic literature. India's IRC:82-2015 ranks roads by a weighted-average distress rating (ascending order, cut off by budget). HDM-4 ranks by incremental benefit-cost ratio. iRAP uses an exposure-weighted risk score. AHP, TOPSIS and entropy weighting are mostly academic, and their rankings often correlate strongly with condition-only rankings (Pearson about 0.79; Spearman about 0.78 against IRC). A transparent weighted-sum "likelihood × consequence" index with sensitivity analysis is therefore defensible and close to standard practice.

### Cited Findings
**IRC (India), IRC:82-2015 "Code of Practice for Maintenance of Bituminous Surfaces"** (read in full)
- Distress-based rating on a 1–3 scale (1 = Poor, 1.1–2 = Fair, 2.1–3 = Good), with separate tables for highways, MDR/rural roads and urban roads — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Urban roads (Table 5.3) rate Poor at: cracking >15%, ravelling >10%, **potholes >0.5% of area**, settlement >5%, rut depth >10 mm. Good requires potholes = NIL, cracking <5%, ravelling <5%, settlement <1% and rut depth <5 mm — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Appendix 4 combines distresses with fixed weight multipliers: cracking 1.00, ravelling 0.75, **potholes 0.50**, shoving 1.00, patching 0.75, settlement 0.75, rut depth 1.00. Final Rating = the average of (rating × weight). The worked example gives 1.3, "Fair" — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf). (Oddity: because potholes get a low multiplier and the method averages rating × weight, a pothole-free road scores lower on that term. The weighting is not monotone in "badness", so it should be treated with caution.)
- Budget rule (Sec. 9.5): "roads may be arranged based on the ascending order of condition rating and the periodic renewal shall be prioritised in the same order subject to budgetary allocations". In other words, worst-first greedy ranking, with no explicit cost-effectiveness step — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Urban roads intervention warrant (Table 5.5): roughness 3,400 mm/km (Level 3) and skid number 45. Skid resistance is flagged as important "especially during wet weather conditions" — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Condition surveys should happen at least twice a year on highways and urban roads, "first before and the second after the monsoon", plus special inspections before and after the rains to assess pothole repair needs — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Pothole size classes: small is 25 mm deep and 200 mm wide; medium is 25–50 mm deep and 500 mm wide; large is >50 mm deep — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- The 2022 draft revision of IRC:82 reportedly moves to a PCI built from weighted sub-indices (cracking, ravelling, patching, potholes, rut, roughness). Final status unverified; IRC's 2026 catalogue lists an IRC:82-2023 edition — [pdfcoffee copy of IRC:82-2022 draft](https://pdfcoffee.com/irc-82-2022-pdf-free.html); [IRC catalogue 2026](https://www.irc.nic.in/WriteReadData/LINKS/Updated%20Catalogue,%202026(1)ed1ad28e-67a2-4bfe-82c1-4c3b75fa9107.pdf)

**World Bank HDM-4**
- HDM-4 Volume 4 / Part G1 names two optimisation methods: Total Enumeration and Incremental Benefit/Cost (IBC) ranking — [HDM-4 erratum (Scribd copy, informal)](https://www.scribd.com/document/432586643/Erratum-v1-3)
- IBC rule: for mutually exclusive alternatives on a section, compute ΔNPV / ΔCost between successive alternatives. Fund the alternative if the ratio exceeds a marginal threshold, typically the BCR at the budget boundary. HDM-4 v1.2 uses only the capital budget constraint — [HDM-4 erratum (Scribd)](https://www.scribd.com/document/432586643/Erratum-v1-3)
- The TRR paper on HDM-4 optimisation describes the use of IBC ratios in strategy and programme prioritisation (full text blocked, 403) — [TRR 1655-08](https://journals.sagepub.com/doi/full/10.3141/1655-08)
- HDM-4 determines "the most economically efficient maintenance activities" when budgets are insufficient. The objective is minimising agency plus road-user cost, i.e. maximising net benefit to society — [PIARC Asset Management Manual](https://road-asset.piarc.org/en/node/1689); [IJPE Morocco HDM-4 study](https://informahealthcare.com/doi/abs/10.1080/10298436.2021.1892106)

**iRAP (safety consequence layer)**
- Star Ratings come from road inspection data, coded every 100 m on 50+ attributes affecting crash likelihood and severity. They can be computed without crash data — [SWOV](https://swov.nl/en/publicatie/star-rating-roads-safety-irap-methodology); [Road Safety Foundation](https://roadsafetyfoundation.org/irap-tools-and-methodology/why-irap/)
- Expected fatal and serious injuries (FSI) per 100 m = f(calibration, Star Rating Score (individual risk), user flows (exposure)), i.e. risk per user × exposure — [iRAP trauma estimation](https://irap.org/?p=49771)
- Australia's ANRAM blends iRAP FSI estimates with crash history using Bayesian analysis. This is a useful precedent for shrinking sparse accident counts toward a model prior — [iRAP](https://irap.org/?p=49771)

**Academic MCDA (AHP / TOPSIS / entropy)**
- AHP weights come from expert pairwise surveys and are inherently subjective. Common criteria are road class, pavement condition, traffic, riding quality, safety, maintenance cost, and importance to the community (Ramadhan et al.) — [Springer review s42947-025-00566-9](https://link.springer.com/article/10.1007/s42947-025-00566-9); [Nautiyal & Sharma, JQME (low-volume rural roads, India)](https://www.emerald.com/insight/content/doi/10.1108/JQME-12-2019-0111/full/html)
- Pothole count, IRI and PCI were found to be the three most critical maintenance indicators (Huang et al.) — [Infrastructures 2024](https://doaj.org/article/7d9915ba9e4e40b1acf2ca2ae847d4f8)
- MCDM rankings correlate strongly with condition-only ranking (Pearson 0.79) — [Springer review](https://link.springer.com/article/10.1007/s42947-025-00566-9)
- Kurukshetra (Haryana) study: TOPSIS agreed with IRC ranking better than AHP did (Spearman 0.78, Index of Agreement 0.88). Per-method AHP numbers and weights are not in the abstract — [J. Rehab. Civil Eng. 13(3) 2025](https://civiljournal.semnan.ac.ir/article_9114.html)
- Indonesian study: entropy-TOPSIS matched PCI-based ranking 27.5% of the time vs 21.25% for AHP-TOPSIS. Both picked the same top section. The low absolute agreement is a warning that methods diverge below the top — [Jurnal Jalan-Jembatan (Bina Marga)](https://binamarga.pu.go.id/jurnal/index.php/jurnaljalanjembatan/article/view/1331)
- TOPSIS stability is typically checked by perturbing criterion weights — [Sustainability 15(20):14953](https://www.mdpi.com/2071-1050/15/20/14953/html)
- MACBETH alternative: five criteria (maintenance cost, traffic, condition, safety, social equity), with weights from value functions — [Springer review](https://link.springer.com/article/10.1007/s42947-025-00566-9)

### Inferences
- No standard prescribes MCDA weights for rainfall, tide or proximity to schools and hospitals. Those must be the team's own documented assumptions. Reasonable framing: **Risk_i = P(failure_i | rain, flood, condition, age, last repair method) × Consequence_i**, where Consequence_i = w_T·traffic_norm + w_S·accident_norm + w_E·emergency_access_norm (hospitals and schools within a buffer) + w_F·flood-route criticality. An illustrative split, not sourced: traffic 0.35, safety 0.30, emergency access 0.25, network criticality 0.10. Normalise each to [0,1] with min-max or rank-percentile.
- Entropy weights (objective): p_ij = x_ij/Σ_i x_ij; E_j = −(1/ln n) Σ_i p_ij ln p_ij; w_j = (1−E_j)/Σ(1−E_k). Caveat: these reward variance, not importance. Use them as a sensitivity alternative, not as the primary weights.
- TOPSIS: vector-normalise r_ij = x_ij/√Σx², weight v_ij = w_j r_ij, take the ideal A⁺ and anti-ideal A⁻ per criterion, compute distances S⁺ and S⁻, and set C_i = S⁻/(S⁺+S⁻). It is known to suffer rank reversal when alternatives are added or removed (general MCDA knowledge; no pavement-specific rank-reversal test found).
- AHP: build pairwise matrix A (Saaty 1–9 scale), take the principal eigenvector as weights, compute CR = ((λmax−n)/(n−1))/RI. Accept if CR < 0.10 (RI for n=5 is 1.12). This is textbook material, not fetched. For a hackathon, AHP adds ceremony but little validity over directly stated weights plus sensitivity analysis.
- PROMETHEE appeared in no pavement source found. Treat it as non-standard for this domain.
- Recommendation: use a weighted-sum risk index as primary (matches IRC/iRAP spirit, explainable), TOPSIS as a robustness comparator, and report rank agreement between them (Spearman / Kendall τ / top-k overlap).

### Gaps
- No Mumbai BMC-published prioritisation formula or weight set was found. BMC practice per news is complaint-driven, with 24–48 h repair targets.
- FHWA asset-management weight conventions were not fetched.
- Exact iRAP Star Rating Score equations (the product of risk factors per road-user type) are in the iRAP methodology fact sheets, which were not fetched.
- Full AHP weight values from the Indian studies (Kurukshetra, Nautiyal & Sharma) are behind PDFs that were not read.

## 2. Budget-constrained selection and repair-method choice (durability vs cost)

### Takeaway
HDM-4's incremental benefit-cost ranking, with one alternative per section chosen at the budget-boundary BCR, is the established heuristic. An exact 0/1 multiple-choice knapsack (an ILP with one method per segment) is trivial at 291 segments × ~4 methods and should be solved exactly with PuLP or OR-Tools. Then report how far greedy BCR falls from optimal. For method choice, SHRP H-106 evidence shows material quality dominates: cheap cold mix costs more overall because it gets re-patched. BMC itself bars cold mix on roads wider than 6 m in favour of mastic asphalt.

### Cited Findings
- HDM-4 IBC procedure: assign each section its highest-ranking alternative, check the total against the budget, iterate. ΔNPV/ΔCost governs upgrading to a costlier alternative on the same section — [HDM-4 erratum (Scribd)](https://www.scribd.com/document/432586643/Erratum-v1-3)
- SHRP H-106 / LTPP: more than 1,250 cold-mix pothole patches at 8 sites in the US and Canada (1991–92) — [FHWA-RD-98-073](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/98073/index.cfm)
- Throw-and-roll proved as effective as the semi-permanent procedure in most situations and more cost-effective. The report also states that semi-permanent is more cost-effective "if quality materials are used", so the conclusion is conditional on material — [FHWA-RD-98-073](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/98073/98073.pdf); [FHWA Focus](https://www.fhwa.dot.gov/publications/focus/00jan/potholes.cfm)
- "The poorer performance associated with inexpensive cold mixes will result in greater overall costs for patching", because repeated re-patching costs labour, equipment and traffic control — [FHWA-RD-98-073](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/98073/98073.pdf)
- In wet or cold weather the prime objective is a patch that holds. Effectiveness depends on operator expertise — [FHWA-RD-98-073](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/98073/98073.pdf)
- IRC:82-2015: ready-made cold patching mix (IRC:116) is for potholes up to 75 mm deep, with deeper ones placed in 25–75 mm layers. "Pothole need not be dry" for cold mix, though standing water must be removed. Cold and rainy months mostly use emulsion or cut-back maintenance mixes. Section 11 promotes mechanised patching for "durable, long lasting and cost effective repairs". It also recommends machine-based methods on high-traffic roads — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- BMC (June 2025): cold mix barred on roads wider than 6 m; only mastic asphalt is allowed there. Square-cut patch edges are mandated — [Free Press Journal](https://www.freepressjournal.in/mumbai/mumbai-news-bmc-cracks-down-on-potholes-bars-cold-mix-on-major-roads-geo-polymer-concrete-gps-tracked-repairs-mandated)
- BMC earlier tried rapid-hardening concrete (M-60) and reactive asphalt. M-60 needs a dry surface and about 6 hours to set. Mastic was later preferred as "useful" — [FPJ](https://www.freepressjournal.in/amp/mumbai/mumbai-finally-bmc-decides-rapid-hardening-core-reactive-asphalt-to-fill-potholes); [Lokmat Times](https://www.lokmattimes.com/mumbai/mumbai-bmc-introduces-mastic-asphalt-solution-to-combat-pothole-woes-in-the-city-a514)
- BMC plans to buy 1,000 t of cold mix for ₹2.25 crore (about ₹22,500/t) after leasing out the Worli asphalt plant. Reported pothole spend fell from ₹89 crore to ₹42 crore — [FPJ](https://www.freepressjournal.in/mumbai/mumbai-bmc-to-procure-1000-metric-tonnes-cold-mix-for-225-crore-after-leasing-out-worli-asphalt-plant)
- Pothole complaints between 1 June and 15 July rose from 6,231 (2024) to 6,758 (2025) despite concretisation, and mastic use reportedly "drops sharply" — [FPJ](https://www.freepressjournal.in/mumbai/mumbai-over-6700-pothole-complaints-reported-despite-bmcs-concretisation-push-mastic-use-drops-sharply)

### Inferences
- **Cost per month of service:** CPM_m = (unit_cost_m + traffic-disruption cost) / E[life_m]. Estimate E[life_m] empirically from the work-order data as time-to-repeat-work-order on the same segment, by method. Use Kaplan–Meier (`lifelines`) with censoring at 31 Oct for patches that have not yet failed. This is the key "durability by method" evidence the dataset can produce, and it matters because the SHRP finding says quality beats cheapness.
- **Expected benefit of method m on segment i** over horizon H (e.g. the remaining monsoon in days): B_im = Risk_i × min(life_m, H)/H, or more fully B_im = Consequence_i × [P_fail_i(no action) − P_fail_i(after m)]. BCR_im = B_im / cost_im.
- **ILP (multiple-choice knapsack)**, exact and fast at this scale: max Σ_i Σ_m B_im x_im subject to Σ cost_im x_im ≤ Budget, Σ_m x_im ≤ 1 for each i, x binary. Optional side constraints: a ward minimum share (equity), "no cold mix if width > 6 m" (BMC rule), crew capacity per ward-week.
  ```python
  import pulp
  prob = pulp.LpProblem("next_rupee", pulp.LpMaximize)
  x = pulp.LpVariable.dicts("x", [(i,m) for i,m in opts], cat="Binary")
  prob += pulp.lpSum(B[i,m]*x[i,m] for i,m in opts)
  prob += pulp.lpSum(C[i,m]*x[i,m] for i,m in opts) <= BUDGET
  for i in segs: prob += pulp.lpSum(x[i,m] for m in methods_for[i]) <= 1
  prob.solve(pulp.PULP_CBC_CMD(msg=0))
  ```
  OR-Tools CP-SAT needs integer coefficients (scale by 100). `scipy.optimize.milp` (SciPy ≥1.9) works with the A matrix built by hand. All solve 291×4 binaries in under a second (general knowledge).
- **Greedy BCR** (HDM-4-style): sort by BCR and fill the budget. Use incremental BCR when upgrading a segment's method. Report the greedy-vs-ILP optimality gap as a validation item. It is usually small for many small items.
- **"Next rupee" curve:** sweep the budget from 0 to the full need, re-solve the ILP at each level, and plot cumulative expected benefit (risk averted) against spend. The slope at the current budget is the marginal value of the next rupee, the same idea as HDM-4's budget-boundary BCR. Also show which segments enter at each increment.
- LCCA proper (discounting, multi-year deterioration) is overkill for a 5-month window. A simple cost-per-month-of-life plus a monsoon-horizon cap is defensible.

### Gaps
- No independent, quantified service-life figures were found for mastic asphalt, cold mix, hot mix or M-60 in Mumbai conditions. Durability claims are from news or officials. The synthetic data's own repeat-failure intervals are the best available source.
- The detailed SHRP cost-effectiveness tables (patch survival by material) were not extracted.

## 3. Combining ML failure prediction with MCDA consequence (expected loss per rupee)

### Takeaway
The risk-based asset-management pattern in water and sewer utilities is mature: an ML model gives likelihood of failure (LoF), an MCDA score gives consequence of failure (CoF), and Risk = LoF × CoF is optimised per dollar. It reportedly beats age-based or heuristic ranking. Pavement-specific ML×MCDA evidence is thin. Recent bridge work warns that the outcome definition matters and that savings are modest unless precision is high.

### Cited Findings
- A Virginia Tech dissertation (2025) on water pipes scores LoF 0–5 with AI and models CoF separately (economic, environmental, social). A decision layer balances cost against risk. It reports that the integrated models beat age-based and heuristic baselines on accuracy and risk reduction per dollar — [VTechWorks](https://vtechworks.lib.vt.edu/items/67cb78b3-5e90-4eee-9df4-f736d84958b2/full)
- SINTEF/NTNU: pipe risk = break probability (Random Forest) × consequence (loss of hydraulic reliability) — [CORE](https://core.ac.uk/download/491283435.pdf)
- Water-main ML: pipes ranked by predicted failure probability were validated against actual breaks. Top-ranked areas overlapped real failures — [arXiv 2006.03385](https://arxiv.org/pdf/2006.03385)
- Boston Water and Sewer Commission: risk-based ranking reportedly cut the first-year lining budget from $17M to $11M (vendor claim) — [CDM Smith](https://cdmsmith.com/client-solutions/insights/risk-based-asset-ranking)
- Georgia Tech: a risk-benefit-cost framework for ranking ancillary transport assets (culverts, guardrails, markings) — [CORE](https://core.ac.uk/download/4763236.pdf)
- Bridges (NBI): XGBoost forecasting one-year-ahead poor-condition transitions gave "positive but modest" net savings, critically dependent on precision — [Frontiers in Built Environment 2026](https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2026.1685343/full). Vague deterioration targets were not predictable from inventory data, while specific targets were — [engrXiv 7703](https://engrxiv.org/preprint/view/7703)
- Sewer inspection: AUC alone is insufficient to judge prioritisation models (AUC 0.86 with F1 0.45) — [Penn State](https://pure.psu.edu/en/publications/inspection-prioritization-of-gravity-sanitary-sewer-systems-using/)

### Inferences
- Pipeline for this dataset: (1) build a segment × week panel with features: rolling 3/7-day rainfall, waterlogging-hotspot flag and hours, tide-high coincidence, traffic, pavement age and condition, days since last repair, last repair method, prior complaint count. (2) Label = any new work order or verified complaint in the next 7 or 14 days. (3) Use gradient boosting or logistic regression with calibrated probabilities (`CalibratedClassifierCV`, isotonic). Calibration matters because the probabilities multiply consequence. (4) Expected loss_i = P_i × CoF_i. (5) Benefit per rupee = (P_i − P_i,after_m) × CoF_i / cost_im, fed into the ILP in Section 2.
- Use complaint counts carefully. They are a noisy, exposure-biased proxy (more traffic and more vocal wards produce more complaints). Normalise per km and per vehicle, or model complaints with an offset (Poisson GLM with log(traffic × length)).
- For sparse accident history, shrink per-segment rates toward a group mean, empirical-Bayes style (the ANRAM precedent in Section 1). This prevents one accident from dominating.
- Keep the consequence weights fixed and explainable, and let ML handle only the likelihood. This separates "what is likely to break" (data-driven, validatable) from "how much it matters" (a value judgement, so use sensitivity analysis).

### Gaps
- No peer-reviewed pavement or pothole study was found that explicitly combines ML failure probability with an MCDA consequence score and reports validated accuracy. The evidence base is water, sewer and bridges.

## 4. Validating a ranking without ground-truth labels

### Takeaway
The standard pattern is a historical (temporal) backtest at a fixed capacity k, scored by precision@k or recall@k against later observed events, followed if possible by a field trial. San Jose housing inspections showed about 30% higher precision@500 than the existing tier system, later confirmed in a 4-month field trial. Complement it with weight-sensitivity and rank-stability analysis, agreement with an independent reference ranking (as the Indian TOPSIS/AHP-vs-IRC studies do with Spearman), and monotonicity checks.

### Cited Findings
- San Jose housing inspections: Precision@500 was the evaluation metric. A historical backtest showed about 30% precision gain over the existing tier system, confirmed in a 4-month 2017 field trial. Similar tools exist for NYC fire and Boston health inspections — [Rodolfa et al., arXiv 2105.06442](https://arxiv.org/pdf/2105.06442)
- DSSG "triage" framing: agencies must prioritise limited resources toward the entities most likely to have problems. Inspection data are biased and incomplete, because you only observe outcomes where you looked — [DSSG triage tutorial](https://dssg.github.io/triage/dirtyduck/inspections)
- Rank agreement with a reference ranking: Spearman 0.78 and Index of Agreement 0.88 (TOPSIS vs IRC) — [J. Rehab. Civil Eng. 2025](https://civiljournal.semnan.ac.ir/article_9114.html). Pearson 0.79 (MCDM vs condition-only) — [Springer review](https://link.springer.com/article/10.1007/s42947-025-00566-9)
- Weight-perturbation sensitivity is the usual stability check for TOPSIS — [Sustainability 15(20):14953](https://www.mdpi.com/2071-1050/15/20/14953/html)
- AUC is an inadequate sole metric for prioritisation — [Penn State sewer study](https://pure.psu.edu/en/publications/inspection-prioritization-of-gravity-sanitary-sewer-systems-using/)

### Inferences (validation protocol for the Jun–Oct 2025 synthetic data)
1. **Temporal backtest:** fit and score on Jun–Jul and evaluate on Aug–Sep, with Oct as a second fold (rolling origin). The outcome is new work orders, complaints or accidents per segment in the test window, normalised per km if segment lengths vary. Do not use test-window information to build features, which is leakage.
2. **Metrics at budget-relevant k** (k = the number of segments the budget can fund):
   - Precision@k = |top-k ∩ segments with ≥1 event| / k.
   - Recall@k = |top-k ∩ eventful segments| / |eventful segments|.
   - "Capture rate" = Σ events in top-k / Σ all events, i.e. the share of harm the money would have reached.
   - NDCG@k = DCG@k/IDCG@k, with DCG = Σ_{r=1..k} rel_r / log2(r+1) and rel = event count (or severity-weighted). `sklearn.metrics.ndcg_score`.
   - Spearman ρ and Kendall τ between score and outcome (`scipy.stats`).
   - A lift curve against baselines: random, worst-condition-first (IRC rule), most-complaints-last-period (status quo), and traffic-only. The model must beat "last period's complaints" to be worth anything.
3. **Bootstrap CIs** on precision@k (resample segments, 1,000 reps). With 291 segments, differences under about 5 percentage points are likely noise.
4. **Weight sensitivity:** perturb each consequence weight ±20–50%, or sample weights from a Dirichlet distribution centred on the chosen weights (e.g. 1,000 draws). Report (a) each segment's rank interval and P(in top-k), and (b) mean Jaccard overlap of the top-k sets. Segments in the top-k under over 90% of weight draws are robust picks, and those near 50% are the judgement calls to show decision-makers.
5. **Monotonicity and sanity tests** (unit-test style): raising rainfall, flood hours, traffic, accident count or proximity to schools and hospitals, with everything else fixed, must never lower the risk score. Repairing a segment with a durable method must lower its next-period risk. Gradient-boosting models can be constrained with `monotone_constraints` in LightGBM or XGBoost.
6. **Method agreement:** Kendall τ and top-k overlap between weighted-sum, TOPSIS and entropy-weighted variants. High agreement means the ranking is not an artefact of the aggregation choice.
7. **Expert or face-validity check:** show the top 10 with explanations (feature contributions, SHAP) and check against known hotspots (e.g. news-reported Andheri, Malad, Goregaon and Matunga clusters, if the synthetic data mimic Mumbai).
8. **Selection-bias caveat:** in the observed data, segments that were repaired change their future outcome. Backtests should either exclude repaired segments in the test window or count their pre-repair events. This is the "you only observe where you looked" issue (DSSG).

### Gaps
- No pavement-specific published precision@k backtest was found. The method is borrowed from DSSG inspection work.

## 5. Fairness and equity in civic road budget allocation

### Takeaway
There is an established, if small, literature. France-Mensah et al. formalise equity in maintenance-and-rehabilitation (M&R) programming via utilitarian, egalitarian, Rawlsian and "socialist" (need-based) objectives. Practitioners such as Dallas set floors, e.g. at least 20% of projects by lane-mile in equity priority areas. Socioeconomic disparities in road roughness have been documented. FHWA has introduced social equity as a third pillar of asset management.

### Cited Findings
- France-Mensah et al. propose four optimisation models for highway M&R programming based on egalitarian, utilitarian, socialist and Rawlsian equity theories — [UT Austin summary](https://sites.utexas.edu/uil/2024/04/07/integrating-social-equity-in-highway-maintenance-and-rehabilitation-programming-a-quantitative-approach); related budget allocation work in [ASCE J. Infrastructure Systems](https://ascelibrary.com/doi/10.1061/%28ASCE%29IS.1943-555X.0000689)
- Kothari et al. (2022): economics, environment and social equity as the three pillars of a pavement management plan. FHWA introduced social equity as a third aspect of asset-management decision-making — [TRID 1926340](https://trid.trb.org/view/1926340)
- Equity framework for transportation asset management: social equity is often overlooked in favour of economics and environment — [MDPI Algorithms 17(7):305](https://mdpi.com/1999-4893/17/7/305)
- Practice example: 10% of an annual budget to equity focus areas (modelled), and Dallas targets at least 20% of projects by lane-miles in Equity Priority Areas, with a score from race/ethnicity, socioeconomic status and social vulnerability — [IAM / Mott MacDonald presentation](https://theiam.org/media/4840/incorporating-additional-metrics-into-existing-asset-management-technology.pdf)
- Socioeconomic patterns in pavement condition (IRI), from data mining of national data (correlational) — [Michigan Tech](https://digitalcommons.mtu.edu/michigantech-p2/1848)
- Odoki & Odongo: a road maintenance fund allocation framework aimed at being equitable, transparent, justifiable and less biased — [UK gov / ReCAP](https://assets.publishing.service.gov.uk/media/57a09dcce5274a27b2001a4b/61280-OdokiJBOdongoMM-2016-DvlptOfOptimalRoadMaintenanceFundAllocationFramework-ICTRR2016Paper-ReCAP-v20160316.pdf)

### Inferences
- Complaint-driven ranking rewards vocal, high-connectivity wards. Mitigate by (a) normalising complaints per km, per resident or per vehicle, (b) using model-predicted risk rather than raw complaint counts, and (c) adding an exposure-independent harm term for vulnerable contexts: low-lying or flood-prone segments, and emergency access to hospitals and schools.
- Implement equity as ILP constraints, which are transparent. Options: a per-ward minimum share of budget proportional to need (Σ risk in ward) rather than to complaints; a Rawlsian constraint that no ward's residual risk per km exceeds X; or a Dallas-style floor (≥20% of spend in designated vulnerable wards). Report the "price of fairness" = optimal benefit unconstrained minus benefit with the equity constraint.
- Report outcome equity in the backtest: precision@k and capture rate per ward or per income or low-lying group, and a Gini coefficient or max/min ratio of allocated rupees per unit of risk across wards.

### Gaps
- No Indian or Mumbai-specific equity framework for road budgets was found.

## 6. Monsoon and flood-driven pothole formation: which features drive failure

### Takeaway
Primary quantitative evidence for Mumbai or Indian cities is essentially absent. Mechanistically, international flood-pavement studies show that **duration of inundation and saturation of base and subgrade** drive strength loss, with a critical-duration threshold. IRC:82 attributes potholes chiefly to loss of bitumen adhesion (stripping), water ingress and poor drainage. Mumbai news data show pothole counts spiking after extreme rain (>300 mm in 6 h) in specific suburbs. Feature priority by inference: cumulative and intense rainfall, waterlogging duration, drainage and low elevation, pavement age and surface type, heavy traffic, and prior patch method.

### Cited Findings
- IRC:82-2015: "The most common cause of pothole formation is loss of adhesion in bituminous wearing coat"; inadequate surface drainage is listed as a cause of distress. Guidance is to ensure surface water runs to drains rather than ponding along the pavement edge — [IRC:82-2015](https://law.resource.org/pub/in/bis/irc/irc.gov.in.082.2015.pdf)
- Flooded flexible pavements: time–depth–damage functions show flood duration, material combination and critical location are the most important parameters — [J. Transp. Eng. via TRID 1919383](https://trid.trb.org/View/1919383)
- A critical flood-duration threshold exists, beyond which the pavement is assumed severely damaged (through saturation and loss of asphalt tensile strength) — [US DOT ROSAP 78600](https://rosap.ntl.bts.gov/view/dot/78600/dot_78600_DS1.pdf)
- Subgrade CBR responds differently to inundation period and to repeated inundation events — [Jurnal Teknologi (UTM)](https://journals.utm.my/jurnalteknologi/article/view/4961)
- India-specific claim (secondhand, unverified): flood-induced failures cut road lifespan by up to 35% — [Redeemer's University repository](https://repository.run.edu.ng/bitstreams/bbbec6d4-90ef-4aaf-a0ac-e4383d40cc6b/download)
- Mumbai: after more than 300 mm of rain in 6 hours, potholes increased mainly in Andheri, Matunga, Goregaon and Malad. BMC ordered immediate inspections — [Free Press Journal](https://freepressjournal.in/mumbai/mumbai-faces-pothole-threat-after-record-300-mm-rainfall-bmc-orders-immediate-inspections-and-repairs)
- Mumbai civic data: 5,814 potholes reported 1 June–16 July (year should be verified in the article); asphalt and paver-block roads most affected — [FPJ](https://www.freepressjournal.in/mumbai/mumbai-heavy-rainfall-reignites-pothole-menace-5814-reported-in-july-says-civic-data)
- 442 new potholes in 24 hours during heavy rain — [Mumbai Live](https://www.mumbailive.com/en/civic/442-new-potholes-discovered-in-just-24-hours-in-mumbai-89676)
- Rain both causes and reveals potholes: water-filled potholes are invisible hazards, and intermittent rain delays repairs — [Asianet Newsable](https://newsable.asianetnews.com/india/mumbai-monsoon-potholes-hidden-water-traps-create-hazardous-roads-articleshow-e26zicr)
- A local drainage study (Malwani, Malad West) links waterlogging to poor maintenance, choked drains and plastic waste. It covers drainage, not potholes — [NKC journal](https://nkc.ac.in/uploaded_files/4%20-%20Ashley%20Fernandes.pdf)

### Inferences
- Candidate features, ranked by mechanistic support: (1) waterlogging duration and hotspot flag; (2) antecedent rainfall (3- and 7-day sums) and intensity (max hourly, or days >64.5 mm, the IMD "heavy rain" threshold, general knowledge and unverified here); (3) surface type, since asphalt and paver blocks are reported as most affected vs concrete; (4) age since last resurfacing and last patch method (cold mix likely shorter life); (5) heavy-vehicle traffic; (6) high tide coinciding with heavy rain, which blocks outfall drainage in Mumbai (plausible, but no source found here); (7) low elevation.
- Expect lagged effects: failures and complaints peak a few days after rain events, so test lags of 1–14 days in the model. Distinguish complaint lag (reporting) from physical failure.
- Because rain also delays repairs and hides potholes, complaints during heavy rain undercount. Use post-event windows.

### Gaps
- No peer-reviewed Mumbai or Indian quantitative rainfall-threshold or waterlogging-duration model for pothole formation was found. Thresholds must be learned from the synthetic data and flagged as such.
- No source was found quantifying the effect of tide on road failure in Mumbai.
