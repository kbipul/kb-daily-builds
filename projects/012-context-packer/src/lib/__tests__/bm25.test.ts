import { describe, expect, it } from "vitest";
import { bm25Score, buildCorpus, tokenizeWords } from "../bm25";

const corpus = [
  "long context windows in large language models",
  "open weight models released on hugging face",
  "the coffee machine on the third floor is fixed",
].map(tokenizeWords);

describe("tokenizeWords", () => {
  it("lowercases, splits, and drops stopwords", () => {
    expect(tokenizeWords("The Long Context, in models")).toEqual([
      "long",
      "context",
      "models",
    ]);
  });
});

describe("bm25Score", () => {
  const stats = buildCorpus(corpus);

  it("scores a matching document above a non-matching one", () => {
    const q = tokenizeWords("long context models");
    const match = bm25Score(q, corpus[0], stats);
    const miss = bm25Score(q, corpus[2], stats);
    expect(match).toBeGreaterThan(miss);
    expect(miss).toBe(0);
  });

  it("returns 0 for an empty query", () => {
    expect(bm25Score([], corpus[0], stats)).toBe(0);
  });

  it("gives a rarer term more weight than a common one", () => {
    // "coffee" appears in 1 doc, "models" in 2 => coffee has higher idf.
    expect(stats.idf.get("coffee")!).toBeGreaterThan(stats.idf.get("models")!);
  });
});
