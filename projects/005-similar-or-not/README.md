<div align="center">

# Similar or Not — Watch Meaning Become Geometry

**Type a handful of sentences and see them embed, cluster on a 2D map, and light up a cosine-similarity heatmap — an embeddings playground running 100% in your browser.**

[![CI](https://github.com/kbipul/similar-or-not/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/similar-or-not/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-34d399)](https://kbipul.github.io/similar-or-not/)

`Day 5` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Embeddings are the quiet workhorse behind semantic search, RAG, clustering and dedup — but they're usually invisible. Similar or Not makes them tangible: paste a few sentences, and a small language model turns each into a 384‑dimensional vector, then the app shows you two views of what the model "thinks." A cosine‑similarity heatmap scores every pair, and a 2D PCA map places the sentences so that closer dots mean closer meaning. Near‑duplicate lines visibly snap together; unrelated ones drift apart.

It's a teaching tool and a sanity‑check: drop in your own labels or documents and see whether the model actually separates the categories you care about — before you wire embeddings into a pipeline.

![Screenshot](docs/demo.png)

> The screenshot is captured automatically by this repo's CI on a GitHub runner (the build sandbox can't run a browser) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/similar-or-not/)** — runs fully in your browser; the model (~23MB) downloads once and is cached.

```bash
git clone https://github.com/kbipul/similar-or-not
cd similar-or-not
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the vector-math unit tests
npm run build    # type-check + production build
```

## How it works

```
sentences ──► transformers.js (all-MiniLM-L6-v2, mean-pooled + L2-normalized)
                     │
                384-dim vectors
                ┌────┴─────────────┐
        cosine matrix          PCA → top 2 PCs
         (heatmap)              (2D scatter)
```

Two decisions worth calling out:

1. **All the linear algebra is hand‑rolled and pure.** Cosine similarity, the similarity matrix, and a small power‑iteration PCA live in `src/lib/vec.ts` with no React and no model imports, so they're covered by fast, deterministic unit tests. The PCA seed is fixed, so the map doesn't jump around between renders.
2. **The model is isolated behind one wrapper.** `embed.ts` is the only file that touches transformers.js and the network; it mean‑pools and L2‑normalizes so cosine similarity is well‑behaved. Swapping in a different embedding model is a one‑line change.

## Build notes — what I learned

The fun part was refusing to `npm install` a PCA. A 2D projection of embeddings sounds like it needs a heavyweight numerics library, but the top two principal components fall out of a dozen lines of power iteration: project every centered vector onto the current estimate, sum, normalize, repeat; then deflate and do it again for the second component. Writing it myself meant I could seed it deterministically — which matters, because a map that reshuffles every keystroke feels broken even when the geometry is identical.

Keeping the math pure made the tests genuinely useful rather than ceremonial. I could assert real properties — cosine of a vector with itself clamps to exactly 1, orthogonal vectors read 0, clustered inputs stay closer in the projection than outliers — without ever downloading a model or touching a DOM. The bugs those caught were the boring, important kind: a sign flip in the Y‑axis, a divide‑by‑zero when every point shares a coordinate.

The honest caveat is that PCA is a *linear* shadow of a very non‑linear space. Two sentences can look near on the 2D map yet score lower on the heatmap, because the map is throwing away 382 dimensions to fit on your screen. I leaned into that by always showing both views side by side — the heatmap is the ground truth, the map is the intuition. If I extend this, UMAP or t‑SNE would give a prettier layout, but I like that a from‑scratch PCA keeps the whole thing explainable and dependency‑light.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Embeddings | transformers.js · `Xenova/all-MiniLM-L6-v2` (on-device) |
| Math | hand-written cosine + power-iteration PCA (no deps) |
| Build/test | Vite 6, Vitest 2 |
| Deploy | GitHub Pages (static, no backend) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
