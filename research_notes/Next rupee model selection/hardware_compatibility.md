# Hardware and Toolchain Compatibility: MacBook M2 Pro vs Lenovo LOQ (RTX 5060 Laptop, 8 GB, sm_120)

Research date: 2026-11-21. Every claim has a source. Anything marked "[unverified]" comes from general knowledge, not a source fetched for these notes. Re-check it before relying on it.

## Q1. PyTorch on RTX 50-series / sm_120: minimum versions, CUDA wheels, install commands, uv and Python 3.13/3.14

### Takeaway
sm_120 has worked in stable PyTorch since 2.7.0 (April 2025, cu128 wheels). As of Nov 2026 the current stable is **PyTorch 2.14**. Its default wheel is **CUDA 13.0 (cu130)**, and the cu12.8/cu12.9 variants no longer exist. A plain `pip install torch` on Linux now gives a Blackwell-capable build, with no special index needed. On Windows, use the `cu130` index URL.

### Cited Findings
- Stable PyTorch has shipped with CUDA 12.8 (the first toolkit with sm_120) since 2.7.0, released April 2025. Older forum threads saying "sm_120 unsupported" predate that release. — [PyTorch forum: sm_120 RTX 5060](https://discuss.pytorch.org/t/pytorch-support-for-sm-120-nvidia-geforce-rtx-5060/220941); [Pytorch support for sm120 thread](https://discuss.pytorch.org/t/pytorch-support-for-sm120/216099)
- CUDA 12.8 added compiler support for SM_100, SM_101 and SM_120. — [NVIDIA CUDA 12.8 release notes](https://docs.nvidia.com/cuda/archive/12.8.0/cuda-toolkit-release-notes/index.html)
- The error that signals a wrong (pre-sm_120) build is "GPU is not compatible with the current PyTorch installation" or "no kernel image is available for execution on the device". — [NVIDIA forum: RTX 5090 no kernel image](https://forums.developer.nvidia.com/t/rtx-5090-no-kernel-image-is-available-for-execution-on-the-device/337381); [NVIDIA forum: RTX 5090 sm_120 unsupported](https://forums.developer.nvidia.com/t/rtx-5090-not-working-with-pytorch-and-stable-diffusion-sm-120-unsupported/338015)
- PyTorch 2.10 PyPI wheels defaulted to CUDA 12.x. CUDA 12.6, 12.8 and 13.0 variants were available for Linux x86, Linux aarch64 and Windows. — [Wheel Variants for PyTorch 2.10](https://dev-discuss.pytorch.org/t/wheel-variants-for-pytorch-release-2-10-published/3305)
- From PyTorch 2.11, `pip install torch` from PyPI installs CUDA 13.0 wheels by default on Linux x86_64 and aarch64. CUDA 13.0 supports only Turing (SM 7.5) and newer on Linux x86_64. — [Transitioning PyPI CUDA wheels to CUDA 13.0 (2.11)](https://dev-discuss.pytorch.org/t/transitioning-pypi-cuda-wheels-to-cuda-13-0-as-the-stable-release-2-11/3325)
- PyTorch 2.12 (post dated 2026-04-01) made CUDA 13.0.x stable on PyPI, made CUDA 13.2.x experimental on download.pytorch.org only, kept CUDA 12.6.3 as legacy, and **deprecated and removed CUDA 12.8**. The post lists Blackwell (10.0, 12.0) as supported on Linux x86_64 for both 13.0 and 13.2. — [Introducing CUDA 13.2 and Deprecating CUDA 12.8 (2.12)](https://dev-discuss.pytorch.org/t/introducing-cuda-13-2-and-deprecating-cuda-12-8-release-2-12/3337)
- PyTorch 2.13.0 went GA on 2026-07-08. CUDA 13.0 stayed the default, the 12.8/12.9 builds were removed, and Python 3.13t was dropped in favour of 3.14t. — [PyTorch 2.13.0 GA](https://dev-discuss.pytorch.org/t/pytorch-2-13-0-general-availability/3412.md); [Dropping Python 3.13t](https://dev-discuss.pytorch.org/t/dropping-python-3-13t-free-threaded-support-in-nightlies-and-in-the-future-pytorch-2-13-release/3386)
- **PyTorch 2.14** (blog dated 2026-09-17) ships CUDA 12.6, 13.0 and 13.2, with **CUDA 13.0 as the default wheel**, and supports **Python 3.10 to 3.15** (including 3.14t and 3.15t). Python 3.15 wheels are on download.pytorch.org only, not PyPI, and `torch.compile` raises a RuntimeError on Python 3.15. The blog says to stay on 3.14 or earlier if you need compile. The example index URL is `pip3 install torch --index-url https://download.pytorch.org/whl/cu130`. — [PyTorch 2.14 release blog](https://pytorch.org/blog/pytorch-2-14-release-blog/)
- From the week of 2026-09-28, nightlies dropped CUDA 13.0. Nightlies now build 13.2 (stable/default) and 13.4 (prototype). The post says "PyTorch 2.14 and earlier are unaffected" and "No GPU architecture support is lost." Pinned users should switch `cu130` to `cu132` for nightlies. — [Removing CUDA 13.0 builds from CI/CD](https://dev-discuss.pytorch.org/t/removing-cuda-13-0-builds-from-pytorch-ci-cd-starting-the-week-of-sept-28/3447)

### Inferences
- **Recommended pin for the LOQ:** `torch==2.14.*` on Python **3.12 or 3.13** (3.14 also works per the support matrix), using the cu130 build.
  - Linux (Arch): `pip install torch torchvision` gets cu130 from PyPI. To be explicit, add `--index-url https://download.pytorch.org/whl/cu130`.
  - Windows: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu130`. A plain PyPI install on Windows has historically been CPU-only [unverified for 2.14].
  - Verify with `python -c "import torch;print(torch.__version__, torch.version.cuda, torch.cuda.get_device_capability(), torch.cuda.get_arch_list())"`. The output should show `(12, 0)` and `sm_120` in the arch list.
- You do not need a system CUDA toolkit. The pip wheels bundle the CUDA runtime, and only the NVIDIA driver matters. CUDA 13.x needs an R580+ driver [unverified version number; check `nvidia-smi` shows "CUDA Version: 13.x"]. On Arch, the `nvidia-open` driver package is the usual one for Blackwell [unverified].
- Avoid copy-pasting old blog advice that uses `nightly/cu128`. cu128 no longer exists as a current build, and it is unnecessary now.
- **uv:** `uv pip install torch --torch-backend=auto` (uv ≥0.6.9 picks the CUDA index from the detected driver) or an explicit `[[tool.uv.index]]` pointing to `https://download.pytorch.org/whl/cu130` [unverified, from general knowledge of uv docs; not fetched].
- Avoid Python 3.15 for the hackathon (eager-only torch, and other libraries may lack wheels). Python 3.12 or 3.13 is the safe choice across torch, xgboost, lightgbm, catboost and tabpfn.

### Gaps
- I could not parse the pytorch.org "Get Started" selector page (rendered as shortcodes), so the exact selector output for Windows is not confirmed.
- I did not confirm the minimum NVIDIA driver version for CUDA 13.0 from NVIDIA docs.
- I did not fetch uv's own docs on `--torch-backend`.

## Q2. GPU support for LightGBM, XGBoost, CatBoost on Blackwell, and whether GPU helps at ~2,500 rows

### Takeaway
XGBoost's default Linux and Windows pip wheels are CUDA 13 builds and should run on sm_120 with `device="cuda"`. LightGBM's pip wheel has no CUDA build (that needs a source build). I found no source confirming sm_120 in CatBoost's GPU wheels. None of this matters much at ~2,500 rows: GPU overhead dominates, and CPU is as fast or faster. **Use CPU for all GBDTs on this dataset size.**

### Cited Findings
- XGBoost GPU docs: "CUDA >= 12.9 is required." Enable GPU with `device="cuda"` and `tree_method="hist"`, e.g. `XGBRegressor(tree_method="hist", device="cuda")`. — [XGBoost GPU Support](https://xgboost.readthedocs.io/en/stable/gpu/)
- XGBoost install docs: the default `pip install xgboost` wheel for Linux x86_64 and aarch64 is built with CUDA 13.x. `xgboost-cu12` is for drivers that support CUDA 12 but not 13. `xgboost-cpu` is a smaller CPU-only package. GPU wheels exist for Linux and Windows x86_64. **macOS (Intel and Apple Silicon) has no GPU support.** — [XGBoost Installation Guide](https://xgboost.readthedocs.io/en/stable/install.html)
- XGBoost docs note that without OpenMP it "will only use a single CPU core". The `brew install libomp` instruction appears in the R section, not the Python section. — [XGBoost Installation Guide](https://xgboost.readthedocs.io/en/stable/install.html)
- LightGBM: the CUDA version (`device_type=cuda`) "is a separate implementation" that you build with `cmake -B build -S . -DUSE_CUDA=ON`. It needs compute capability ≥6.0, you can set `-DCMAKE_CUDA_ARCHITECTURES`, and it "is not supported on macOS". The original GPU version is OpenCL (`device_type=gpu`). — [LightGBM Installation Guide](https://lightgbm.readthedocs.io/en/latest/Installation-Guide.html)
- LightGBM macOS build needs `brew install cmake libomp`. CMake searches Homebrew folders for OpenMP by default. — [LightGBM Installation Guide](https://lightgbm.readthedocs.io/en/latest/Installation-Guide.html)
- CatBoost has statically linked CUDA since v0.10, so its wheel carries its own CUDA runtime. — [CatBoost news: fast learning on GPU](https://catboost.ai/news/0-10-and-0-9-releases-review)
- No CatBoost release note found mentions sm_120 or Blackwell. — [CatBoost releases](https://www.github.com/catboost/catboost/releases)
- A PTX JIT failure was reported on an RTX 5090 (sm_120) with CUDA 13.0 in another project (GROMACS). This shows that binaries without native sm_120 SASS can fail or JIT slowly. — [GROMACS forum](https://gromacs.bioexcel.eu/t/rtx-5090-sm-120-ptx-jit-compilation-failure-with-cuda-13-0-gromacs-2025-3/12799); TensorFlow report of 30+ min PTX JIT on cc 12.0: [tensorflow#89272](https://github.com/tensorflow/tensorflow/issues/89272)
- **Small data and GPU:** for very small datasets, the time spent transferring data to the GPU and setting up parallel work can exceed the training time itself. — [Hackernoon: XGBoost GPU](https://hackernoon.com/stop-waiting-make-xgboost-46x-faster-with-one-parameter-change?source=rss). One XGBoost forum user saw CPU and GPU both take about 0.4 s, and a reply said the GPU needs training of more than 20 s to show a benefit. — [discuss.xgboost.ai: CPU faster than GPU](https://discuss.xgboost.ai/t/cpu-faster-than-gpu-using-xgb-and-xgbclassifier/1772). On a 75k-row dataset, a Stack Overflow user found the GPU much slower than CPU. — [SO mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/63442697/cpu-faster-than-gpu-using-xgb-and-xgbclassifier)
- GPU wins at scale: 40M rows took 18 min on GPU vs 3.2 h on CPU. — [Databricks blog](https://www.databricks.com/blog/2020/05/15/shrink-training-time-and-cost-using-nvidia-gpu-accelerated-xgboost-and-apache-spark-on-databricks.html)

### Inferences
- At 2,500 rows, a GBDT fit takes well under a second on CPU on either machine. GPU would add setup overhead plus some CatBoost/LightGBM compatibility risk for no gain. Set `device="cpu"` / `task_type="CPU"` / leave defaults, and use `n_jobs=-1`.
- The only case where the RTX 5060 could help GBDTs is a large hyperparameter sweep. Even then, running parallel CPU jobs (Optuna with `n_jobs`) is likely competitive on a 2,500-row dataset.
- If someone does try CatBoost `task_type="GPU"` on the 5060, a "no kernel image" error or a very slow first call means the wheel lacks sm_120. Fall back to CPU immediately rather than debugging.
- macOS: `pip install lightgbm` wheels for arm64 generally bundle or require libomp. If `import lightgbm` errors with `libomp.dylib` not found, run `brew install libomp` [the pip-wheel bundling detail is unverified; the brew fix is documented above for source builds].

### Gaps
- Exact current versions of XGBoost, LightGBM and CatBoost (Nov 2026) were not confirmed. The docs pages fetched don't state version numbers.
- I found no direct evidence (issue or release note) for or against sm_120 kernels in CatBoost's PyPI GPU wheel, or in LightGBM's experimental CUDA build.
- I found no benchmark specifically at about 2,500 rows on the RTX 5060 or M2 Pro. The conclusion is extrapolated from small-data reports.

## Q3. TabPFN: version, hardware requirements, CPU feasibility, MPS, install, weights/licence, offline use

### Takeaway
`pip install tabpfn`. The default model is now **TabPFN-3.5** (2.5, 2.6, 3 and 2 are still selectable). An 8 GB GPU "works well". On CPU, the v3/3.5 models allow up to **5,000 samples** by default (older versions allow 1,000), so 2,500 rows is fine on CPU, though slower. Apple MPS is supported. Weights need a one-time **PriorLabs login and licence acceptance** (`TABPFN_TOKEN` for headless use), not a HuggingFace token. Weights for v2.5 and later are **non-commercial**.

### Cited Findings
- README: "TabPFN-3.5 is used by default." TabPFN-3.5-Fast is a smaller, faster option. TabPFN-3, 2.6, 2.5 and 2 remain available. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- Install with `pip install tabpfn`. Python 3.10+ (3.10 to 3.14 listed). On macOS, Apple Silicon GPU support is included and **PyTorch 2.13 or newer is recommended**. On Windows with NVIDIA, install CUDA PyTorch first. For CPU-only, install CPU PyTorch first. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- Hardware: older GPUs with about 8 GB VRAM "work well", and 16 GB is needed for some large datasets. CPU: TabPFN-3/3.5/3.5-Fast allow up to 5,000 samples, older versions up to 1,000. `TABPFN_ALLOW_CPU_LARGE_DATASET=true` overrides the limit, but large CPU runs can be slow. MPS: `TABPFN_MPS_MEMORY_FRACTION` defaults to 0.7 to prevent macOS crashes. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- TabPFN-3.5 accepts up to 1,000,000 rows and 20,000 features. `ignore_pretraining_limits=True` bypasses the guardrail. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- TabPFN-2.5 paper: classification uses about 6.1 KB of GPU memory and 48.8 KB of CPU memory per training cell (rows × features), with regression about 25% less. Datasets up to about 160k×500 (classification) fit on an H100 80 GB with FP16 and FlashAttention-3. For OOM, predict in test batches of 1,000 to 10,000. Integrated GPUs, MPS and CPU are "only suitable for small datasets". — [TabPFN-2.5 paper (arXiv 2511.08667)](https://arxiv.org/html/2511.08667v2)
- R package docs note that MPS may be slower than CPU for some datasets. — [tabpfn R package PDF](https://archlinux.nic.cz/R/web/packages/tabpfn/tabpfn.pdf)
- Weights: downloaded automatically on the first `fit()`. A browser login via PriorLabs opens to accept the licence, and the token is cached locally. For headless/CI use, accept the licence at ux.priorlabs.ai (License tab) and set `TABPFN_TOKEN`. Data stays local. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- Offline: download `.safetensors` manually from HuggingFace or run `scripts/download_all_models.py`. Set `TABPFN_MODEL_CACHE_DIR` (default `~/.cache/tabpfn/` on Linux) or pass `model_path=` (keep the original filename). "TabPFN works offline once the weights are downloaded." — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- Licence: TabPFN-2.5, 2.6, 3, 3.5 and 3.5-Fast weights are non-commercial. TabPFN-2 weights use the Prior Labs License (Apache 2.0 plus attribution). The code is Apache 2.0. The 2.5 HuggingFace model page is gated (accept terms). — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md); [TabPFN-2.5 paper](https://arxiv.org/html/2511.08667v2)
- Hosted alternative: TabPFN Client offers free hosted inference for users without a GPU. — [TabPFN README via jsDelivr](https://cdn.jsdelivr.net/gh/priorlabs/tabpfn@main/README.md)

### Inferences
- Memory estimate at 2,500 rows × ~30 features is about 75k cells × 6.1 KB ≈ 0.46 GB of GPU memory, extrapolated from the 2.5 paper's per-cell figure. Newer models may differ. This fits comfortably in 8 GB VRAM and in M2 Pro unified memory.
- **Do the licence acceptance and weight download before the hackathon** (or first thing on day one) on both machines, and set `TABPFN_TOKEN` in `.env`. The browser-login flow is the most likely time sink. Copying `~/.cache/tabpfn/` between machines avoids a second download.
- Licence check: a hackathon demo is presumably non-commercial. If the project might be commercialised, TabPFN-2 (Apache plus attribution) is the safe checkpoint.
- TabPFN `fit` has no training step, so its cost is all in inference. Each `predict` over all 2,500 rows with ensembling is where GPU helps. With cross-validation (e.g. 5 folds × several configs), the RTX 5060 will be noticeably faster than CPU. M2 Pro MPS is a middle option.

### Gaps
- I found no published timing for TabPFN-3.5 on CPU or MPS at about 2,500 rows. Benchmark it on day one.
- I did not find the per-cell memory figures for TabPFN-3/3.5 (only 2.5).
- The exact current `tabpfn` package version number was not captured.

## Q4. Apple Silicon M2 Pro: PyTorch MPS maturity, GBDT arm64 performance, gotchas

### Takeaway
MPS is mature in PyTorch 2.13/2.14. Many ops have moved to native Metal kernels, and FlexAttention and linalg are now native. GBDTs run natively on arm64 CPU with no GPU option: XGBoost and LightGBM have no macOS GPU support. The main gotcha is OpenMP (`libomp`) for LightGBM and XGBoost.

### Cited Findings
- PyTorch 2.14 moved more MPS ops from MPSGraph to hand-written Metal kernels (index_add, argmax, conv3d, median and others), rewrote reductions, and added native Metal SVD, eigh, QR and Cholesky. That removes the mixed CPU/MPS round-trips that slowed numerical code. — [PyTorch 2.14 release blog](https://pytorch.org/blog/pytorch-2-14-release-blog/)
- PyTorch 2.14 also improved the MPS caching allocator (bucketing and placement heaps), shortened CPU→MPS copy paths, fixed an 8.5x slowdown in the `F.linear` decode path on bf16/fp16, and added a prefill-attention kernel using Metal Performance Primitives (macOS 26.2+). FlexAttention arrived on MPS in 2.13. — [PyTorch 2.14 release blog](https://pytorch.org/blog/pytorch-2-14-release-blog/)
- macOS torch wheels are published for Apple silicon (including Python 3.15 on download.pytorch.org). — [PyTorch 2.14 release blog](https://pytorch.org/blog/pytorch-2-14-release-blog/)
- XGBoost: macOS (Intel and Apple Silicon) has no GPU support. Without OpenMP it uses a single core, and `brew install libomp` fixes this. — [XGBoost Installation Guide](https://xgboost.readthedocs.io/en/stable/install.html)
- LightGBM: no GPU or CUDA build on macOS. Build or install with `brew install cmake libomp`, or `brew install lightgbm`. — [LightGBM Installation Guide](https://lightgbm.readthedocs.io/en/latest/Installation-Guide.html)
- TabPFN recommends PyTorch ≥2.13 on macOS for best performance, and caps MPS memory at 70% by default. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)

### Inferences
- On Mac: `brew install libomp` first, then `pip install torch xgboost lightgbm catboost tabpfn` (plain PyPI, arm64 wheels). Verify with `torch.backends.mps.is_available()`.
- Set `PYTORCH_ENABLE_MPS_FALLBACK=1` so any remaining unsupported op falls back to CPU instead of crashing [unverified that this env var is still relevant in 2.14, but it is harmless].
- The M2 Pro's performance cores make it a perfectly good GBDT/CV machine for 2,500 rows. Expect similar wall-clock to the LOQ's CPU for GBDTs.

### Gaps
- No head-to-head benchmark (M2 Pro vs a Ryzen/Intel laptop CPU) for GBDT training was found.
- Whether current LightGBM/XGBoost macOS arm64 pip wheels bundle libomp was not confirmed from a primary source.

## Q5. (Optional) Local LLM for Marathi/Hindi/Hinglish complaint parsing vs the Claude API

### Takeaway
A 4-bit ~8B model (e.g. Qwen3-8B) fits in 8 GB VRAM or on the M2 Pro via Ollama or llama.cpp, but **no source evaluates small models on Marathi**, and Indic quality is unverified. For a hackathon, the Claude API is the lower-risk choice for multilingual parsing. Keep a local model only as an offline or privacy fallback.

### Cited Findings
- Bharat-Tiny-LLM v3 (1.7B; Hindi, Hinglish, English) ships as a ~1.0 GB GGUF with an Ollama route. Its benchmarks are self-reported and cover Hindi only, not Marathi. — [HuggingFace: Bharat-Tiny-LLM-v3](https://huggingface.co/eulogik/Bharat-Tiny-LLM-v3)
- General 8 GB VRAM picks named in 2026 guides are Llama 3.1 8B, Qwen 2.5 7B and Gemma 2 9B. These guides do not evaluate Indic languages. — [localaimaster: best LLM 8GB VRAM](https://localaimaster.com/vram/best-llm-8gb-vram)
- About 9B at 6.6 GB (Q4) is described as the largest size that fits in 8 GB. — [Pinggy: small LLMs in 8GB](https://pinggy.io/amp/blog/small_llms_that_fit_in_8gb_memory/) (article has inconsistent model names, so treat it with caution)
- A vendor guide lists Qwen3-8B among top picks for Marathi/Hindi. That vendor list also includes 235B models, so it is of limited use. — [SiliconFlow: best open LLM for Marathi](https://www.siliconflow.com/articles/best-open-source-llm-for-marathi)
- Sarvam-1 is an Indian-language-focused LLM. — [Sarvam 1 blog](https://www.sarvam.ai/blogs/sarvam-1)
- llama.cpp has open issues on sm_120 builds (e.g. ptxas errors for MXFP4 instructions on sm_120, and an "Unsupported gpu architecture 'compute_sm_120'" error with a bad CMake flag). — [llama.cpp #19662](https://github.com/ggml-org/llama.cpp/issues/19662); [llama.cpp #20195](https://github.com/ggml-org/llama.cpp/issues/20195)

### Inferences
- If you go local, prebuilt Ollama is the least-friction route on both machines (Metal on Mac, CUDA on LOQ). It avoids compiling llama.cpp for sm_120. MLX is the Mac-native alternative.
- Complaint parsing (structured extraction from mixed-script Hinglish/Marathi) depends heavily on quality. Run the Claude API with a JSON schema or tool use as the main path, and test a local Qwen3-8B Q4 on 20 to 30 real samples only if time allows.

### Gaps
- I found no benchmark of 4 to 9B open models on Marathi or code-mixed Hinglish complaint extraction.
- Current Ollama version and its sm_120 support status were not verified.

## Q6. Recommended division of labour across the two machines

### Takeaway
The GPU barely matters for a 2,500-row tabular problem. Use the LOQ (RTX 5060) as the **TabPFN and anything-PyTorch box** and the M2 Pro as the **GBDT, feature-engineering, notebook and app/demo box**. Both machines can run the full stack on CPU if one setup breaks.

### Cited Findings
- GBDTs gain nothing from GPU at small sizes. — [discuss.xgboost.ai](https://discuss.xgboost.ai/t/cpu-faster-than-gpu-using-xgb-and-xgbclassifier/1772); [Hackernoon](https://hackernoon.com/stop-waiting-make-xgboost-46x-faster-with-one-parameter-change?source=rss)
- TabPFN works well on 8 GB VRAM GPUs. CPU is capped at 5,000 samples by default for v3/3.5, and MPS is supported. — [TabPFN README](https://raw.githubusercontent.com/PriorLabs/TabPFN/main/README.md)
- No macOS GPU support for XGBoost or LightGBM. — [XGBoost install](https://xgboost.readthedocs.io/en/stable/install.html); [LightGBM install](https://lightgbm.readthedocs.io/en/latest/Installation-Guide.html)
- PyTorch 2.14 default cu130 wheels cover Blackwell sm_120. — [PyTorch 2.14 blog](https://pytorch.org/blog/pytorch-2-14-release-blog/); [CUDA 13.2 / 12.8 deprecation post](https://dev-discuss.pytorch.org/t/introducing-cuda-13-2-and-deprecating-cuda-12-8-release-2-12/3337)

### Inferences
- **LOQ (RTX 5060, Linux/Windows):** TabPFN-3.5 fits and CV (GPU), any PyTorch MLP or embedding work, an optional local LLM via Ollama, and large Optuna sweeps (parallel CPU jobs).
- **M2 Pro:** EDA, feature engineering, LightGBM/XGBoost/CatBoost on CPU, SHAP, the demo app/frontend, and Claude API integration for complaint parsing. It can also run TabPFN on MPS or CPU as a backup.
- **Shared reproducibility:** one `pyproject.toml` with `python = "3.12"` (or 3.13), `torch==2.14.*`, and a platform-specific torch index only for Windows. Pin `tabpfn`, `xgboost`, `lightgbm` and `catboost` to whatever resolves on day 0, and lock with `uv lock`. Copy `~/.cache/tabpfn` between machines.
- **Ten-minute smoke test per machine:** (1) the torch device check above; (2) a 1-second XGBoost/LightGBM/CatBoost fit on random 2,500×30 data; (3) `TabPFNClassifier().fit(X,y).predict(X)` on the same data (this triggers the licence and weight download).

### Gaps
- Arch vs Windows on the LOQ was not determined. Driver install steps differ, and Arch NVIDIA packaging for Blackwell was not verified from a primary source.
