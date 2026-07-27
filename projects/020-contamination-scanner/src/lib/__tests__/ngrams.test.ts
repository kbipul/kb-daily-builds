import { describe, it, expect } from "vitest";
import { ngrams, ngramSet } from "../ngrams";

describe("ngrams", () => {
  const toks = ["a", "b", "c", "d"];
  it("produces contiguous n-grams as space-joined strings", () => {
    expect(ngrams(toks, 2)).toEqual(["a b", "b c", "c d"]);
  });
  it("produces one n-gram when length equals token count", () => {
    expect(ngrams(toks, 4)).toEqual(["a b c d"]);
  });
  it("returns [] when there are fewer tokens than n", () => {
    expect(ngrams(toks, 5)).toEqual([]);
    expect(ngrams([], 1)).toEqual([]);
  });
  it("supports unigrams", () => {
    expect(ngrams(toks, 1)).toEqual(["a", "b", "c", "d"]);
  });
  it("throws for n < 1", () => {
    expect(() => ngrams(toks, 0)).toThrow();
  });
});

describe("ngramSet", () => {
  it("de-duplicates repeated n-grams", () => {
    const s = ngramSet(["a", "a", "a"], 1);
    expect(s.size).toBe(1);
    expect(s.has("a")).toBe(true);
  });
  it("captures every distinct 2-gram", () => {
    const s = ngramSet(["x", "y", "x", "y"], 2);
    expect([...s].sort()).toEqual(["x y", "y x"]);
  });
});
