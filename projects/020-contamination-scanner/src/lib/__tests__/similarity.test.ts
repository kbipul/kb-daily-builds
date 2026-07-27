import { describe, it, expect } from "vitest";
import { shingles, jaccard } from "../similarity";
import { tokenize } from "../normalize";

describe("shingles", () => {
  it("produces contiguous word k-shingles", () => {
    const s = shingles(["a", "b", "c"], 2);
    expect([...s].sort()).toEqual(["a b", "b c"]);
  });
  it("falls back to a single shingle when shorter than k", () => {
    const s = shingles(["a", "b"], 3);
    expect([...s]).toEqual(["a b"]);
  });
  it("returns empty set for no tokens", () => {
    expect(shingles([], 2).size).toBe(0);
  });
  it("throws for k < 1", () => {
    expect(() => shingles(["a"], 0)).toThrow();
  });
});

describe("jaccard", () => {
  it("is 1 for identical non-empty sets", () => {
    expect(jaccard(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(1);
  });
  it("is 0 for disjoint sets", () => {
    expect(jaccard(new Set([1, 2]), new Set([3, 4]))).toBe(0);
  });
  it("computes partial overlap correctly", () => {
    // |∩|=1 (2), |∪|=3 (1,2,3) -> 1/3
    expect(jaccard(new Set([1, 2]), new Set([2, 3]))).toBeCloseTo(1 / 3, 6);
  });
  it("is 0 for two empty sets (defined edge case)", () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });
  it("is symmetric", () => {
    const a = new Set(["x", "y", "z"]);
    const b = new Set(["y", "z", "w"]);
    expect(jaccard(a, b)).toBe(jaccard(b, a));
  });
  it("rises as two sentences share more bigrams", () => {
    const base = tokenize("the quick brown fox jumps over the lazy dog");
    const near = tokenize("the quick brown fox leaps over the lazy dog");
    const far = tokenize("completely unrelated set of different words here now");
    const jNear = jaccard(shingles(base, 2), shingles(near, 2));
    const jFar = jaccard(shingles(base, 2), shingles(far, 2));
    expect(jNear).toBeGreaterThan(jFar);
    expect(jNear).toBeGreaterThan(0.5);
    expect(jFar).toBe(0);
  });
});
