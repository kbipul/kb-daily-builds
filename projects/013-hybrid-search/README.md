<div align="center">

# Hybrid Search — BM25 + Vectors, Fused with RRF

**Watch a keyword ranker and a semantic ranker disagree on the same query, then fuse them with Reciprocal Rank Fusion into a list that is rarely wrong on either — 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/hybrid-search-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/hybrid-search-ts/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-37d29b)](https://kbipul.github.io/hybrid-search-ts/)

`Day 13` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Two frontier models shipped million-token context windows this week: Moonshot's Kimi K3 and Thinking Machines' Inkling, both with 1M-token context. Azure's HorizonDB landed the same week with vector indexing built in. When the window gets that big the reflex is to retrieve everything and paste it in. But a bigger window is not a retrieval strategy: stuff junk in and the answer is still buried, and you still pay for every token. What you put in the window is what matters, and that is a retrieval problem. Day 12 packed the window. Day 13 decides what deserves to go in it.

Type a query and three rankers race on the same 15-passage corpus. BM25 does classic keyword scoring. A dense vector ranker embeds with MiniLM and ranks by cosine similarity. A third column fuses the two with Reciprocal Rank Fusion. The five example queries in `corpus.ts` are curated so the first two *genuinely disagree*: BM25 nails a rare exact token like `HTTP 429`, and the vector arm rescues a pure paraphrase with no shared words. The hybrid column is the one that stays near the top on both. Everything runs on-device. BM25 is pure TypeScript, and the embedding model downloads once from the Hugging Face CDN and then never leaves your tab.

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

Three decisions shaped the build.

I wrote Okapi BM25 by hand instead of pulling in a library. `tokenize.ts` lowercases, splits on non-alphanumeric runs, and drops a small stopword set plus 1-char tokens. `bm25.ts` builds the inverted index and scores with `k1=1.5`, `b=0.75` and Lucene-style `+1` idf smoothing, so a term appearing in every document stays weakly positive, never negative. It's ~80 lines and fully unit-tested.

Fusion happens on rank, never on score. BM25 scores and cosine similarities live on incomparable scales, so RRF throws the numbers away: each list contributes `1 / (k + rank)` to every document, with k = 60 from Cormack et al. 2009. A passage near the top of *both* lists beats one that merely tops a single list. No score normalization, no tuning per corpus. `fuse.ts` does export a `normalizeScores` helper, but it is min–max only, it feeds the score bars in the UI, and the fusion path never calls it.

The network stays out of the tested core. All ranking and fusion math (`bm25.ts`, `vec.ts`, `fuse.ts`, `search.ts`) is pure and deterministic; the only I/O is `embed.ts`, a thin `transformers.js` wrapper. Tests inject plain vectors, so the suite is fast and never touches the model.

## Build notes

Which ranker wins is the wrong question, because neither wins reliably. Getting the demo to actually **show** that took more curation than code. My first corpus had passages that were too on-topic for every query, so all three columns agreed and the whole thing looked pointless. I rewrote the corpus and queries as adversarial pairs. `HTTP 429` is a rare exact token that embeddings smear into "throttling in general." The query `my notebook loses charge too quickly` shares zero keywords with the passage it should find, which is titled `laptop battery drains`. Each of the five entries in `EXAMPLE_QUERIES` carries a `note` naming which arm should win and why.

The most interesting bug was in my own test, not the code. I'd asserted that a term appearing in every document gets an idf of exactly 0, which is what the classic BM25 idf does: it goes negative there and you clamp it. But `bm25.ts` computes `Math.log((N - df + 0.5) / (df + 0.5) + 1)`, the Lucene variant, with the `+1` inside the log. That never goes negative in the first place, so the `Math.max(0, raw)` clamp is purely defensive and the value lands at a small positive number. The test was encoding a folk memory of a different formula than the one I shipped. I kept the Lucene form (it's the modern default and monotonic) and rewrote the assertion. It now reads `keeps idf non-negative (Lucene-style +1 smoothing) even for a term in every doc`, and it checks the property that actually matters: idf is non-negative, and a rare term always outweighs a common one.

RRF keeps surprising me with how little it needs to work. There's no learned weight and no score calibration, just `1 / (k + rank)` summed across lists, and it beats either ranker alone on the hard queries here. The single knob `k` only controls how much the very top positions dominate; at k = 60 it's gentle enough that a document has to do well on *both* lists to win. One test, `smaller k sharpens the advantage of top ranks`, is the only place I've actually probed that knob.

## What I don't know

The corpus is 15 hand-written passages, not a real index. I wrote the queries too. That makes every disagreement in the demo a curated one rather than a measured one, and it is why there is no accuracy number anywhere in this README. The repo has no relevance-judgment set and no precision or MRR test; the 19 tests in `core.test.ts` check ranking and fusion math, not retrieval quality. So the claim I'll make is narrow: on these five queries, the hybrid column is the one that stays near the top on both kinds. Whether that survives a real index, I have not measured, and this corpus is too small to tell me.

k = 60 is inherited from the 2009 paper, not tuned here. I don't know what value this corpus would prefer. At 15 passages I doubt the question is even answerable.

The vector arm uses a small general-purpose model, `all-MiniLM-L6-v2`. A domain-tuned embedder would shift some of these calls. I haven't tried one.

The first load pulls ~23 MB of model weights plus the ONNX WASM runtime, so on a cold cache the semantic column lags a beat behind the instant BM25 column. I lean into that by rendering BM25 immediately and streaming the semantic and hybrid columns in when the embeddings are ready. That hides the wait; it doesn't shorten it.

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
