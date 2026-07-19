// Three ways to decide what context survives a token budget.
//
//   firstFit  — the naive baseline everyone actually ships: keep sources in the
//               order they arrived, stop when the next one won't fit (i.e. plain
//               truncation).
//   greedy    — sort by value density (relevance per token), take the densest
//               that still fits. Fast, usually good, provably not optimal.
//   knapsack  — 0/1 knapsack via dynamic programming: the genuinely optimal
//               subset for the budget. Token costs are scaled so the DP table
//               stays bounded no matter how large the budget (see below).
//
// Everything operates on ScoredChunk (tokens + relevance already computed) so
// these functions are pure and deterministic — no tokenizer, no React.
import type { PackResult, ScoredChunk } from "./types";

function feasible(chunks: ScoredChunk[], budget: number): ScoredChunk[] {
  return chunks.filter((c) => c.tokens <= budget && c.tokens > 0);
}

function summarize(
  strategy: string,
  chosen: ScoredChunk[],
  budget: number,
): PackResult {
  return {
    strategy,
    selectedIds: chosen.map((c) => c.id),
    tokensUsed: chosen.reduce((s, c) => s + c.tokens, 0),
    relevanceCaptured: chosen.reduce((s, c) => s + c.relevance, 0),
    budget,
  };
}

/** Baseline: keep original order, stop at the first block that overflows. */
export function firstFit(chunks: ScoredChunk[], budget: number): PackResult {
  const chosen: ScoredChunk[] = [];
  let used = 0;
  for (const c of chunks) {
    if (c.tokens <= 0) continue;
    if (used + c.tokens > budget) break; // truncation: stop, don't skip ahead
    chosen.push(c);
    used += c.tokens;
  }
  return summarize("First-fit (truncate)", chosen, budget);
}

/** Greedy by relevance-per-token. */
export function greedyDensity(chunks: ScoredChunk[], budget: number): PackResult {
  const sorted = [...feasible(chunks, budget)].sort((a, b) => b.density - a.density);
  const chosen: ScoredChunk[] = [];
  let used = 0;
  for (const c of sorted) {
    if (used + c.tokens <= budget) {
      chosen.push(c);
      used += c.tokens;
    }
  }
  return summarize("Greedy (density)", chosen, budget);
}

const MAX_DP_CAPACITY = 2000; // keeps the DP table at n * 2000 cells, always fast.

/**
 * 0/1 knapsack maximizing total relevance within the token budget.
 *
 * Token costs are integers but a budget can be huge (a 1M window). We scale by
 * `s = ceil(budget / MAX_DP_CAPACITY)` and give each item a CEIL'd cost
 * `wi = ceil(tokens/s)` against a FLOOR'd capacity `cap = floor(budget/s)`.
 * Ceil-cost + floor-cap guarantees the reconstructed set's *real* tokens never
 * exceed the budget (sum tokens <= sum wi*s <= cap*s <= budget), so the result
 * is always feasible — at worst slightly conservative when scaling is active.
 */
export function knapsack(chunks: ScoredChunk[], budget: number): PackResult {
  const items = feasible(chunks, budget);
  const n = items.length;
  if (n === 0 || budget <= 0) return summarize("Knapsack (optimal)", [], budget);

  const s = Math.max(1, Math.ceil(budget / MAX_DP_CAPACITY));
  const cap = Math.floor(budget / s);
  const w = items.map((c) => Math.max(1, Math.ceil(c.tokens / s)));
  const v = items.map((c) => c.relevance);

  // value[j] = best relevance achievable with capacity j (1D rolling DP).
  const value = new Array<number>(cap + 1).fill(0);
  // keep[i][j] = was item i taken in the optimum for capacity j.
  const keep: Uint8Array[] = Array.from({ length: n }, () => new Uint8Array(cap + 1));

  for (let i = 0; i < n; i++) {
    const wi = w[i];
    const vi = v[i];
    for (let j = cap; j >= wi; j--) {
      const cand = value[j - wi] + vi;
      if (cand > value[j]) {
        value[j] = cand;
        keep[i][j] = 1;
      }
    }
  }

  // Reconstruct which items were taken.
  const chosen: ScoredChunk[] = [];
  let j = cap;
  for (let i = n - 1; i >= 0; i--) {
    if (keep[i][j]) {
      chosen.push(items[i]);
      j -= w[i];
    }
  }
  chosen.reverse();
  return summarize("Knapsack (optimal)", chosen, budget);
}

/** Run all three strategies for side-by-side comparison. */
export function packAll(chunks: ScoredChunk[], budget: number): PackResult[] {
  return [firstFit(chunks, budget), greedyDensity(chunks, budget), knapsack(chunks, budget)];
}
