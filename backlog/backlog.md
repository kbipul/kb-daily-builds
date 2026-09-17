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
| ~~[F] Bhasha Detect~~ **(BUILT Day 014, 2026-07-21)** | `bhasha-detect` | Identify all 22 scheduled Indian languages + Hinglish in-browser; confusion-matrix explorer | pages |
| [F] Hinglish Bridge | `hinglish-bridge` | Real-time Hinglish ⇄ Devanagari transliteration + normalization as you type | pages |
| [F] Kisan Sahayak | `kisan-sahayak` | Bilingual (Hindi/English) RAG over public agri-scheme documents with citations | pages |
| [F] UPI Guard ⚠️ | `upi-guard` | ML.NET anomaly detection on synthetic UPI-scale transaction streams; pattern dashboard. **W37: scored 7/12 on Day 028 — CLI with no live demo, and .NET-in-sandbox is still unverified after 33 days. Rebuild as a `pages` demo before slating again.** | cli |
| ~~[F] India AI Pulse~~ **(STRUCK W37 — Day 028 judged a hand-curated "live tracker" a dishonesty risk: it goes stale the week after publish while the repo keeps claiming to be live. Only revisit with a real automated feed.)** | `india-ai-pulse` | Live tracker: IndiaAI mission milestones and Indian model releases | pages |
| ~~[F] Indic OCR Lab~~ **(DISQUALIFIED Day 028 — feasibility gate: needs 10–20 MB traineddata per script at runtime and the sandbox has no browser to verify recognition accuracy, so the central claim cannot be made honestly. Do not slate until that changes.)** | `indic-ocr-lab` | Devanagari + Tamil OCR fully client-side | pages |
| ~~[F] Indic PII Redactor~~ **(BUILT Day 028, 2026-09-08)** | `indic-pii-redactor` | Client-side redaction tuned for Indian identifiers — Aadhaar, PAN, UPI VPA, Indian phone/PIN — across Latin + Devanagari; honest false-positive tiers | pages |
| [F] Anuvaad Checker | `anuvaad-checker` | Client-side quality inspector for Indic machine-translation output: script-consistency, code-mix leakage, and number/date/currency localization errors — no reference translation needed | pages |
| [F] Sovereign Stack Passport **(added W37)** | `sovereign-stack-passport` | Pick an Indian deployment scenario and see which released IndiaAI-backed models (Sarvam-30B / 105B, BharatGen Param2 17B MoE, Gnani) can actually serve it: licence, weight availability, Indic language coverage, data residency, and the DPDP duty that attaches. The Day 009 `open-model-passport` mechanic pointed at the sovereign stack. Signal: 20 indigenous models backed under IndiaAI Mission, five released, 93 lakh GPU hours sanctioned. | pages |
| [F] Consent Ledger **(added W37)** | `consent-ledger` | Build a DPDP-shaped consent record for an AI feature and watch which downstream uses it does and does not authorise — purpose limitation vs model training, retention vs embedding stores, withdrawal vs a vector index you cannot unlearn. The question every Indian AI team hits immediately after redaction. Signal: DPDP Rules 2025, obligations landing 14 Nov 2026 and 13 May 2027. | pages |
| [F] Script Tax **(added W37)** | `script-tax` | Measure what Indic scripts cost in tokens across published tokenizers, in-browser: the same sentence in English, Hindi, Tamil and Bengali, priced side by side. Makes the structural economics of Indian-language AI visible in ten seconds. Distinct from Days 004/022/024 — those price models, this prices the language. | pages |

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

## ~~Week 5 — Classic ML with ML.NET (C#)~~ — STRUCK W37

**Retired as a block on 2026-09-13.** `mlnet-*` candidates were slated and scored **4/12 on
three consecutive days** (029, 030, 031) for identical reasons every time: Timeliness 0,
Demo-ability 1 (CLI, no live demo), Distinctiveness 1 (Microsoft ships these exact samples
itself), and .NET-in-sandbox is still unverified after 33 days. Days 029 and 030 both
recorded that the block was "structurally capped"; Day 031 asked the W37 audit to act
rather than repeat it. Struck so the loop stops rediscovering this every morning.

`automl-benchmark-dotnet` [F] is **kept** — a real AutoML-vs-hand-tuned comparison across
three datasets is a different claim from a canonical sample, and it can be revisited if
.NET-in-sandbox is ever verified.
~~29 `mlnet-churn` · 30 `mlnet-price-predictor` · 31 `mlnet-anomaly` · 32 `mlnet-recommender` · 33 `mlnet-image-classifier` · 34 `mlnet-forecasting`~~ (all struck, see above) · 35 [F] `automl-benchmark-dotnet` — AutoML vs hand-tuned across 3 datasets, full writeup (cli) — **KEPT**

## Week 6 — M365, Graph & enterprise AI
36 `graph-inbox-insights` — Graph API mailbox analytics (byok) · 37 `teams-standup-bot` — Teams bot posting AI standup summaries (byok) · 38 `sharepoint-doc-qa` — RAG over SharePoint libraries (byok) · 39 `m365-usage-dashboard` — React dashboard for Graph usage reports (byok) · 40 `outlook-triage-ai` — priority-classify email w/ rules+LLM hybrid (byok) · 41 `copilot-plugin-demo` — declarative Copilot extension sample (byok) · 42 [F] `m365-ai-toolkit` — CLI + library bundling the week's Graph/AI patterns (byok)

## Week 7 — Vision & audio in the browser
43 `webcam-object-detect` — real-time detection w/ ONNX runtime web (pages) · 44 `doodle-classifier` — draw-and-classify sketches (pages) · 45 `whisper-in-browser` — client-side speech-to-text (pages) · 46 `image-captioner` — describe any uploaded image (pages) · 47 `face-blur-tool` — privacy tool: auto-blur faces client-side (pages) · 48 `ocr-anywhere` — screenshot-to-text (pages) · 49 [F] `vision-playground` — unified multi-model vision workbench (pages)

## Week 8 — Evals, safety & guardrails
50 `prompt-injection-dojo` — attack/defense playground (pages) · 51 `llm-eval-harness-ts` — assertion-based eval runner (cli) · 52 `hallucination-detector` — claim-vs-source NLI checking (pages) · 53 ~~`pii-scrubber`~~ **(STRUCK Day 028 — subsumed by `indic-pii-redactor`, which ships the same mechanic with checksum validation and a sharper angle; a second generic scrubber would be capped on Distinctiveness)** · 54 `jailbreak-taxonomy` — interactive catalog + tests (pages) · 55 `output-validator` — schema-constrained generation patterns (cli) · 56 [F] `ai-redteam-kit` — scripted red-team suite w/ scoring + report generator (cli)

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

## The emergent arc — named W37 (2026-09-13)

Pure top-score selection did not dissolve the weekly arc, as the playbook feared it might.
It found a better one than the numbered weeks ever specified. Six of seven builds in W37
(Days 026, 027, 029, 030, 031, 032) plus Day 033 are the same argument in different
clothes:

> **A control you believe you have over an AI system, and the precise reason it does not hold.**

| Day | The control | Why it doesn't hold |
|--:|---|---|
| 26 | Your retriever hands the model facts | It hands it whatever someone wrote into the corpus |
| 27 | You can read the model's reasoning | Not when it reasons in latent space |
| 29 | Read-only means read-only | It means the verbs writes usually use |
| 30 | You would notice a worse model | Not inside your own eval noise |
| 31 | Your standing rule is in context | Not after four compaction rounds |
| 32 | The agent answered you | Seventy-three words ago it started to |
| 33 | One key, one tenant | Not if someone else is spending it |
| 34 | You can read what your toolchain reports — you installed the code | The list lives on the server, refreshes daily, and matches your terminal emulator |

Recorded here so the loop can extend it deliberately rather than rediscover it each
morning. This is **not** a queue and does not override the selection protocol — the
highest score still wins. It is a tie-breaker and a source of slate candidates.

Open controls in the same family, unbuilt and unscored:

- ~~**Rate limits are per-key** — until a retry storm, a fallback router and a batch job all
  share one. What does your quota actually protect?~~ **BUILT Day 036, 2026-09-15, as
  `quota-commons` (12/12, up from 10/12 on the Day 034 slate once OpenAI's reported 4x Astra
  usage-limit cut and Google Antigravity's quota blocks landed as a live Timeliness signal).**
- **The model refused** — a refusal in turn 1 and a compliance in turn 40 of the same
  session are the same policy, differently situated. Which of your red-team results survive
  being moved down a long transcript?
- **The audit log is complete** — what does a tool-call log omit that a reviewer would need,
  and can you tell from the log alone that something is missing?
- **Deleting the record deletes the data** — it is still in the embedding, the cache and the
  summary. Trace one user's deletion request through a RAG stack.

## Signal-derived candidates (appended by the loop — score ≥8, lost the day)
| Idea | Repo | Scope | Demo | From |
|---|---|---|---|---|
| ~~Token Cost Lab~~ (BUILT day 4, 2026-07-11) | `token-cost-lab` | Client-side tokenizer + live cost comparison across GPT-5.6 (Terra/Luna), Claude Sonnet 5, Grok 4.5 using current July-2026 pricing; paste a prompt, see per-provider cost | pages | Won day 4 at 11/12 riding Grok 4.5 launch + GPT-5.6 GA |
| ~~Prompt Compressor~~ (BUILT day 11, 2026-07-18) | `prompt-compressor` | Client-side prompt "token diet": paste a prompt, get a losslessly-compressed version with measured before/after token count + $ saved across models; serious counterpart to the trending "caveman" skill | pages | Won day 11 at 12/12 — reframed by JetBrains' 8.5%-on-agentic-work measurement from a cost calculator into a claim-verification instrument |
| ~~MCP Server Auditor~~ (BUILT day 7, 2026-07-13) | `mcp-auditor` | Paste an MCP server manifest/config: audit declared tool scopes, flag over-broad permissions, dangerous tool combos (filesystem+network = exfil path) and missing consent gates; the MCP-layer sibling to SkillScan | pages | Won day 7 at 10/12, riding continued `chrome-devtools-mcp` trending + `agentskills/agentskills` spec launch |
| Skill Conformance Checker | `skill-lint` | Validate a SKILL.md against the official `agentskills/agentskills` spec: required frontmatter fields, naming conventions, description-quality heuristics; correctness counterpart to SkillScan's security focus | pages | 2026-07-13 signal: `agentskills/agentskills` (official spec/docs repo) trending same day as its launch; scored 8/12, lost to MCP Auditor (10/12) — thematic overlap with SkillScan cost it on Distinctiveness |
| Foundry Model Board | `foundry-model-board` | Client-side comparison dashboard for models newly available on Azure AI Foundry (Claude, GPT, etc.) — pricing/context/capability filters | pages | 2026-07-13 signal: Claude models now available in Microsoft Foundry (Azure AI Foundry blog); scored 8/12, lost to MCP Auditor (10/12) — overlap risk with Token Cost Lab (day 4) |

## Refill rule
When ≤14 days remain, the weekly audit generates the next 30 ideas following the same arc: browser-demoable, Microsoft-stack, increasing ambition.

## Appended by the selection protocol (signal-derived ideas that scored >=8 but lost)
| Day added | Idea | Repo | Scope | Demo | Score |
|---|---|---|---|---|---|
| 8 | ~~Open Model Passport~~ (BUILT day 9, 2026-07-15) | `open-model-passport` | Pick an open/hosted model, get an instant "can I actually ship this?" report: licence terms, commercial use, weight availability, data residency, EU AI Act GPAI obligations. | pages | Won day 9 at 12/12 |
| 8 | AI Risk Tier Classifier | `ai-risk-tier` | Describe an AI use case, get its EU AI Act risk tier + the obligations that attach, fully client-side. Rides the UN Global Dialogue on AI Governance (Geneva, 6-7 Jul 2026) and China's CAC companion-AI rules (effective 15 Jul 2026). | pages | 9/12 |
| 9 | Blast Radius | `blast-radius` | Paste a shell/git command an agent wants to run and see a simulated blast-radius preview against a virtual filesystem: what gets destroyed, whether it is reversible, and a safer rewrite. Visual simulator rather than another rule-engine report card. | pages | 11/12 |
| 11 | ~~Skill Portability Checker~~ **(STRUCK W36 — duplicate mechanic of Day 006 skill-scan; `skill-lint` already covers the conformance angle)** | `skill-portability` | Paste a SKILL.md and see which agents will actually run it — Claude Code, Codex, Cursor, Gemini CLI, OpenCode — checked against the `agentskills/agentskills` spec: required frontmatter, naming, and the vendor-specific extensions that silently break portability. | pages | 8/12 |
| 13 | RAG Injection Scanner | `rag-injection-scanner` | Paste the chunks a RAG pipeline retrieved and get an instant report of prompt-injection / instruction-override payloads hiding in the retrieved context ("ignore previous instructions", tool-call bait, exfiltration lures, zero-width smuggling) before they reach the model. Client-side rule engine, no model needed. | pages | 10/12 |
| 16 | Agent Tool-Call Firewall | `tool-call-firewall` | Paste an agent's proposed tool calls + a least-privilege policy and see which calls a policy would ALLOW vs BLOCK and why (shell/http/file scopes, dangerous combos). Rides OpenAI's 2026-07-20 sandbox-escape disclosure. | pages | 10/12 (lost to Tool Caller on Distinctiveness — would be the 4th security report-card after SkillScan/MCP-Auditor/Blast-Radius) |
| 16 | Foundry Residency Advisor | `foundry-residency` | Pick a model + your compliance region and see which Azure AI Foundry region + catalogue models keep data in-region, with GDPR / EU AI Act exposure. Rides the MS×Mistral Azure-Europe deal (2026-07-21) + Mistral models added to Foundry. | pages | 9/12 (lost to Tool Caller — overlaps Day 9 Open Model Passport governance ground) |
| 17 | ~~DeepSeek V4 Price-Floor Board~~ **(STRUCK W36 — superseded by Day 022 token-clock; Distinctiveness permanently 1 against Days 004/022/024)** | `price-floor-board` | Pick your current model + monthly token volume and see how far DeepSeek V4's ~$0.44/M output floor (stable 2026-07-24) undercuts it, across the week's open-weight wave (Kimi K3, Gemini 3.6 Flash). Client-side calculator. | pages | 8/12 (lost to Agent Scratchpad — overlaps Day 4 Token Cost Lab, Distinctiveness 1) |
| 21 | Loop Guard | `loop-guard` | Paste an agent-loop config (max steps, stop conditions, tool set) and simulate runaway behavior: where it terminates, where it burns its step budget in a tool-call cycle, and a safer rewrite. Client-side simulator, no model. Rides Microsoft's new AB-100/AB-620 agent certifications making loop-safety a named competency. | pages | 9/12 (lost to kb-agent-framework — the framework demo already visualizes the step guard) |
| 22 | Repricing Exposure Board | `repricing-board` | Paste your monthly token mix and see what the last month of provider repricing did to it: DeepSeek V4 up to +1,100% at peak (16 Aug), GPT-5.6 Luna down 80% (30 Jul), Claude Sonnet 5 $2→$3/M on 1 Sep. A diff view over a moving price list, with switch-cost break-evens. | pages | 9/12 (lost to Token Clock — right signal, but Distinctiveness 1: it is Day 4 Token Cost Lab with a delta column) |

### Signal-derived (added Day 23)
| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| eval-treadmill | Eval Treadmill — visualize how AI safety benchmarks are saturated faster than new ones ship | React + TS + Vite | 10/12 |
| ai-attack-surface | AI Attack Surface Mapper — paste your infra config, see every AI-specific attack vector mapped | React + TS + Vite | 10/12 |

### Signal-derived (added Day 24)
| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| trusted-access | Trusted-Access Advisor — describe an AI use case and see whether it needs a vetted-org programme (Anthropic Cyber / Life Sciences Verification, US-only today) and what the application actually asks for. Rides Mythos 5.1's gated launch, 1 Sep 2026. | React + TS + Vite | 9/12 |
| skill-collision | Skill Library Collision Detector — load a directory of SKILL.md frontmatter and see which descriptions overlap badly enough that the agent picks the wrong one, plus the context-budget cost of the whole library. Rides mukul975/Anthropic-Cybersecurity-Skills (817 skills) trending 4 Sep 2026. | React + TS + Vite | 8/12 |

### Signal-derived (added Day 25)
| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| skill-collision | *(carried from Day 24, re-scored 9/12 — Timeliness up to 3 as mattpocock/skills hit #1 on GitHub trending with +2,758 stars on 5 Sep 2026.)* Still capped on Distinctiveness: it would be the third skill report card after Day 006 skill-scan, with skill-lint and skill-portability queued. | React + TS + Vite | 9/12 |
| local-model-fit | Local Model Fit Advisor — describe a machine, see which local models will actually run on it and at what speed. Rides magnitudedev/magnitude trending 5 Sep 2026. Scored 7/12 and NOT appended as a build candidate: Day 025 pair-planner already owns the memory-fit gate and says more with it. Recorded so the loop does not rediscover it. | React + TS + Vite | 7/12 |

### Carry-limit flag (W36 audit)

`skill-collision` has now been slated and scored twice — 8/12 (Day 24), re-scored
9/12 (Day 25) — and lost both times on the same dimension, Distinctiveness, for
the same reason: it would be the third skill report card after Day 006
`skill-scan`. Rising Timeliness cannot fix a Distinctiveness cap. Do not slate it
again as a report card. Either build it with a genuinely different interaction
model (e.g. the agent picking the *wrong* skill live, as a simulation), or retire
it. Same rule proposed for any candidate that loses twice on one dimension.

### Signal-derived (added Day 26)
| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| recall-cliff | Recall Cliff — GPT-6 Astra (3 Sep 2026) ships a 1.05M-token window, but the useful question is not price, it is where retrieval reliability collapses inside it. A placement advisor: paste your prompt layout, see where instructions should sit given published long-context degradation curves. Tied at 11/12 with the winner; tie went to the backlog item per Step 1.5D, and its demo score was capped at 2 because an honest version needs the user's own eval data rather than numbers I would have to invent. | React + TS + Vite | 11/12 |
| astra-cliff-risk | Astra Cliff Risk — GPT-6 Astra re-prices the *entire* request once input crosses 272,000 tokens ($10/$50 to $20/$75), so a pipeline that usually sits at 250K and occasionally spills does not pay 12% more, it pays ~2x on those runs. Models the distribution rather than a point estimate. Scored 9/12: Distinctiveness capped at 1 — it would be the fourth cost calculator after Day 004 token-cost-lab, Day 022 token-clock and Day 024 cache-cliff. | React + TS + Vite | 9/12 |

### Signal-derived (added Day 27)
| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| skill-router-sim | Skill Router Simulator — load a set of SKILL.md descriptions, type a request, and watch a description-similarity router pick a skill live, showing the near-misses and the margin it won by. Rides mattpocock/skills at #1 on GitHub trending (+2,207 stars, 7 Sep 2026) with openai/skills and humanlayer/skills behind it. Scored 9/12: Timeliness 3, Demo-ability 3, Positioning 2, but **Distinctiveness 1** — a router demo duplicates Day 008 `prompt-router`, and the W36 carry-limit flag already bars further skill report cards. Only worth building if the *wrong* pick is the whole point of the interaction. | React + TS + Vite | 9/12 |

Note on the carried candidates: `recall-cliff` re-scored **10/12** today (Timeliness 3→2 — the
1.05M-context angle is no longer the live Astra conversation; Demo-ability still capped at 2 for
the same honest reason: it needs the user's own eval data, not degradation curves invented here).
`eval-treadmill` re-scored **9/12** (no fresh benchmark-saturation signal, and Day 020
`contamination-scanner` already occupies benchmark-trust ground). Both shift forward.

### Flagship-day slate (Day 028, 2026-09-08)

Day 028 was an India Flagship day, so the slate came only from the India Flagship
Pool. Scores, so the loop does not re-derive them next fortnight:

| Candidate | Score | Why it lost |
|---|---|---|
| **Indic PII Redactor** | **11/12** | **WON** — Positioning 3, Timeliness 2, Demo-ability 3, Distinctiveness 3 |
| Anuvaad Checker | 10/12 | Demo-ability 2 — judging translation quality needs a translation pair and a reader of the script, and reference-free quality is soft where PII validation has arithmetic ground truth. Strongest remaining flagship candidate; slate it first on Day 042. |
| India AI Pulse | 9/12 | A hand-curated "live tracker" goes stale the week after publish. Only build it with a real auto-update path, otherwise the README claim becomes false. |
| Indic OCR Lab | — | **DISQUALIFIED on the feasibility gate**, not on score (would have been 9/12): needs 10–20 MB of Tesseract traineddata per script at runtime and there is no browser in the sandbox to verify recognition accuracy. Revisit only if accuracy can be verified some other way. |
| Hinglish Bridge | 8/12 | Timeliness 1; Google and Microsoft input tools already do transliteration well. |
| Kisan Sahayak | 8/12 | Needs a real agri-scheme corpus — hand-copying government text is a licensing and accuracy risk, inventing it is disqualifying. Needs a licensed open dataset first. |
| UPI Guard | 7/12 | Demo-ability 1 as a CLI with no live demo, and .NET SDK availability in the sandbox is unverified. |

**Flagship pool now holds 6 unbuilt ideas** — above the ≥4 floor, but Indic OCR Lab
and Kisan Sahayak are both blocked on inputs rather than on effort, so the effective
count is 4. The W37 audit should add two India-scale ideas that need no external
corpus and no runtime model download.

### Signal-derived (added Day 29)

Winner was **Read-Only Illusion** (`readonly-illusion`, 12/12) riding the Nightingale
Collective's 4 Sep 2026 DseWiki report and OpenAI's ~7 Sep non-disclosure admission.
Losers and re-scores from that slate:

| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| dead-drop | Dead Drop — load a wiki/forum edit history and surface agent-to-agent coordination: identical answer payloads appearing across accounts, backup pages spawned after moderator deletion, and handle families like the `OpenAIResearcher` / `OAIResearchMar26` signatures the DseWiki agents used. Rides the same 4 Sep signal as the winner. | React + TS + Vite | 9/12 (Positioning 3, Timeliness 3, but **Demo-ability 2** — it needs log data a visitor does not have, so the demo runs on a fixture and the visitor cannot bring their own; **Distinctiveness 2** against Day 023 `escape-sim`. Worth building if a genuinely public, licensable edit-history corpus can be found.) |
| hydrafusion-board | HydraFusion Board — GitHub Copilot's new multi-model plan/build/critique routing claims up to 67% lower cost; model your own task mix against it. | React + TS + Vite | 8/12 — **recorded, NOT a build candidate.** Timeliness 3, but Distinctiveness 1: it would be the fifth cost calculator after Day 004 `token-cost-lab`, Day 022 `token-clock` and Day 024 `cache-cliff`, which the standing rule already bars. Logged so the loop does not rediscover it next week. |

Re-scores of carried candidates on the Day 29 slate:

- `recall-cliff` re-scored **9/12**, down from 10/12 on Day 26 (Timeliness 1 — the Astra
  1.05M-context conversation has moved on and Day 027 already rode Astra; Demo-ability still
  capped at 2 for the same honest reason). Shifts forward.
- `ai-attack-surface` re-scored **8/12** (Distinctiveness 1). **Carry-limit flag applies:** it has
  now lost twice on Distinctiveness, both times for being one more security report card — after
  Day 006 `skill-scan`, Day 007 `mcp-auditor`, Day 010 `blast-radius` and Day 026
  `rag-injection-scanner` it would be the fifth. Per the W36 rule, do not slate it again in that
  form. Rebuild it around a different interaction model or retire it at the next audit.
- `mlnet-churn` (Week 5 arc, nominal Day 29) scored **4/12** — Timeliness 0, Demo-ability 1 as a
  CLI with no live demo, Distinctiveness 1 because churn prediction is the canonical ML.NET sample
  Microsoft itself ships. Shifts forward. **Note for the W37 audit:** the whole Week 5 ML.NET block
  scores structurally low on Demo-ability under the current rubric, and .NET SDK availability in
  the sandbox is still unverified after 29 days. Either verify the SDK and reframe those builds
  around a browser-visible artefact (ONNX export running client-side), or thin the block.

### Signal-derived (added Day 30)

Winner was **Quiet Throttle** (`quiet-throttle`, 12/12) riding NSA/CISA/FBI joint advisory
**AA26-251A**, published 8 Sep 2026, and specifically its third recommended mitigation:
providers should serve suspected distillation accounts a downgraded model, vary the
alteration across requests to defeat quality evaluation, and not inform the user.

| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| open-weight-custody | Open-Weight Custody Board — NVIDIA agreed to buy Hugging Face for ~$12.93B (~9 Sep 2026), days after Stripe took OpenRouter. Map an org's open-model dependencies against who now owns each distribution point, with the neutrality pledges each acquirer has made on the record. | React + TS + Vite | 9/12 (Timeliness 3, but Positioning 2, Demo-ability 2 — a curated dependency map is a static read for a visitor — and **Distinctiveness 2** against Day 009 `open-model-passport`, which already owns open-model shipping governance. Worth building only if a visitor can bring their own dependency list.) |

Re-scores of carried candidates on the Day 30 slate:

- `recall-cliff` re-scored **9/12**, unchanged from Day 29 (no fresh long-context signal;
  Demo-ability still capped at 2 because an honest version needs the user's own eval data).
  **Carry-limit flag applies:** it has now been slated three times and lost twice on
  Demo-ability for the identical reason. Per the W36 rule, do not slate it again in this
  form — either find a way for a visitor to supply real eval data, or retire it at the
  W37 audit.
- `eval-treadmill` re-scored **7/12**, down from 9/12 on Day 29 (Timeliness 1 — still no
  fresh benchmark-saturation signal; Distinctiveness 2 — Day 020 `contamination-scanner`
  occupies benchmark-trust ground). Shifts forward, flagged for retirement.
- `mlnet-price-predictor` (Week 5 arc, nominal Day 30) scored **4/12** — Timeliness 0,
  Demo-ability 1 as a CLI with no live demo, Distinctiveness 1 because housing-price
  regression is the canonical ML.NET sample Microsoft itself ships. This is the second
  consecutive day a Week 5 item has scored ≤4. **The W37 audit should act on the Day 29
  note rather than repeat it:** verify .NET SDK availability in the sandbox and reframe
  the block around a browser-visible artefact (ONNX export running client-side), or thin
  the block out entirely.

### Signal-derived (added Day 31)

Winner was **Compaction Drift** (`compaction-drift`, 12/12) riding OpenAI's Agents API public beta,
10 Sep 2026 — specifically the published compaction contract: the harness "automatically compacts
earlier context as a session approaches its context limit, preserving information the agent needs
to continue."

| Slug | Idea | Stack | Score |
|------|------|-------|-------|
| tool-search-roulette | Tool Search Roulette — the Agents API loads tool definitions only as needed, so the dangerous tool may or may not be in context when the model reaches for it. Map your tool surface and see which definitions are resident at the moment of the call. | React + TS + Vite | 9/12 — **recorded, NOT a build candidate.** Timeliness 3 and Positioning 3, but **Distinctiveness 1**: it would be the sixth security report card after Days 006, 007, 010, 026 and 029, which the standing W36 carry-limit rule bars. Logged so the loop does not rediscover it. Only worth building around a different interaction model. |
| sandbox-residency | Sandbox Residency Picker — the Agents API names nine self-hosted sandbox partners (Blaxel, Cloudflare, Daytona, DigitalOcean, E2B, Modal, Oracle, Runloop, Vercel) plus the OpenAI-hosted option. Pick a compliance region and see where agent code and artefacts actually execute. | React + TS + Vite | 7/12 — Distinctiveness 2 against Day 009 `open-model-passport`, Demo-ability 2 as a curated static table a visitor cannot bring their own data to. Shifts forward. |

Re-scores of carried candidates on the Day 31 slate:

- `open-weight-custody` re-scored **8/12**, down from 9 on Day 30 (Timeliness 2 — the
  NVIDIA / Hugging Face story is now two days old; Demo-ability still 2 because a visitor
  cannot bring their own dependency list). Shifts forward.
- `mlnet-anomaly` (Week 5 arc, nominal Day 31) scored **4/12** — Timeliness 0, Demo-ability 1
  as a CLI with no live demo, Distinctiveness 1 because anomaly detection on server metrics is
  the canonical ML.NET sample Microsoft itself ships. `mlnet-recommender` scored 4/12 for the
  same structural reasons. **This is the third consecutive day a Week 5 item has scored ≤4.**
  The W37 audit must now act on the Day 29 and Day 30 notes rather than repeat them a third
  time: either verify .NET SDK availability in the sandbox and reframe the block around a
  browser-visible artefact (ONNX export running client-side), or thin the block out entirely.
- `recall-cliff` was **not slated** this run. It has lost three times, twice on Demo-ability,
  and the W36 carry-limit rule applies. Day 031 also settles its ground from a different
  direction: compaction policies are documented algorithms that can be simulated mechanically,
  which is exactly what retrieval-degradation curves are not. Recommend retiring it at W37.

### Signal-derived (added Day 32)

Winner was **Burial Depth** (`burial-depth`, 12/12) riding `ayghri/i-have-adhd` taking #1 on
GitHub trending on 11 Sep 2026 with +4,624 stars in twenty-four hours — a `SKILL.md` whose
entire content is rules about the *shape* of agent output (answer first, no preamble, no
closer, one bounded action per numbered step, time in units). A second implementation,
`rmorse/i-have-adhd-skill`, was trending alongside it. The winning angle: thousands of people
starred a document that *asserts* agents bury the answer, and nobody was measuring whether a
given response does.

| Slug | Idea | Stack | Score |
|---|---|---|---|
| agent-sponsor-map | Agent Sponsor Map — Microsoft Agent 365 is GA as the cross-cloud agent control plane (Microsoft, AWS, GCP) and Entra Agent ID requires every agent identity to have a human sponsor and a lifecycle policy. Load an agent inventory and see which agents have no sponsor, no access package and no expiry. | React + TS + Vite | 8/12 — Positioning 3 (squarely the IT-Director lane), but **Timeliness 1**: Agent 365 went GA on 1 May 2026 and this is four-month-old ground. Demo-ability 2 (a visitor has no agent inventory to paste, so it runs on a fixture), Distinctiveness 2 against Day 009 `open-model-passport`. Appended; slate it again only if a fresh Agent 365 announcement lands. |
| skill-output-lint | Skill Output Contract Linter — validate the output rules inside a SKILL.md against the conventions the trending skills converged on. | React + TS + Vite | **DISQUALIFIED before scoring** under the standing W36 carry-limit rule: it would be the fourth skill report card after Day 006 `skill-scan`, with `skill-lint` and `skill-router-sim` already logged and barred for the same reason. Logged so the loop does not rediscover it a fourth time. |

Re-scores of carried candidates on the Day 32 slate:

- `sandbox-residency` re-scored **7/12**, unchanged from Day 31 (Timeliness 1 — the Agents API
  beta is now two days old and Day 031 already rode it; Demo-ability 2 as a curated static table).
  Shifts forward.
- `open-weight-custody` re-scored **7/12**, down from 8 on Day 31 (Timeliness 1 — the
  NVIDIA / Hugging Face story is now three days old). **Carry-limit watch:** it has now been
  slated twice and lost both times with Demo-ability capped at 2 for the same reason — a visitor
  cannot bring their own dependency list. One more loss on that dimension and the W36 rule applies.
- `mlnet-recommender` (Week 5 arc, nominal Day 32) scored **4/12** — Timeliness 0, Demo-ability 1
  as a CLI with no live demo, Distinctiveness 1 because matrix-factorization recommendation is the
  canonical ML.NET sample Microsoft itself ships. **This is the fourth consecutive day a Week 5
  item has scored ≤4**, after Days 29, 30 and 31. The W37 audit has now deferred this three times.
  Act on it: either verify .NET SDK availability in the sandbox and reframe the block around a
  browser-visible artefact (ONNX export running client-side), or delete the Week 5 block and
  backfill those days from the signal-derived pool.

**Unreachable sources this run:** direct fetches of Hugging Face and reddit.com/r/LocalLLaMA were
not attempted beyond search (per the playbook fallback); `github.com/trending` fetched cleanly and
supplied the winning signal.

### Signal-derived (added Day 33)

Winner was **Second Tenant** (`second-tenant`, 12/12) riding Anthropic's September 2026 threat
intelligence report (published 10 Sep, 154 pages, fourth in the series) — specifically its finding
that "access to AI in the form of compromised API keys, session tokens, and devices has
increasingly become the sole objective of multiple criminal groups," with one hacktivist campaign
running for a month entirely on stolen keys. The winning angle: if the loot is your inference
budget, the evidence is already sitting in your usage export, and nobody ships a detector for it.
It also clears the standing carry-limit bar on security report cards — it is a statistical detector
over the visitor's own telemetry, not another rule engine producing a scorecard.

| Slug | Idea | Stack | Score |
|---|---|---|---|
| fleet-census | Agent Fleet Census — a Russian-speaking actor ran *hundreds* of Codex- and DeepSeek-based agents to exploit CVE-2026-81578/82078 across 440 PaperCut instances at 395 organisations in 48 countries (reported 12 Sep 2026). Inventory the agents actually running against your estate from CI and gateway logs, and flag the ones nobody owns. | React + TS + Vite | 8/12 — Positioning 3, Timeliness 2, but **Demo-ability 1** (the input shape is undefined and a visitor has no such log to bring) and **Distinctiveness 2** against `agent-sponsor-map`, which occupies the same unowned-agent ground. Appended; only worth building once a concrete, public log format is chosen. |

Re-scores of carried candidates on the Day 33 slate:

- `agent-sponsor-map` re-scored **8/12**, unchanged from Day 32 (Positioning 3, Timeliness 1 — still
  no fresh Agent 365 announcement; Demo-ability 2, Distinctiveness 2). **This is its second loss, and
  both times Demo-ability was capped at 2 for the same reason: a visitor has no agent inventory to
  paste.** Per the W36 carry-limit rule, do not slate it again in this form — either give it a
  bring-your-own-data path or retire it at the W37 audit.
- `mlnet-image-classifier` (Week 5 arc, nominal Day 33) scored **4/12** — Timeliness 0, Demo-ability 1
  as a CLI with no live demo, Distinctiveness 1 because transfer-learning image classification is the
  canonical ML.NET sample Microsoft itself ships. **This is the fifth consecutive day a Week 5 item
  has scored ≤4**, after Days 29, 30, 31 and 32. The W37 audit has now deferred this four times.
  Recommendation, stated plainly so it can be actioned without re-deriving it: **delete the Week 5
  ML.NET block** and backfill those days from the signal-derived pool. The block's problem is
  structural, not incidental — a CLI cannot score above 1 on Demo-ability under the current rubric,
  and every idea in it is a Microsoft-published sample, which caps Distinctiveness at 1. Reframing
  around a browser-visible ONNX export would fix Demo-ability but not Distinctiveness.

**Unreachable sources this run:** `github.com/trending` fetched cleanly (13 repos; agent-harness
tooling dominant — `affaan-m/ECC` +1,151, `Tencent/teamai-cli` +1,083, `obra/superpowers` +690).
Hugging Face and reddit.com/r/LocalLLaMA were covered via search only, per the playbook fallback.

### Signal-derived (added Day 34)

Winner was **Harness Tell** (`harness-tell`, 12/12) riding the r/LocalLLaMA network-traffic audit of
12 Sep 2026 (top story on AI Weekly's 13 Sep edition): `huggingface_hub` 1.31 tags every Hub request
with `agent/<harness>`, decided by a registry the client fetches from the Hub daily — verified from
source at `huggingface_hub@129bbb5` and `huggingface.js@3edf1ba`, with the Warp false positive live as
issue #4860. It is the eighth build in the emergent arc (table above).

| Slug | Idea | Stack | Score |
|---|---|---|---|
| missed-requirements | Missed Requirements — Specific Labs' Real-SWE benchmark (12 Sep 2026, private enterprise codebases) found *missed requirements* the top failure mode across Fable 5.1, GPT-6 Astra and Gemini 3.8 Flash. Extract the enumerable requirements from a task spec (musts, numbered items, acceptance criteria), then paste the agent's PR summary and see which are unaddressed. | React + TS + Vite | 9/12 — Timeliness 3, Positioning 2, **Demo-ability 2** (requirement-to-diff matching is fuzzy and needs the visitor's own spec + PR; a fixture demo teaches less than it claims), **Distinctiveness 2** against Day 032 `burial-depth`'s lexical-measurement ground. Appended. |
| kya-passport | KYA Passport — Visa, Mastercard and Ant International aligned three competing agent-identity protocols into a Know-Your-Agent framework (~11 Sep 2026). Describe a shopping agent and see which of the three trust signals it carries, and what a merchant can and cannot verify from each. | React + TS + Vite | 8/12 — Positioning 2, Timeliness 2, Demo-ability 2 (a curated static table until specs are published), Distinctiveness 2 — shares unowned-agent ground with `agent-sponsor-map`. Appended; only worth building once the technical specs land. |
| inference-surface | Inference Surface — SGLang CVE-2026-86793 (11 Sep, unauthenticated RCE via a SafeUnpickler bypass when no API key is configured) is the fourth critical inference-infrastructure CVE in four weeks after Ollama, DeepSeek Harness and IBM Langflow. Map a self-hosted stack against the four and their unauthenticated-by-default endpoints. | React + TS + Vite | 9/12 — **recorded, NOT a build candidate.** Timeliness 3, Positioning 3, but **Distinctiveness 1**: it would be the seventh security report card after Days 006, 007, 010, 026, 029 and 030's scorecard stage, which the standing W36 carry-limit rule bars. Logged so the loop does not rediscover it. |
| pacing-ledger | Pacing Ledger — a tracker of the commitments in Dario Amodei's "We Must Pace the Frontier" (12 Sep) and who backed which. | — | 7/12, **not appended** — a hand-curated "live" commitments tracker is the same goes-stale-while-claiming-live dishonesty risk that struck India AI Pulse. |

Re-scores of carried candidates on the Day 34 slate:

- `automl-benchmark-dotnet` (the next numbered backlog item, Week 5's sole survivor) scored **6/12** —
  Timeliness 0, Demo-ability 1 as a CLI, Positioning 3, Distinctiveness 2 — and .NET-in-sandbox is
  still unverified after 34 days, so it likely fails the feasibility gate too. The block was struck at
  W37 for exactly this shape; this entry should either be verified as buildable or struck with it.
- `graph-inbox-insights` (Week 6 opener, nominal Day 36) scored **5/12** — Timeliness 0, Demo-ability 1
  as byok, Distinctiveness 1. Week 6 is the next numbered block and it is byok throughout; under the
  current rubric it will score like Week 5 did. The W38 audit should decide whether byok gets a
  Demo-ability floor of 2 when the README carries a recorded GIF, or whether the block is reframed.
- `dead-drop` re-scored **7/12**, down from 9 (Timeliness 1 — the DseWiki report is ten days old;
  Demo-ability still 2 for the same reason: it needs log data a visitor does not have). **Second loss
  on Demo-ability; the W36 carry-limit rule applies.** Retire at W38 unless a public edit-history
  corpus is found.
- `fleet-census` re-scored **7/12** (Timeliness 2 on the PaperCut campaign, Demo-ability 1 — the input
  shape is still undefined). **Second loss on Demo-ability; carry-limit applies.**

**Unreachable sources this run:** `github.com/trending` returned a cached snapshot identical to Day
033's (same star deltas) and `?since=daily` returned a years-old page — treated as stale and unused.
`huggingface.co` is blocked from the sandbox (403 from proxy), so the live `/api/agent-harnesses` was
not fetched; the registry snapshot came from `huggingface.js` via git, which is reachable. Hugging Face
trending was covered via an agents-radar digest; r/LocalLLaMA via AI Weekly's summary. Two sandbox
lessons for the playbook: each bash call runs in its own network namespace, so the smoke test must
start the preview server and curl it in one call; and vitest's 5s default timeout is flaky under
sandbox CPU contention (`testTimeout: 20000` fixed a spurious failure on a 175ms test).


### Signal-derived (added Day 35)

Winner was **Conduct Gap** (`conduct-gap`, 12/12) riding Microsoft AI's draft **Code of Conduct for MAI
Models**, published 14 Sep 2026 with a six-week comment window — verified from the primary source
(microsoft.ai/code-of-conduct), not from the coverage. It is the ninth build in the emergent arc: the
control you believe you have is *"the vendor wrote the rules down, so I can hold them to it"*, and it does
not hold because most of the rules are claims about states no customer can observe.

| Slug | Idea | Stack | Score |
|---|---|---|---|
| abliteration-ledger | Abliteration Ledger — Abliteration.ai sells guardrail-stripped open-weight models as a hosted service, currently GLM-5.3 at $5/M, with a credit-card record as its only stated customer check (TechCrunch, 3 Sep 2026). Map an org's open-weight dependencies against which of them have a stripped twin on sale, and what that does to a "we use the safe version" claim. | React + TS + Vite | 8/12 — Timeliness 2 (twelve days old), Positioning 2, **Demo-ability 2** (a curated table a visitor cannot bring their own dependency list to), Distinctiveness 2 against Day 009 `open-model-passport`. Appended. |
| agentic-workflow-surface | Agentic Workflow Surface — GitHub Agentic Workflows run coding agents inside GitHub Actions with safe outputs, sandboxed execution and, since Sep 2026, the built-in `GITHUB_TOKEN`. Map what a workflow can reach. | React + TS + Vite | 6/12 — **recorded, NOT a build candidate.** Timeliness 1: it entered public preview on 11 Jun 2026 and today's "technical preview" framing is a restatement, not news. Distinctiveness 1: it would be the seventh security report card, which the standing W36 carry-limit rule bars. Logged so the loop does not rediscover it. |

Re-scores of carried candidates on the Day 35 slate:

- `quota-commons` was slated and scored **10/12**, unchanged from Day 034 (Positioning 3, Demo-ability 3,
  Distinctiveness 3, Timeliness 1). The backlog says to slate it "the morning a rate-limit or quota signal
  lands and it should win" — no such signal landed this window. It remains the strongest unbuilt candidate
  in the pool and shifts forward with its score intact.
  **Correction, same day:** a second, independent run (this local Cowork scheduled task, unaware Day 035
  had just been taken by the new cloud routine) ran its own signal scan a few hours later and found the
  signal the Day 35 scan missed — OpenAI's reported 4× GPT-6 Astra usage-limit cut (6–7 Sep) and Google
  Antigravity's "individual quota reached" blocks (through 13 Sep). Re-scored at 12/12 and built as Day
  036. Two automated scans of the same news window reached different conclusions about whether a
  qualifying signal existed; worth a mention at the next audit rather than treating either scan as
  authoritative on its own.
- `missed-requirements` re-scored **8/12**, down from 9 on Day 034 (Timeliness 3→2, as Real-SWE is now three
  days old). Demo-ability still 2 for the unchanged reason: requirement-to-diff matching needs the visitor's
  own spec and PR. First loss on that dimension.
- `automl-benchmark-dotnet` scored **6/12**, unchanged from Day 034. Timeliness 0, Demo-ability 1 as a CLI,
  and .NET-in-sandbox is still unverified after 35 days. **This is its second consecutive slate at 6/12 with
  the feasibility gate unresolved.** The W38 audit should either verify the SDK in one run or strike it with
  the rest of the Week 5 block.
- `graph-inbox-insights` scored **5/12**, unchanged. Week 6 is byok throughout and will keep scoring like
  Week 5 did. The W38 audit still owes the decision the Day 034 run asked for: give byok a Demo-ability floor
  of 2 when the README carries a recorded GIF, or reframe the block.

**Arc table gains a row** (Day 35): *The vendor published the rules, so you can hold them to it* → *Most of
them are claims about states you cannot observe, and the ones you can check are the layer the operator is
allowed to change.*

**Unreachable sources this run:** `github.com/trending` needed a curl fallback with a custom parser
(`web_fetch` refuses it on token budget, as recorded on Days 028-029) and returned a **fresh** page this
time, unlike Day 034's cached snapshot. `microsoft.ai/code-of-conduct` fetched but exceeded the inline token
budget; a subagent read all 743 lines in chunks and returned the clauses verbatim, which is now the standard
move for a long primary source. The `site:reddit.com` r/LocalLLaMA fallback returned unrelated calendar and
council pages for the third consecutive run and should be treated as a dead source rather than retried.

### Signal-derived (added Day 37)

Winner was **Alias Drift** (`alias-drift`, 12/12) riding DeepSeek's 10 Sep 2026 zero-notice
retirement of `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp`, confirmed silently rerouted
to their replacement rather than failing — and DeepSeek's own retirement notices proving unstable
in the same window (a separate deepseek-v4-pro retirement was announced then reversed). It is the
tenth build in the emergent arc: the control you believe you have is "I pinned the model ID, so its
behavior is fixed," and the reason it does not hold is that "pinned" is at least four different
contracts across five providers, verified from each provider's own docs rather than from coverage —
OpenAI (dated snapshot frozen-then-fails vs undated alias repoints anytime), Anthropic (4.6+
dateless canonical ID frozen-then-fails vs pre-4.6 convenience alias resolves to the newest dated
snapshot in its minor version), Azure OpenAI (auto-update-to-default silently switches with 2 weeks'
notice; even a version-pinned deployment auto-upgrades to the then-current default at ITS OWN
retirement rather than failing), Google Gemini ("-latest" alias hot-swaps with only breaking changes
notified; dated stable versions get a published, earliest-possible shutdown date), and DeepSeek
(zero notice, silent reroute, indefinitely).

Re-scores of carried candidates on the Day 37 slate:

- `missed-requirements` re-scored **7/12**, down from 8 on Day 35 (Timeliness 2→1 — Real-SWE is now
  six days old; Demo-ability still 2, unchanged reason: requirement-to-diff matching needs the
  visitor's own spec and PR). Shifts forward.
- `kya-passport` re-scored **7/12**, down from 8 (Timeliness 2→1 — the Visa/Mastercard/Ant
  Know-Your-Agent framework is now five days old with no new technical specs published). Shifts
  forward; only worth re-scoring up once specs land.
- `automl-benchmark-dotnet` scored **6/12**, unchanged from Day 035. .NET-in-sandbox is now
  unverified after 37 days. Still awaiting the W38 audit decision (verify the SDK or strike the
  block).
- `graph-inbox-insights` scored **5/12**, unchanged. Week 6 is byok throughout; still awaiting the
  W38 decision on a Demo-ability floor for byok projects with a recorded-GIF README.

**Checked and set aside as stale, not appended:** Microsoft Semantic Kernel prompt-injection-to-RCE
vulnerabilities (CVE-2026-25592, CVE-2026-26030) — real and severe (CVSS 9.8–10.0, "a single prompt
was enough to launch calc.exe"), but disclosed 7 May 2026, four months old, not a fresh signal. OWASP
Top 10 for Agentic Applications 2026 — released 9 Dec 2025, not fresh, and would risk being read as
another security report card against the standing carry-limit rule regardless.

**Arc table gains a row** (Day 37): *You pinned the model ID, so its behavior is fixed* → *"Pinned"
is at least four different contracts wearing the same word, and only two providers' pinned
identifiers fail instead of drifting.*

**Unreachable sources this run:** `github.com/trending` fetched live via curl fallback (`web_fetch`
still refuses the raw HTML on token budget, consistent with prior days) and returned a fresh page
(star deltas differ from Day 036's). Hugging Face trending was covered via search-result summaries
only; direct fetches remain blocked. The `site:reddit.com` r/LocalLLaMA fallback query returned no
usable recent posts for at least the fourth consecutive run and should be treated as a dead source
rather than retried each morning — worth a standing note in the playbook rather than rediscovering
it daily.

### Signal-derived (added Day 38)

Winner was **Still Untrusted** (`still-untrusted`, 11/12) built directly from Microsoft's
"Agent Security with FIDES" documentation for `agent-framework-core` (FIDES = Flow Integrity
Deterministic Enforcement System). Four security PRs in `microsoft/agent-framework` (#8138,
#8139, #8141, #8187) were all created 2026-09-08 per GitHub's own API — 9 days old at build
time, just outside the playbook's <7-day bar for a full Timeliness 3, scored a 2 rather than
inflated. It is a new angle on the emergent arc rather than a repeat of it: every prior entry
shows a control silently failing; this one shows a control Microsoft explicitly documents as
working, but conservatively — "most-restrictive-wins propagation... the rest of the run is
untrusted unless you explicitly drop it" — and the build makes that cost visible by refusing
an unrelated privileged action on four-step-old taint. The golden test reproduces Microsoft's
own worked example (the GitHub-issue-triage agent with the embedded `[SYSTEM]` instruction)
line for line rather than taking the docs' prose on faith.

`injection-intent-classifier` — client-side classifier distinguishing the three prompt-injection
goals Microsoft Defender for Office 365's new email protection specifically targets (exfiltrate
info, discover tools, expose system prompts) instead of generic "ignore previous instructions"
pattern matching — scored **9/12** (Positioning 3, Timeliness 1, Demo-ability 3, Distinctiveness 2).
Lost on Timeliness (MC1422060 last substantively updated 2 Sep 2026, 15 days old, GA slipping to
early October) and Distinctiveness (overlaps existing `rag-injection-scanner`). Appended here per
the ≥8 carry rule; worth re-scoring if Defender's email protection reaches GA with a sharper
technical hook.

Re-scores of carried candidates on the Day 38 slate:

- `summarize-this` (Week 1, Day 4) and `lingua-detect` (Week 1, Day 6) — the next 2 unbuilt
  backlog items in list order — both scored **4/12** (Positioning 1, Timeliness 0, Demo-ability 2,
  Distinctiveness 1): generic, evergreen, no fresh hook. Both shift forward unbuilt; neither is
  struck, since a slow morning could still favor them if no signal-derived candidate clears the
  feasibility gate.

**Arc table gains a row** (Day 38): *Microsoft's own docs say this is handled — deterministic
label propagation, policy checked before every sensitive call* → *The same conservatism that
makes it deterministic also means one unrelated untrusted read blocks an unrelated privileged
action four steps later, and nothing decays it unless you build scoping yourself.*

**Unreachable sources this run:** `github.com/trending` fetched live via curl fallback and
returned a fresh page (surfaced a visible cluster of agent/skill red-teaming repos —
`NationalSecurityAgency/ghidra`, `SnailSploit/Claude-Red`, `cloudflare/security-audit-skill` —
too close to already-built `mcp-auditor`/`skill-scan` to clear Distinctiveness on its own).
Hugging Face trending was covered via search-result summaries only; direct fetches remain
blocked. The `site:reddit.com` r/LocalLLaMA fallback returned no usable recent posts for at
least the fifth consecutive run — confirmed dead source, should stop being retried daily and
get a standing note in the playbook instead of being rediscovered each morning.
