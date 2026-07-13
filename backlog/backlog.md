# 90-Day Project Backlog

Rules for the loop (see PLAYBOOK.md Step 1.5 — the selection protocol governs):
- **This is a candidate pool, not a queue.** Each morning: deep signal scan →
  slate (next 2 backlog items + signal-derived ideas) → score /12 → highest
  score builds. Displaced items shift forward; strong losers (≥8) get appended.
- **Days 14, 28, 42, …** are India Flagship days — slate drawn only from the
  India Flagship Pool below.
- `[F]` = flagship (bigger scope, extra polish — these get pinned).
- **Demo:** `pages` = live GitHub Pages demo (client-side AI, no API keys); `byok` = runs locally with user's own Azure/OpenAI key; `cli` = terminal tool, demo = GIF in README.
- Stack default: React 18 + TypeScript + Vite + Vitest. C#/.NET 8 where marked. CI must pass before publishing.

## India Flagship Pool (every 14th day — the "AI voice of India" series)
| Idea | Repo | Scope | Demo |
|---|---|---|---|
| [F] Bhasha Detect | `bhasha-detect` | Identify all 22 scheduled Indian languages + Hinglish in-browser; confusion-matrix explorer | pages |
| [F] Hinglish Bridge | `hinglish-bridge` | Real-time Hinglish ⇄ Devanagari transliteration + normalization as you type | pages |
| [F] Kisan Sahayak | `kisan-sahayak` | Bilingual (Hindi/English) RAG over public agri-scheme documents with citations | pages |
| [F] UPI Guard | `upi-guard` | ML.NET anomaly detection on synthetic UPI-scale transaction streams; pattern dashboard | cli |
| [F] India AI Pulse | `india-ai-pulse` | Live tracker: IndiaAI mission milestones, Indian model/startup releases, auto-updated weekly | pages |
| [F] Indic OCR Lab | `indic-ocr-lab` | Devanagari + Tamil OCR fully client-side; drop an image, get text | pages |

Refill rule: audits keep ≥4 unbuilt ideas here — India-scale problems,
Indic-language AI, IndiaAI-mission-adjacent, always demoable.

## Week 1 — AI in the browser (zero-key live demos)
| Day | Project | Repo | Scope | Demo |
|--:|---|---|---|---|
| 1 | Neural Notes | `neural-notes` | Semantic note search with transformers.js embeddings, 100% client-side | pages |
| 2 | Mood of the Room | `mood-of-the-room` | Real-time sentiment analysis of any pasted text/chat export; per-sentence heatmap | pages |
| 3 | Zero-Shot Tagger | `zero-shot-tagger` | Classify anything into user-defined labels, no training — zero-shot pipeline | pages |
| 4 | Summarize This | `summarize-this` | Client-side article/email summarizer with length control | pages |
| 5 | Similar or Not | `similar-or-not` | Embedding playground: visualize cosine similarity between texts on a 2D map | pages |
| 6 | Lingua Detect | `lingua-detect` | Language identification + confidence for 100 languages, offline | pages |
| 7 | [F] Ask My Docs | `ask-my-docs` | Full client-side RAG: drop PDFs, chunk, embed, retrieve, answer with WebLLM | pages |

## Week 2 — RAG engineering in TypeScript
| Day | Project | Repo | Scope | Demo |
|--:|---|---|---|---|
| 8 | Chunk Lab | `chunk-lab` | Interactive chunking-strategy visualizer (fixed/sentence/recursive/semantic) | pages |
| 9 | RAG Scorecard | `rag-scorecard` | Measure retrieval quality: precision@k, MRR on a sample corpus | pages |
| 10 | Hybrid Search | `hybrid-search-ts` | BM25 + vector fusion with reciprocal rank fusion, side-by-side results | pages |
| 11 | Cite Your Sources | `cite-your-sources` | RAG answers with inline citations + hallucination highlighting | pages |
| 12 | Reranker Demo | `reranker-demo` | Cross-encoder reranking vs raw vector search comparison | pages |
| 13 | Context Window Packer | `context-packer` | Token-budget optimizer: fit the best context into N tokens | pages |
| 14 | [F] RAG-in-a-Box | `rag-in-a-box` | Reusable TS library: pluggable chunkers/embedders/stores + docs site | pages |

## Week 3 — Agents & tool use
15 `prompt-chain-runner` — visual sequential-chain builder (pages) · 16 `tool-caller-ts` — function-calling loop from scratch, no framework (byok) · 17 `agent-scratchpad` — ReAct pattern visualized step-by-step (byok) · 18 `multi-agent-debate` — two agents argue, judge decides (byok) · 19 `agent-memory-store` — episodic + semantic memory for agents (cli) · 20 `browser-agent-sandbox` — agent operating a fake webshop UI (pages) · 21 [F] `kb-agent-framework` — minimal typed agent framework w/ tools, memory, tracing (byok)

## Week 4 — Azure OpenAI & Semantic Kernel (C#/.NET)
22 `sk-hello-kernel` — Semantic Kernel starter: plugins, planners (byok) · 23 `azure-rag-dotnet` — RAG over blob docs w/ Azure AI Search (byok) · 24 `sk-plugins-pack` — 5 reusable SK plugins (mail, calendar, summarize…) (byok) · 25 `token-meter-dotnet` — Azure OpenAI cost/token tracking middleware (cli) · 26 `prompt-templates-cs` — typed prompt template engine for .NET (cli) · 27 `azure-content-safety-demo` — moderation pipeline w/ Azure Content Safety (byok) · 28 [F] `enterprise-copilot-starter` — production-shaped .NET copilot API: auth, streaming, telemetry (byok)

## Week 5 — Classic ML with ML.NET (C#)
29 `mlnet-churn` — customer churn prediction + explainability (cli) · 30 `mlnet-price-predictor` — regression on housing data (cli) · 31 `mlnet-anomaly` — anomaly detection on server metrics (cli) · 32 `mlnet-recommender` — matrix-factorization product recommender (cli) · 33 `mlnet-image-classifier` — transfer learning classifier (cli) · 34 `mlnet-forecasting` — time-series SSA forecasting (cli) · 35 [F] `automl-benchmark-dotnet` — AutoML vs hand-tuned across 3 datasets, full writeup (cli)

## Week 6 — M365, Graph & enterprise AI
36 `graph-inbox-insights` — Graph API mailbox analytics (byok) · 37 `teams-standup-bot` — Teams bot posting AI standup summaries (byok) · 38 `sharepoint-doc-qa` — RAG over SharePoint libraries (byok) · 39 `m365-usage-dashboard` — React dashboard for Graph usage reports (byok) · 40 `outlook-triage-ai` — priority-classify email w/ rules+LLM hybrid (byok) · 41 `copilot-plugin-demo` — declarative Copilot extension sample (byok) · 42 [F] `m365-ai-toolkit` — CLI + library bundling the week's Graph/AI patterns (byok)

## Week 7 — Vision & audio in the browser
43 `webcam-object-detect` — real-time detection w/ ONNX runtime web (pages) · 44 `doodle-classifier` — draw-and-classify sketches (pages) · 45 `whisper-in-browser` — client-side speech-to-text (pages) · 46 `image-captioner` — describe any uploaded image (pages) · 47 `face-blur-tool` — privacy tool: auto-blur faces client-side (pages) · 48 `ocr-anywhere` — screenshot-to-text (pages) · 49 [F] `vision-playground` — unified multi-model vision workbench (pages)

## Week 8 — Evals, safety & guardrails
50 `prompt-injection-dojo` — attack/defense playground (pages) · 51 `llm-eval-harness-ts` — assertion-based eval runner (cli) · 52 `hallucination-detector` — claim-vs-source NLI checking (pages) · 53 `pii-scrubber` — client-side PII detection/redaction (pages) · 54 `jailbreak-taxonomy` — interactive catalog + tests (pages) · 55 `output-validator` — schema-constrained generation patterns (cli) · 56 [F] `ai-redteam-kit` — scripted red-team suite w/ scoring + report generator (cli)

## Week 9 — Data engineering for AI
57 `etl-ts-pipeline` — typed ETL w/ validation (cli) · 58 `synthetic-data-gen` — LLM-based synthetic tabular data (byok) · 59 `dedupe-embeddings` — near-duplicate detection at scale (cli) · 60 `data-quality-scanner` — profiling + drift reports (cli) · 61 `vector-db-bench` — compare 4 embedded vector stores (cli) · 62 `parquet-explorer` — browser Parquet viewer (pages) · 63 [F] `dataset-kitchen` — end-to-end corpus prep pipeline for RAG (cli)

## Week 10 — LLMOps & AI DevOps
64 `prompt-registry` — versioned prompts w/ diff view (pages) · 65 `llm-cache-proxy` — semantic caching gateway (cli) · 66 `canary-prompts` — CI action regression-testing prompts (cli) · 67 `latency-budget-dash` — LLM latency percentile dashboard (pages) · 68 `fallback-router` — multi-provider failover router (cli) · 69 `usage-cost-alerts` — spend anomaly alerting (cli) · 70 [F] `llmops-reference-stack` — the week's pieces composed, w/ architecture doc (cli)

## Week 11 — AI for the IT Director's world
71 `ticket-triage-ai` — ITSM ticket classify+route (byok) · 72 `runbook-generator` — incident → draft runbook (byok) · 73 `finops-analyzer` — cloud bill anomaly explain-er (cli) · 74 `policy-qa-bot` — RAG over IT policies (pages) · 75 `oncall-summarizer` — incident timeline digest (byok) · 76 `vendor-compare-ai` — structured RFP response comparison (byok) · 77 [F] `it-director-ai-playbook` — repo-as-book: patterns + all six tools packaged (pages)

## Week 12 — Local & small models
78 `webllm-chat` — fully local chat UI (pages) · 79 `slm-function-calling` — tool use on small models (cli) · 80 `quantization-explorer` — size/quality tradeoff visualizer (pages) · 81 `local-rag-phi` — RAG on Phi-class model, all local (cli) · 82 `distill-classifier` — LLM-labeled data → tiny fast model (cli) · 83 `edge-ai-benchmark` — device benchmark suite (pages) · 84 [F] `offline-ai-suite` — installable PWA bundling the week (pages)

## Week 13 — Capstones
85 `ai-portfolio-site` — this series as a generated website (pages) · 86 `kb-daily-builds-cli` — scaffold-a-day CLI others can use (cli) · 87 `agent-vs-agent-arena` — tournament w/ leaderboard (pages) · 88 `enterprise-rag-reference` — the definitive .NET RAG reference impl (byok) · 89 `ai-maturity-assessor` — org AI-readiness assessment tool (pages) · 90 [F] `ninety-days-of-ai` — interactive retrospective: every build, metric, lesson (pages)

## Signal-derived candidates (appended by the loop — score ≥8, lost the day)
| Idea | Repo | Scope | Demo | From |
|---|---|---|---|---|
| ~~Token Cost Lab~~ (BUILT day 4, 2026-07-11) | `token-cost-lab` | Client-side tokenizer + live cost comparison across GPT-5.6 (Terra/Luna), Claude Sonnet 5, Grok 4.5 using current July-2026 pricing; paste a prompt, see per-provider cost | pages | Won day 4 at 11/12 riding Grok 4.5 launch + GPT-5.6 GA |
| Prompt Compressor | `prompt-compressor` | Client-side prompt "token diet": paste a prompt, get a losslessly-compressed version with measured before/after token count + $ saved across models; serious counterpart to the trending "caveman" skill | pages | 2026-07-11 signal: `JuliusBrussee/caveman` #1 trending (82k★, token-efficiency meme); scored 10/12, lost to Token Cost Lab (overlap) |
| MCP Server Auditor | `mcp-auditor` | Paste an MCP server manifest/config: audit declared tool scopes, flag over-broad permissions, dangerous tool combos (filesystem+network = exfil path) and missing consent gates; the MCP-layer sibling to SkillScan | pages | 2026-07-12 signal: `ChromeDevTools/chrome-devtools-mcp` trending + MCP tool sprawl; scored 9/12, lost to SkillScan (12/12) |

## Refill rule
When ≤14 days remain, the weekly audit generates the next 30 ideas following the same arc: browser-demoable, Microsoft-stack, increasing ambition.
