<div align="center">

# Context Window Packer — Fit the Best Context Into N Tokens

**Inkling just shipped a 1M-token window — but you still can't afford to fill it with junk. Paste your sources, set a token budget, and watch a 0/1-knapsack packer choose the highest-value context that fits.**

[![CI](https://github.com/kbipul/context-packer/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/context-packer/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://kbipul.github.io/context-packer/)

`Day 12` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This week Thinking Machines' **Inkling** landed with a **1,000,000-token context window**, so "just put more in the prompt" has never been cheaper — or more tempting. But a bigger window doesn't retrieve for you: fill it with low-relevance text and you pay for tokens, add latency, and bury the passages that actually answer the question. Context Window Packer makes the *packing decision* visible. Paste a set of source blocks and a query; it counts real tokens for each block (`o200k_base`), scores each block's relevance with **BM25**, and then packs a chosen token budget three ways side-by-side: naive truncation, greedy-by-density, and a genuinely **optimal 0/1 knapsack**. You see, live, how much more relevance the optimal packing captures for the same tokens.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects can't run a browser, so this screenshot is captured automatically by the repo's CI on a GitHub runner and committed to `docs/demo.png` within minutes of publish — never faked.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/context-packer/)** — runs fully in your browser, nothing to install, no API key.

```bash
git clone https://github.com/kbipul/context-packer.git
cd context-packer
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the unit tests
npm run build    # production build to dist/
```

## How it works

Three modules, each pure and independently tested:

- **`tokenizer.ts`** — wraps `gpt-tokenizer` (`o200k_base`) for real token counts. Budgeting by character length silently lies about what fits.
- **`bm25.ts`** — a dependency-free BM25 ranker (IDF + length-normalized term frequency) scores each block against the query. No embedding model, fully offline.
- **`pack.ts`** — the three strategies:

```
firstFit  keep original order, stop at first overflow      (what most pipelines ship)
greedy    take highest relevance-per-token that still fits (fast, not optimal)
knapsack  0/1 dynamic programming → the optimal subset     (this is the point)
```

The knapsack scales token costs so the DP table stays bounded (`n × 2000` cells) no matter how large the budget — a 1M-token window packs instantly. Costs are rounded **up** against a rounded-**down** capacity, which guarantees the reconstructed set's real token total never exceeds the budget.

## Build notes — what I learned

The interesting part wasn't the knapsack — it was making the knapsack *safe* at 1M-token scale. A textbook 0/1 knapsack DP is `O(n × capacity)`, and a capacity of a million cells per item turns the demo into a space heater. Scaling the token costs fixes the performance, but naive scaling breaks the one property the tool exists to promise: that the selection actually fits. If you round item costs *down*, rounding error accumulates and the "optimal" set can quietly overflow the budget you told the model was hard. The fix is asymmetric rounding — costs rounded up, capacity rounded down — which makes the scaled solution provably feasible in real tokens (`Σtokens ≤ Σ⌈tokens/s⌉·s ≤ ⌊budget/s⌋·s ≤ budget`). It's slightly conservative, and I decided that's the right trade: a packer that occasionally leaves a few tokens on the table is honest; one that overflows the window is broken.

The second lesson was how badly the naive baseline loses, and how ordinary that baseline is. "First-fit" here is just truncation — keep prepending context until the next block won't fit — and it's what an enormous number of RAG systems actually do. On the seeded example, optimal packing routinely captures 30–50% more relevance for the *same* token budget, purely by being allowed to skip a big low-value block in favor of two smaller high-value ones. Greedy-by-density closes most of that gap and is what I'd reach for in production, but watching it occasionally get fooled by a single dense-but-large block is a nice, concrete argument for why the exact method earns its keep on small candidate sets.

I deliberately used BM25 rather than embeddings for relevance. It keeps the demo fully offline and instant, it's the sparse half of every serious hybrid-RAG stack anyway, and it makes the scoring legible — you can read a block and see why it ranked where it did. Swapping in a cross-encoder or embedding score would change the numbers but not the packing logic, which is the reusable idea here.

If I extended it: a fourth "ordered knapsack" strategy that also respects position (to fight lost-in-the-middle), and a token-cost overlay in dollars per model, reusing the multipliers from [Token Cost Lab](https://github.com/kbipul/token-cost-lab) (Day 4).

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Tokenizer | gpt-tokenizer (`o200k_base`) |
| Relevance | BM25 (from scratch, no deps) |
| Packer | 0/1 knapsack DP + greedy + first-fit |
| Build / test | Vite 6 · Vitest 2 |
| Demo | GitHub Pages (100% client-side) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
