import { describe, expect, it } from "vitest";
import { firstFit, greedyDensity, knapsack, packAll } from "../pack";
import type { ScoredChunk } from "../types";

const chunk = (id: string, tokens: number, relevance: number): ScoredChunk => ({
  id,
  text: id,
  tokens,
  relevance,
  density: tokens > 0 ? relevance / tokens : 0,
});

describe("firstFit", () => {
  it("keeps original order and stops at the first overflow", () => {
    const r = firstFit([chunk("a", 3, 1), chunk("b", 5, 9), chunk("c", 1, 1)], 4);
    expect(r.selectedIds).toEqual(["a"]); // b overflows -> truncate (c never reached)
    expect(r.tokensUsed).toBe(3);
  });
});

describe("greedyDensity", () => {
  it("prefers the highest relevance-per-token first", () => {
    const r = greedyDensity([chunk("lo", 4, 4), chunk("hi", 2, 6)], 4);
    expect(r.selectedIds[0]).toBe("hi"); // density 3 vs 1
  });
});

describe("knapsack", () => {
  it("finds the optimal subset where greedy is fooled", () => {
    // Classic trap: densest item (x) blocks the better-value pair (a+b).
    const chunks = [chunk("x", 3, 5), chunk("a", 2, 3), chunk("b", 2, 3)];
    const r = knapsack(chunks, 4);
    expect(r.relevanceCaptured).toBe(6); // a+b = 6 beats x alone = 5
    expect(r.tokensUsed).toBeLessThanOrEqual(4);
    expect(new Set(r.selectedIds)).toEqual(new Set(["a", "b"]));
  });

  it("never exceeds the budget and handles the empty case", () => {
    expect(knapsack([], 100).selectedIds).toEqual([]);
    const r = knapsack([chunk("big", 999, 5), chunk("ok", 10, 1)], 20);
    expect(r.tokensUsed).toBeLessThanOrEqual(20);
    expect(r.selectedIds).toEqual(["ok"]); // oversized block excluded
  });

  it("is never worse than greedy or first-fit", () => {
    const chunks = [
      chunk("1", 7, 8),
      chunk("2", 5, 6),
      chunk("3", 4, 5),
      chunk("4", 3, 3),
      chunk("5", 2, 2),
    ];
    const budget = 12;
    const [ff, gr, kn] = packAll(chunks, budget);
    expect(kn.relevanceCaptured).toBeGreaterThanOrEqual(gr.relevanceCaptured);
    expect(gr.relevanceCaptured).toBeGreaterThanOrEqual(ff.relevanceCaptured);
    for (const r of [ff, gr, kn]) expect(r.tokensUsed).toBeLessThanOrEqual(budget);
  });

  it("stays feasible under budget scaling (large budget)", () => {
    // Force the scaling path (budget >> MAX_DP_CAPACITY) and assert feasibility.
    const chunks = Array.from({ length: 30 }, (_, i) =>
      chunk(`c${i}`, 40000 + i * 1000, 1 + (i % 5)),
    );
    const budget = 500000;
    const r = knapsack(chunks, budget);
    expect(r.tokensUsed).toBeLessThanOrEqual(budget);
    expect(r.selectedIds.length).toBeGreaterThan(0);
  });
});
