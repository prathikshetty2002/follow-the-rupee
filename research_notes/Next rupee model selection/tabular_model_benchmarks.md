# Tabular model selection for small data (hundreds to ~10K rows), as of 2026-11-21

Context: hackathon team, about 5 hours, about 2,500 work orders and about 291 road segments. Targets are binary ("repair re-opened within 30 days") and counts (future complaints per segment). The data is temporal and grouped by segment, which matters a lot for which model wins (see Q2).

Source-quality note: the field moved fast in 2026 (TabICLv2 Feb, TabPFN-2.6 Mar, TabPFN-3 May, TabPFN-3.5 Sep, AutoGluon 1.6 Aug). Several 2026 numbers come from vendor technical reports or one secondary blog (Qlik Lab). These are flagged below. The live TabArena leaderboard (tabarena.ai, which redirects to huggingface.co/spaces/TabArena/leaderboard) renders dynamically and could not be fetched. Its numbers here come from AutoGluon release notes and third-party snapshots.

## Q1. GBMs vs tabular foundation models on small-data benchmarks: numbers and limits

### Takeaway
On IID small tables (under 10K rows), tabular foundation models now beat tuned and ensembled GBMs by a wide margin on TabArena, roughly 150 to 250+ Elo, with no tuning needed. The strongest tree model, LightGBM tuned and ensembled, scores about 1433 Elo, while RealTabPFN-2.5 scores about 1600 and AutoGluon 1.6 presets score 1745 to 1821. Elo scales differ between snapshots and benchmarks, so compare numbers only within the same table.

### Cited Findings
**TabArena (living benchmark; NeurIPS 2025 D&B spotlight; arXiv v1 20 Jun 2025, v4 3 Nov 2025)**
- Abstract findings: GBMs "remain strong" on practical datasets; deep learning catches up under larger time budgets with ensembling; foundation models do well on smaller datasets; cross-family ensembles advance the state of the art; validation method and ensembling of HPO configurations strongly affect results; some DL models are overrepresented in ensembles because of validation-set overfitting — [TabArena arXiv 2506.16791](https://arxiv.org/abs/2506.16791)
- Snapshot dated 2026-05-06 (third-party aggregator): RealTabPFN-2.5 (tuned + ensembled) at Elo 1604, rank 3. CatBoost tuned + ensembled 1418, CatBoost tuned 1407, CatBoost default 1368 — [benchmarklist TabArena](https://benchmarklist.com/benchmarks/tabarena_all/)
- Another aggregator (681-task "TabArena small" view): TabPFN-3 (Thinking) 1723, RealTabPFN-2.5 (tuned + ensembled) 1598, CatBoost (tuned + ensembled) 1362, CatBoost default 1312 — [SOTA2](https://www.sota2.com/research/sota/tabular-prediction-on-tabarena-small-full-681-tasks)
- Live-board summary: LightGBM (tuned + ensembled) 1433 is the strongest tree model; CatBoost default 1369 — [Codesota](https://www.codesota.com/tasks/tabular-ml). This is a secondary source.
- TabArena v0.1.8.3 (10 Sep 2026) anchors default Random Forest at 1000 Elo. The 2026-09-14 snapshot covers 51 datasets. TabPFN-3-Plus and Mitra-v2 are not on the board — [Qlik Lab blog](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). This is a secondary source.
- AutoGluon 1.6, TabArena-Lite (51 tasks): `noncommercial` preset Elo 1821 (improvability 5.8%, 159 s train); `extreme` 1745 (6.8%, 137 s); 1.5 `extreme` (4 h) 1638 (7.9%, 3758 s). In the 1.5 notes, on TabArena-All with 51 datasets, 1.5 `extreme` scored 1736 vs 1675 for 1.4 `extreme` — [AutoGluon What's New](https://auto.gluon.ai/dev/whats_new/index.html)
- Tuned and ensembled LightGBM/CatBoost need 400 to 1,350 s of tuning to land roughly 165 to 365 Elo below the leading foundation models. Per 1,000 rows, training time is 2.1 s for TabICLv2, 3.7 s for TabPFN-3 and 5.8 s for EXAONE Tabular — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). This is a secondary source.
- On small tables (1K to 10K rows), TabPFN-3 scores 1436 on BeyondArena, ahead of every tuned model. On medium tables (10K to 100K), zero-shot TabPFN-3 is within 45 Elo of the best tuned model. BeyondArena anchors default XGBoost at 1000, which is a different scale from TabArena — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)

**TabPFN line (Prior Labs)**
- TabPFN v2: Hollmann et al., Nature 637:319–326, Jan 2025. The paper says it "outperforms all previous methods on datasets with up to 10,000 samples by a wide margin" with much less training time — [PubMed](https://pubmed.ncbi.nlm.nih.gov/39780007/). An independent evaluation on more than 300 datasets (Ye et al.) found it struggles with large-scale, high-dimensional and many-class data — [A Closer Look at TabPFN v2](https://arxiv.org/html/2502.17361v1)
- TabPFN-2.5 (arXiv 11 Nov 2025, v2 5 Feb 2026) handles up to 50K rows and 2,000 features. It claims a "100% win rate against default XGBoost" on classification datasets of up to 10K rows and 500 features, and 87% on larger datasets up to 100K rows (85% for regression). It matches AutoGluon 1.4, a four-hour tuned ensemble — [TabPFN-2.5 arXiv 2511.08667](https://arxiv.org/abs/2511.08667). These are vendor claims, and the comparison is against *default* XGBoost, not tuned.
- TabPFN-2.6 (26 Mar 2026) supports up to 2,000 features and 100K rows. TabPFN-3 (12 May 2026) supports up to 1M rows but caps at 200 features — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)
- TabPFN-3.5 (arXiv 15 Sep 2026, v3 3 Nov 2026) claims SOTA on TabArena and gains over TabPFN-3, including on temporal and grouped (non-IID) splits. Variants are 3.5-Fast (up to 3x faster than TabPFN-3), 3.5-Plus (text, dates, multimodal) and 3.5-Thinking. The abstract gives no Elo numbers — [TabPFN-3.5 arXiv 2609.17895](https://arxiv.org/abs/2609.17895)
- The current `tabpfn` package defaults to TabPFN-3.5, with `TABPFN_MODEL_VERSION` values v2, v2.5, v2.6, v3, v3.5 and v3.5-fast. 3.5 and 3.5-Fast accept up to 1,000,000 rows and 20,000 features. **On CPU, v3/3.5 are limited to 5,000 samples by default (older versions 1,000)**; this can be overridden with `TABPFN_ALLOW_CPU_LARGE_DATASET=true`, but CPU is slow. A GPU with about 8 GB VRAM is fine — [PriorLabs/TabPFN GitHub](https://github.com/PriorLabs/TabPFN)

**TabICL / TabICLv2 (Inria/Soda)**
- TabICLv2 (arXiv 11 Feb 2026, ICML 2026) claims that, untuned, it surpasses RealTabPFN-2.5. It is pre-trained on up to 100 features, with inference demonstrated at 1M rows × 500 features. It is 10.6x faster than TabPFN-2.5 on an H100 at 50K samples and 11.8x faster on CPU at 10K samples — [TabICLv2 arXiv 2602.11139](https://arxiv.org/html/2602.11139v1)
- In its own paper TabICLv2 is reported second on TabArena (average rank 4.43) behind AutoGluon 1.5 extreme 4 h (3.83) — [search summary of TabICLv2 PDF](https://arxiv.org/pdf/2602.11139). This was not verified in the fetched HTML.
- Weights, prior and training recipe are BSD-3, which the source calls the only leading line that is fully open — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). The paper page itself states no license.

**Others**
- LimiX-2M (arXiv Jun 2026) is reported competitive with TabPFN-2.5 on BCCO, with higher AUC and accuracy on the classification set — [LimiX-2M arXiv 2606.04485](https://arxiv.org/pdf/2606.04485)
- Mitra, LimiX, TabDPT-Turbo and Nori are Apache-2.0. Google TabFM (30 Jun 2026, about 1.6B parameters, reportedly the top single model) and EXAONE Tabular are non-commercial. TabPFN-3-Plus has been API-only since May 2026 — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)
- A 19-dataset third-party benchmark puts LimiX-2 and Kumo-Tabular ahead of TabICLv2, Mitra-v2 and TabPFN-3 on Elo, but LimiX-2 took 111.9 s vs 3.1 s for TabICLv2 — [AIMultiple](https://aimultiple.com/tabular-models). This source is secondary, not peer-reviewed, and its 19 datasets are a small sample.

### Inferences
- At 2,500 rows (work orders) or 291 rows (segments), the task sits squarely in the regime where foundation models are strongest on IID splits. With 291 rows, GBMs especially are at high risk of overfitting, and foundation models' learned priors help most.
- The rankings among foundation models (TabPFN-3.5 vs TabICLv2 vs LimiX vs TabFM) are contested and mostly self-reported. The gap between any of them and tuned GBMs is more robust than the ordering within the group.

### Gaps
- I could not fetch the live TabArena leaderboard or its "small data" filter, so Elo and win-rate numbers come from secondary snapshots that disagree by tens of Elo.
- I found no independent TabArena numbers for TabPFN-3.5.
- Exact TabICLv2 results on datasets under 10K rows (Appendix K.7) were not retrieved.

## Q2. What the main papers say: where foundation models win and where tuned GBMs still win

### Takeaway
The older papers (2022–23) found trees were state of the art at about 10K rows, but already showed TabPFN tied with CatBoost at the top. Since 2025, foundation models clearly win on small and medium **IID** data. Tuned GBMs and tuned MLPs still win on **large, grouped or temporally shifted** data. A road-repair dataset with segment groups and time ordering falls into that harder zone, so the split you evaluate on decides the winner.

### Cited Findings
- **Grinsztajn, Oyallon and Varoquaux (NeurIPS 2022 D&B):** 45 datasets. Tree-based models remain SOTA on medium-sized data (about 10K samples), even ignoring speed. Neural nets struggle with uninformative features, rotation invariance (they don't preserve the data's orientation), and irregular target functions — [arXiv 2207.08815](https://arxiv.org/abs/2207.08815)
- **McElfresh et al. (NeurIPS 2023 D&B; v4 Jul 2024):** 19 algorithms × 176 datasets × 10 folds, more than half a million models. **CatBoost and TabPFN (v1) were the two best overall.** For about one third of datasets, light HPO on CatBoost or ResNet mattered more than which algorithm family was chosen. GBDTs beat NNs on irregular data and tend to win on larger datasets. TabPFN did well even on large datasets by subsampling 3,000 training points. The hardest 36 datasets were released as TabZilla — [arXiv 2305.02997](https://arxiv.org/abs/2305.02997)
- **TabArena (2025):** GBMs remain strong; foundation models excel on small datasets; cross-family ensembles are SOTA — [arXiv 2506.16791](https://arxiv.org/abs/2506.16791)
- **BeyondArena / "Beyond IID" (Purucker, Tschalzev, ..., Hutter; arXiv Jun 2026; NeurIPS 2026 poster):** 142 datasets, 11 models, IID, temporal and grouped splits. Open-source foundation models "are competitive or excel on datasets up to 100k rows", while tree-based and deep learning models "still dominate on grouped or large data" — [arXiv 2606.30410](https://arxiv.org/abs/2606.30410), [NeurIPS poster](https://neurips.cc/virtual/2026/poster/139490)
- A secondary summary of BeyondArena says foundation models trail tuned trees and tuned MLPs (RealMLP, TabM) especially under **temporal shift or grouped splits**. On data of 100K rows or more, GBDT/RealMLP/TabM score 1,230 to 1,350 vs 935 for TabPFN-3 and 724 for TabICLv2 — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). The abstract emphasizes "grouped or large". A later paper notes BeyondArena's temporal subset is confounded with dataset size — [search summary, OrionMoE/TabAbax refs](https://arxiv.org/pdf/2610.20418). So whether temporal shift alone hurts foundation models is contested.
- TabPFN-3.5 claims improvements specifically on temporal and grouped splits — [arXiv 2609.17895](https://arxiv.org/abs/2609.17895). This is a vendor claim with no independent replication found.
- SAP found that TabPFN, TabICL and ConTextTab rankings on public benchmarks did not transfer to internal enterprise tables, in either direction — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). This is single-source.

### Inferences
- For this project, evaluate with a **time-based split** (train on earlier work orders, test on later ones) and/or **GroupKFold by segment**. A random split will likely favor the foundation model more than reality warrants.
- Run both a foundation model and a GBM on the same honest split, and pick based on that result, not on leaderboards.

### Gaps
- I did not retrieve BeyondArena per-split Elo tables, so the size of the foundation-model deficit on temporal and grouped splits at under 10K rows is unknown.

## Q3. Licensing, access, offline use, AutoGluon one-liner

### Takeaway
TabPFN code is Apache-2.0, but **weights for 2.5, 2.6, 3, 3.5 and 3.5-Fast are non-commercial**. The download requires a Prior Labs login and license acceptance, or a `TABPFN_TOKEN` in headless setups. That is fine for a hackathon prototype, but it is a blocker for a production civic deployment without an enterprise license. TabPFN v2 weights, TabICLv2 (BSD-3), Mitra, LimiX and TabDPT (Apache-2.0) are commercially usable. AutoGluon 1.6 `extreme` uses only commercial-friendly models.

### Cited Findings
- Code is Apache-2.0. Weights for 2.5/2.6/3/3.5/3.5-Fast are non-commercial, each with its own license on HF. TabPFN-2 weights use the "Prior Labs License" (Apache 2.0 plus attribution). On first use, a browser opens to log in to Prior Labs and accept the license, and the token is cached. For headless or CI use, accept on ux.priorlabs.ai and set `TABPFN_TOKEN`; `TABPFN_NO_BROWSER` disables the popup. Offline use works via `scripts/download_all_models.py` or manual `.safetensors` download plus `model_path`/`TABPFN_MODEL_CACHE_DIR`. The README says data is not sent to Prior Labs. `tabpfn-client` offers free hosted inference if you have no GPU. Commercial use requires the Enterprise license (sales@priorlabs.ai) — [PriorLabs/TabPFN GitHub](https://github.com/PriorLabs/TabPFN)
- TabPFN-2.5 license: the model, its derivatives and its **outputs** cannot be used for commercial or production purposes. The license version is v1.0 in the paper but v1.1 on the HF card, which is a minor discrepancy — [TabPFN-2.5 arXiv](https://arxiv.org/pdf/2511.08667), [HF tabpfn_2_5](https://huggingface.co/Prior-Labs/tabpfn_2_5). The TabPFN-2.6 HF repo is gated under tabpfn-2.6-license-v1.0 — [HF tabpfn_2_6](https://huggingface.co/Prior-Labs/tabpfn_2_6)
- Prior Labs was acquired by SAP (announced 4 May 2026, completed 17 Jul 2026) — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). This is single-source and unverified.
- **AutoGluon:** in 1.6 (Aug 2026), `extreme` contains Nori, TabICLv2, TabDPT-Turbo and TabPrep-LightGBM, "every model in it is free for commercial use", and it is the recommended preset when a GPU is available. The `noncommercial` preset adds TabPFN-3. 1.6 `extreme` has a 67% win rate vs 1.5 `extreme` (27x faster training) and an **84% win rate vs `best` (4 h) with 65x faster training**. In 1.5 (about Dec 2025), `extreme` needs a GPU, ideally with at least 20 GB VRAM; RealTabPFN-2.5 is supported but not in any preset and requires accepting terms. In 1.4, the extreme portfolio was used only for datasets of 30K samples or fewer, with larger ones falling back to `best_quality`. The foundation-model extras require `pip install autogluon[tabarena]` — [AutoGluon What's New](https://auto.gluon.ai/dev/whats_new/index.html), [AutoGluon 1.5.0 notes](https://auto.gluon.ai/1.5/whats_new/v1.5.0.html)
- (Note: AutoGluon has renamed presets over versions. "best_quality" corresponds to what the 1.6 notes call `best`.)

### Inferences
- The fastest strong option is `TabularPredictor(label=..., eval_metric='roc_auc').fit(train, presets='extreme', time_limit=...)` on a GPU, or `presets='best'` on CPU. It is a one-liner and commercially clean. Pass a `groups` column or custom split for honest validation.
- If the hackathon outcome may become a city product, avoid relying on TabPFN ≥2.5 outputs without a license. Use TabICLv2 or GBMs instead.

### Gaps
- I did not find a TabArena number for `best`/`best_quality` alone; only relative win rates are given.
- I did not confirm whether `extreme` in 1.6 still restricts itself to 30K rows or fewer, which is irrelevant here at 2,500 rows.

## Q4. Ensembles and stacking of GBM + foundation model

### Takeaway
Cross-family ensembles are what top TabArena (AutoGluon presets are ensembles). However, the leading foundation models are highly redundant with each other, so stacking several of them adds very little (about +0.18% accuracy in one study). Simple greedy or weighted averaging of one GBM plus one foundation model is the sensible ceiling for a 5-hour build.

### Cited Findings
- "Ensembles across model families advance the state of the art"; caution about validation overfitting inflating some members' weights — [TabArena](https://arxiv.org/abs/2506.16791)
- Six leading models are near-redundant (mean pairwise Q-statistic 0.961). The best stacking scheme adds 0.18% accuracy at 253x the compute. Logistic-regression meta-learners **degrade log-loss**. Greedy (Caruana) selection, as AutoGluon uses, is recommended — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models). This is a secondary source; the primary study is not identified.
- AutoGluon 1.6 `noncommercial` (with TabPFN-3) reaches 1821 Elo vs 1745 for `extreme` without it, so adding TabPFN to an ensemble adds about 76 Elo on TabArena-Lite — [AutoGluon What's New](https://auto.gluon.ai/dev/whats_new/index.html)
- The TabPFN-2.5 distillation engine and "Pocket Foundation Models" distill a foundation model into a fast student (the latter into a CPU GBM keeping 96.5% of teacher AUC, 38–860x faster) — [TabPFN-2.5 arXiv](https://arxiv.org/abs/2511.08667), [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)

### Inferences
- Expect small gains (low single-digit AUC points at most, often less) from averaging a GBM with a foundation model at n≈2,500. With 291 segment rows, variance from cross-validation noise may swamp the ensemble gain. Use repeated CV.

### Gaps
- I found no quantified primary-source number for "GBM + TabPFN averaged" gains specifically on datasets under 5K rows.

## Q5. Calibration and interpretability

### Takeaway
GBMs plus TreeSHAP remain the easiest path to citizen-facing explanations. TabPFN has SHAP-based tools via `tabpfn-extensions`, but they are much slower (model-agnostic). TabPFN often has low ECE, but the evidence is mixed, and post-hoc calibration helps trees more than TabPFN.

### Cited Findings
- TabPFN interpretability uses `pip install tabpfn-extensions` with its `interpretability` module (SHAP explanations, feature importance, feature selection) — [PriorLabs/TabPFN GitHub](https://github.com/PriorLabs/TabPFN)
- TabPFN-2.0/2.5 zero-shot ECE is about 0.027 to 0.038 on TALENT and OpenML-CC18 — [TabTune arXiv 2511.02802](https://arxiv.org/pdf/2511.02802)
- Post-hoc calibration improved log-loss for tree models more than for TabPFN-2.6, and in one ablation it made TabPFN-2.6 worse — [Beyond IID arXiv 2606.30410](https://arxiv.org/pdf/2606.30410). This comes from a search summary and was not directly verified in the full text.
- A pre-registered 2026 simulation argues foundation models are "not a shortcut to calibrated clinical risk prediction". It notes TabPFN calibration degrades with rare outcomes and that ECE is biased in finite samples — [arXiv 2610.39065](https://arxiv.org/pdf/2610.39065)
- Foundation models post the best AUC but worse conformal coverage than trees, so calibration is needed for regulated use — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)
- In the SFT literature, fine-tuning non-TabPFN foundation models often raises calibration error — [Qlik Lab](https://www.qlik.com/blog/the-shift-to-table-native-foundation-models)

### Inferences
- If "re-opened within 30 days" is rare (for example under 10%), check reliability curves and the Brier score on the honest split. Apply isotonic or Platt calibration to the GBM via `CalibratedClassifierCV`.
- For explaining rankings to citizens, a LightGBM/CatBoost model with TreeSHAP waterfall plots (exact, fast) is more practical. If the foundation model wins on accuracy, a hybrid works: use it for the score and a GBM surrogate (or distilled student) for the explanation, but disclose that this is an approximation.

### Gaps
- I found no clean head-to-head ECE or Brier comparison of tuned GBM vs TabPFN on the same small datasets.

## Q6. Survival / time-to-failure framing; ranking objectives

### Takeaway
A survival framing (time until re-open, censored if not re-opened by the data cutoff) uses more information than a 30-day binary label. It handles recent work orders whose 30-day window has not closed yet, and it gives a full durability curve. With small n, Cox PH is a robust baseline and Random Survival Forest is often marginally better on C-index. The binary label is fine if every work order has a full 30-day follow-up and only that horizon matters. Ranking objectives (LambdaRank, rank:ndcg) are only worth it if the deliverable is a priority ordering of segments evaluated by NDCG. Otherwise rank by the predicted risk or count.

### Cited Findings
- A large neutral comparison of survival models on low-dimensional right-censored data found no method significantly outperforms Cox on discrimination; Cox is "simple and robust"; Oblique RSF is comparable — [arXiv 2406.04098](https://arxiv.org/html/2406.04098v1)
- RSF vs Cox (clinical trials, 2025): RSF usually has higher C-index, especially at smaller sample sizes, while Cox may be better calibrated. RSF is hurt more by high censoring, Cox more by small n — [arXiv 2502.03119](https://arxiv.org/abs/2502.03119)
- XGBoost AFT got the best C-index (0.7618) on about 45K colorectal cancer patients, ahead of gradient-boosted survival analysis and RSF. That is a large n, not a small-data result — [search result, arXiv 2510.24473](https://arxiv.org/abs/2510.24473v1)
- On a small dataset (PBC), traditional methods did reasonably well, and RSF beat tuned Cox by under 1% — [arXiv 2003.08820](https://arxiv.org/pdf/2003.08820)
- Tooling (official docs, not fetched this session): scikit-survival provides `CoxPHSurvivalAnalysis`, `RandomSurvivalForest`, `GradientBoostingSurvivalAnalysis` and concordance and integrated Brier metrics — [scikit-survival docs](https://scikit-survival.readthedocs.io/en/stable/). XGBoost has `survival:cox` and `survival:aft` objectives — [XGBoost AFT tutorial](https://xgboost.readthedocs.io/en/stable/tutorials/aft_survival_analysis.html). lifelines provides CoxPH and Kaplan-Meier — [lifelines docs](https://lifelines.readthedocs.io/). LightGBM provides `objective='lambdarank'` and `'poisson'`/`'tweedie'` for counts — [LightGBM parameters](https://lightgbm.readthedocs.io/en/latest/Parameters.html). XGBoost provides `rank:ndcg` and `count:poisson` — [XGBoost learning to rank](https://xgboost.readthedocs.io/en/stable/tutorials/learning_to_rank.html)

### Inferences
- For the complaint counts per segment (n=291), use a Poisson or Tweedie objective in LightGBM/CatBoost, or a Poisson GLM baseline. TabPFN regression is an alternative, but count-specific losses are not native to it.
- With 291 segments, a ranking objective has too few query groups to be useful. Pointwise risk scores ranked afterward, evaluated with NDCG@k or precision@k, are simpler and as good.
- Recommended 5-hour plan, which is my synthesis:
  1. Build features and an honest time/group split (1.5 h).
  2. Run a CatBoost or LightGBM baseline with light tuning, plus TabPFN-3.5 (GPU or tabpfn-client) or TabICLv2, both via AutoGluon `extreme` or directly (1.5 h).
  3. Average the two if CV shows a gain, then calibrate.
  4. Add TreeSHAP explanations.
  5. Optionally fit a Cox/RSF re-open-time model with scikit-survival as a durability-curve visual.

### Gaps
- I found no survival benchmarks specific to infrastructure or road repair.
- Survival support in tabular foundation models (for example, TabPFN survival extensions) was not researched.
