# Demo script: Follow the Rupee

A spoken walkthrough of the site, about 3 minutes 30 seconds, followed by the algorithm behind each feature for questions.
Every number here comes from the pipeline output in `web/public/data/` (synthetic data). Speak the **Say** lines; **Show** is what is on screen.

---

## Part 1: The spoken demo (about 3:30)

### 0:00 The problem
**Show:** the home page, hero with the BMC head office.

**Say:**
> Every monsoon, Mumbai's wards spend crores fixing roads, and the same potholes come back.
> A ward officer with ten lakh rupees left has one question: what do I fix first?
> Follow the Rupee answers that for every ward, and shows why you should trust the answer.

### 0:15 The data, cleaned up
**Show:** scroll down to the map.

**Say:**
> We start from 6,501 citizen complaints, 2,499 repair jobs, 291 road segments, and the context: rain, tides, traffic, accidents, flood spots, schools and hospitals. All synthetic.
> Complaints come in English, Hinglish, Hindi and Marathi, and one in six has the wrong category. We fix the category from the text and photo, place each complaint on a road, and merge repeats.
> That leaves 589 open issues with no repair ordered.

### 0:40 The map
**Show:** the tabs, 3D, search "Sion".

**Say:**
> All 24 wards. Darker means riskier. A filled dot is paid for with the budget left; a ring is not. Switch to budget gap, see it in 3D, or search any ward or road.

### 0:55 The planner: the main tool
**Show:** choose Matunga, Sion, Wadala (ward F/N) and open its planner.

**Say:**
> This is the main tool. Matunga, Sion and Wadala: 39 open issues, 10.9 lakh left.
> Every issue gets a risk score out of 100 from three questions. How serious is it, 30 percent, from how fast BMC itself promises to fix that kind of problem. How likely is more trouble: flood risk 25, past trouble 15. And what is at stake: traffic, accidents, hospitals and schools, 10 each. Each factor is scaled 0 to 1 across all roads, weighted and added. No black box.

**Show:** the budget line; press 5 lakh; choose "Most risk covered".

**Say:**
> The budget line is the plan: each block is a repair, as wide as it costs, and the marker is where money runs out.
> At five lakh, riskiest first pays for 17 issues, 47 percent of the risk. Ask for the most risk covered and an exact solver finds the best mix: 26 issues, 66 percent, for the same money.
> Roads under warranty cost BMC nothing, so they are always included.

**Show:** open issue number 1, then "Change how risk is weighed".

**Say:**
> Open any issue to see the arithmetic, the repair method that fails least, a cost range and good contractors.
> The weights are a judgement, so you can change them, and each weighting shows how it did in our test.

### 2:15 Why trust it
**Show:** an issue's confidence label, then How it works.

**Say:**
> We built the ranking only from data before August, then checked which roads needed the most repairs in August and September.
> It gets each ward's top three right 46 percent of the time, against 25 by chance. That is about as good as counting past repairs city-wide, slightly better within a ward, and unlike a count it ranks roads with no history and explains itself.
> Each issue also says how sure we are: high, medium, or check on site.

### 2:45 The evidence behind the plan
**Show:** Audit, then Contractors, then Complaints.

**Say:**
> Behind the plan is the evidence. The audit flags bills worth a second look: far above the rate card, billed twice, or paid on roads under warranty. 3.77 crore across 622 jobs, billed, not proven lost, and every flag lists its jobs.
> Contractors are judged against what is expected for the same work, wards and weather. And any complaint can be followed to its repair and whether it held.

### 3:15 Claude, and close
**Say:**
> Claude helped us research the approach and writes the plain-language scorecards. Every number comes from code, and Claude's text is checked before use.
> The planner decides where the next rupee goes. The evidence shows why.

---

## Part 2: The algorithm behind each feature

### 1. From complaints to open issues
- **Category fix.** In order, first match wins: the category stated in helpline or portal text ("Pothole at ..."); the photo description, each of which maps to exactly one work type; keyword rules in English, Hinglish, Hindi and Marathi (for example *gaddha*, गड्ढा, खड्डा for pothole; *dhakkan*, झाकण for manhole); then the reported category. The reported category is wrong or vague for about 17% of complaints.
- **Road placement.** GPS to the nearest road segment within 400 m; otherwise the road name in the text; otherwise the locality. Checked against complaints whose road is known, GPS is right about 87% of the time, a road name about 54%, a locality about 32%. Of the 589 open issues, 323 are placed by GPS, 186 by name, 77 by locality and 3 not at all.
- **Merging.** Complaints about the same place and work type belong to one issue if each arrives within 14 days of the previous one. Result: 6,501 complaints become 3,529 issues; the 589 still Open or In Progress are ranked.

### 2. The risk score
`score = 100 × Σ (weight × factor) + tie-break`, every factor scaled 0 to 1 against all 291 roads.

| Question | Factor | Weight | How it is measured |
|---|---|---|---|
| How serious is it | Severity | 30% | From BMC's own promised fix time for the work type: 24 h scores 5 of 5, 168 h scores 1. Road cave-in 5.0, open manhole 4.8, waterlogging 3.9, choked drain 3.6, pothole 3.0, paver blocks 1.4 |
| How likely is more trouble | Flood risk | 25% | Half nearness to the closest flood hotspot, `exp(−distance / 500 m)`, ×1.2 if that hotspot is tide-sensitive; half the ward's low-lying index |
| | Past trouble | 15% | `0.7 × log(1 + complaints) + 0.3 × log(1 + repairs that failed)` on that road |
| What is at stake | Traffic | 10% | Congestion 50%, peak-hour vehicles 30%, BEST bus route 20% |
| | Accidents | 10% | `log(1 + road-defect accidents + 2 × fatal ones)` |
| | Hospitals and schools | 10% | `log(1 + 2 × emergency hospitals + schools)` that use the road |

A tie-break of up to 0.02 from public upvotes only separates exact ties. Issues with no road get their ward's median road.

**Why a weighted score and not a machine-learning model.** There is no answer key for where money should go, and in this data the location factors do not predict which repairs fail; the learnable signal is the contractor and the repair method. A transparent score can be explained, re-weighted and audited by a ward officer, and it is tested below.

### 3. Spending the budget
- **Budget left** = the ward's season budget minus what it has spent. Six wards are already over budget, so only free warranty repairs are paid there until the budget is raised.
- **Cost of each issue**: the typical (mean) cost of jobs with the chosen method, leaving out jobs billed above 1.4 times the rate card. The range is the middle half (25th to 75th percentile). If every paid job came in at the top of its range and the plan would overspend, the planner warns.
- **Repair method**: for each problem type, the method that failed least within 30 days (among methods used on at least 30 jobs). For potholes, hot mix patch fails 23% of the time (about ₹16,100) against 32% for cold mix (about ₹12,100).
- **Warranty (defect liability) roads** cost BMC nothing; the original contractor must repair them, so they are always included.
- **Riskiest first** (greedy): go down the ranking and pay for each issue that still fits; the first one that does not is the budget line; cheaper issues below it are paid from the leftover.
- **Most risk covered** (exact 0/1 knapsack): choose the set with the highest total score whose cost fits the budget. The pipeline solves it with an integer program (SciPy `milp`); the browser re-solves it instantly with dynamic programming in ₹100 steps, rounding costs up so it never overspends. It is tested against brute force. In 7 of the 24 wards riskiest first covers less risk than the best mix; in ward N it covers only 55% of what the best mix does.
- **Recommended contractors**: firms whose repairs fail at most three quarters as often as the city average; on warranty roads, the original contractor.
- The browser re-scores every issue from its raw factor values, so changing a weight re-ranks and re-plans instantly. It reproduces the pipeline's scores to within 0.06 points.

### 4. How it was tested (backtest)
- Build every input from data before 1 August 2025; measure what each of the 291 roads needed from 1 August to 30 September (repair jobs, complaints, failures, spend).
- **Rank agreement** (Spearman, −1 to 1) with the roads that needed the most repair jobs:

| Ranking | City-wide | Within a ward | Top 3 per ward right |
|---|---|---|---|
| Our default weights | 0.55 (95% range 0.46 to 0.63) | 0.35 | 46% |
| Past repair-job count | 0.60 | 0.31 | 49% |
| Past complaint count | 0.60 | 0.30 | 54% |
| Equal weights for location factors only | 0.38 | 0.22 | 36% |
| Random | 0 | 0 | 25% |

- Reading it honestly: city-wide the default is about as good as counting past repairs (the gap is inside the uncertainty), slightly better within a ward, and clearly better than ignoring past trouble. The brief's literal weighting (flood, traffic, accidents and facilities equal, no past trouble) scores 0.31; the likelihood-led preset scores 0.61. Seriousness cannot be backtested, because the data has no record of how bad a problem was; its weight is a stated judgement, which is why the weights are adjustable.

### 5. Confidence and rank ranges
- **Rank range**: each ward is re-ranked 1,000 times with every weight changed at random by up to ±50%; the range is the 5th to 95th percentile of the issue's rank. On average a ward's top three keep 82% of their members under these changes.
- **Confidence points**: road placed by GPS +2, by name +1, by locality 0; rank range within 2 places +2, within 5 places +1; reported by 2 or more complaints +1. High is 4 or more, medium 2 or more, otherwise "check on site". Across the city: 139 high, 351 medium, 99 check on site.

### 6. Audit flags (evidence)
- **Billed above the rate card**: normal jobs bill 0.75 to 1.3 times the rate card; a job is flagged only above 1.4 times (the data has a clean gap there). The amount at risk is the part above 1.3 times. 111 jobs, ₹44.7 lakh above the normal range.
- **Looks billed twice**: same road and work type within 7 days of an earlier job, with no complaint linked to the second job. 45 jobs, ₹25.9 lakh.
- **Paid on warranty roads**: BMC paid for road work on a stretch still under its defect liability period. 493 jobs, ₹2.62 crore. This is shown, and not used against the contractor, because it was BMC's decision to pay.
- **Context, not blame**: repairs that failed within 30 days (611) and fixes well after the promised time (486) are shown beside the city average. A late repair is flagged only at twice the promised time or more, and rated one level lower if heavy rain fell in between.
- Headline: ₹3.77 crore billed across 622 of 2,499 jobs, each job counted once. That is what those jobs billed, not money proven lost.

### 7. Contractor scorecards (evidence)
- **Expected rate** for each job: the city rate multiplied by context factors, then calibrated to the city total. Speed uses work type, heavy-rain window and low-lying ward; durability uses repair method, road surface and low-lying ward.
- A contractor is called better or worse than expected only when the gap is at least 2 standard errors; otherwise "in line with expectations". Failure rates carry a 95% Wilson interval.
- **Score**: durability 40%, billing 30%, speed 30%. Grades: A 80+, B 65+, C 50+, D 35+, else E. C means about as expected. Volume is never penalised.

### 8. Where Claude is used
- **Research**: a deep-research pass compared gradient boosting, tabular foundation models, survival models, multi-criteria indices and LLM ranking for this data; it is in `reports/`.
- **Narration**: Claude (`claude-sonnet-5-5`) writes the contractor scorecard text and ward summaries from facts the code supplies. Each text is checked: every number must be one we supplied (including numbers written as words), at most 120 words, the contractor must be named, and accusing words (fraud, corrupt, scam and others) are rejected. It gets two tries, then a deterministic template. Texts are cached, so the demo never calls the API live.
- **Building**: the pipeline and the site were built with Claude Code.

---

## Part 3: Likely questions

**Why not train a model on the data?**
There is no label for "where money should have gone". The repair outcomes are driven by contractor and method, not location, so a model would mostly learn who did the job. A weighted score is explainable, adjustable and backtested; it does about as well as the best simple baseline and better within a ward.

**Isn't counting past complaints just as good?**
City-wide, nearly. But a count cannot rank a road that has never had a complaint, ignores how dangerous a problem is, and gives an officer nothing to explain. Our score includes past trouble as one input and adds seriousness and impact.

**How do you avoid blaming a contractor unfairly?**
Each result is compared with what is expected for the same work, wards and weather, and only clear gaps (2 standard errors) get a verdict. Warranty payments are BMC's decision, so they are shown, not scored. Text is plain and non-accusing by rule.

**Is ₹3.77 crore money lost?**
No. It is what the flagged jobs billed. Each flag is a reason to check, with the job IDs to check it.

**What if a ward officer disagrees with the weights?**
They change them on the page. The plan re-ranks instantly, and the panel shows how that weighting did in the backtest.

**How sure are you about one particular issue?**
Look at its confidence and rank range. "Check on site" means the location was guessed from a locality; confirm before sending a crew.

---

## Numbers to remember

| | |
|---|---|
| Wards / road segments | 24 / 291 |
| Complaints → issues → open issues | 6,501 → 3,529 → 589 |
| Repair jobs | 2,499, ₹13.4 crore |
| Cost to fix all open issues / budget left city-wide | ₹1.95 crore / ₹1.77 crore |
| Wards already over budget | 6 |
| Weights | severity 30, flood 25, past trouble 15, traffic 10, accidents 10, facilities 10 |
| Backtest, default | 0.55 city, 0.35 within ward, top 3 right 46% (random 25%) |
| Confidence | 139 high, 351 medium, 99 check on site |
| Ward F/N demo | 39 open issues, ₹10.9 lakh left; at ₹5 lakh: 17 issues / 47% riskiest first, 26 issues / 66% most risk covered |
| Audit | ₹3.77 crore across 622 jobs; 493 warranty, 111 above rate card, 45 billed twice |
