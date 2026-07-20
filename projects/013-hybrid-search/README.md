<div align="center">

# Hybrid Search — BM25 + Vectors, Fused with RRF

**Watch a keyword ranker and a semantic ranker disagree on the same query, then fuse them with Reciprocal Rank Fusion into a list that is rarely wrong on either — 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/hybrid-search-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/hybrid-search-ts/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-37d29b)](https://kbipul.github.io/hybrid-search-ts/)

`Day 13` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This week frontier models started shipping **million-token context windows** (Moonshot's Kimi K3 and Thinking Machines' Inkling both landed with 1M-token context) — and the reflex is to just retrieve everything and paste it in. But a bigger window is not a retrieval strategy: stuff junk in and the answer is still buried, and you still pay for every token. **What** you put in the window is what matters, and that is a retrieval problem.

Hybrid Search makes the retrieval problem visible. Type a query and three rankers race on the same 15-passage corpus: **BM25** (classic keyword scoring), a **dense vector** ranker (MiniLM embeddings, cosine similarity), and a **Hybrid** column that fuses the two with **Reciprocal Rank Fusion**. The curated example queries are picked so the first two *genuinely disagree* — BM25 nails a rare exact token like `HTTP 429`, the vector arm rescues a pure paraphrase with no shared words — and the hybrid column is the one that stays near the top on both. Everything runs on-device: BM25 is pure TypeScript, the embedding model downloads once from the Hugging Face CDN and then never leaves your tab.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured automatically by this repo's CI on a GitHub runner (the build sandbox has no browser) and committed to `docs/demo.png` minutes after the first publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/hybrid-search-ts/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/hybrid-search-ts.git
cd hybrid-search-ts
npm ci
npm run dev      # open the printed localhost URL
npm test         # 19 unit tests over the ranking + fusion math
npm run build    # type-check + production bundle
```

## How it works

```
query ─┬─▶ BM25 (inverted index, pure TS) ───────▶ ranked list  ┐
       │                                                         ├─▶ RRF fuse ─▶ Hybrid
       └─▶ MiniLM embedding ─▶ cosine vs corpus ─▶ ranked list  ┘
```

Three deliberate decisions:

1. **BM25 from scratch, not a library.** Tokenize → inverted index → Okapi BM25 with `k1=1.5`, `b=0.75` and Lucene-style `+1` idf smoothing (so a term appearing in every document stays weakly positive, never negative). It's ~80 lines and fully unit-tested.
2. **Fuse on rank, not on score.** BM25 scores and cosine similarities live on incomparable scales, so RRF throws the numbers away: each list contributes `1 / (k + rank)` (k = 60, from Cormack et al. 2009) to every document. A passage near the top of *both* lists beats one that merely tops a single list — no score normalization, no tuning per corpus.
3. **The network stays out of the tested core.** All ranking and fusion math (`bm25.ts`, `vec.ts`, `fuse.ts`, `search.ts`) is pure and deterministic; the only I/O is `embed.ts`, a thin `transformers.js` wrapper. Tests inject plain vectors, so the suite is fast and never touches the model.

## Build notes — what I learned

The point of this build isn't "BM25 vs embeddings, which wins" — it's that the honest answer is *neither, reliably*. Getting the demo to actually **show** that took more curation than code. My first corpus had passages that were too on-topic for every query, so all three columns agreed and the whole thing looked pointless. The fix was to write the corpus and queries as adversarial pairs: a query with a rare exact token (`HTTP 429`) that embeddings smear into "throttling in general," and a pure paraphrase (`notebook loses charge` vs a doc titled `laptop battery drains`) that shares zero keywords with its answer. Only once BM25 and the vectors *disagree* does fusion have a job to do.

The most interesting bug was in my own test, not the code. I'd asserted that a term appearing in every document gets an idf of exactly 0 — the classic BM25 idf goes negative there and you clamp it. But I'd written the **Lucene** variant with `+1` inside the log, which never goes negative in the first place; the clamp is purely defensive and the value lands at a small positive number. The test was encoding a folk memory of a different formula than the one I shipped. I kept the Lucene form (it's the modern default and monotonic) and rewrote the test to assert the property that actually matters: idf is non-negative and a rare term always outweighs a common one.

RRF keeps surprising me with how little it needs to work. There's no learned weight, no per-corpus tuning, no score calibration — just `1 / (k + rank)` summed across lists — and it reliably beats either ranker alone on the hard queries. The single knob `k` only controls how much the very top positions dominate; at k = 60 it's gentle enough that a document has to do well on *both* lists to win. For a technique that fits on one line, that's a lot of robustness.

**Honest limits.** The corpus is 15 hand-written passages, not a real index — enough to demonstrate the behavior, not to benchmark it. The vector arm uses a small general-purpose model (`all-MiniLM-L6-v2`); a domain-tuned embedder would shift some of these calls. And the first load pulls ~23 MB of model weights plus the ONNX WASM runtime, so the semantic column lags a beat behind the instant BM25 column on a cold cache — I lean into that by rendering BM25 immediately and streaming the semantic and hybrid columns in when the embeddings are ready.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Lexical | Okapi BM25, hand-written (`k1=1.5`, `b=0.75`) |
| Semantic | `transformers.js` · `Xenova/all-MiniLM-L6-v2` (384-dim, on-device) |
| Fusion | Reciprocal Rank Fusion (`k=60`) |
| Build / test | Vite 6 · Vitest 2 (19 tests) |
| Demo | GitHub Pages, fully client-side |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
