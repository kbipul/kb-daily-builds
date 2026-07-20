import { describe, it, expect } from "vitest";
import { tokenize } from "../tokenize";
import { Bm25 } from "../bm25";
import { cosine, dot, norm } from "../vec";
import { reciprocalRankFusion, normalizeScores } from "../fuse";
import { semanticSearch, hybridSearch, LEXICAL, SEMANTIC } from "../search";
import type { ScoredDoc } from "../bm25";

describe("tokenize", () => {
  it("lowercases, splits on non-alphanumerics, drops stopwords + 1-char", () => {
    expect(tokenize("The Quick, brown FOX!")).toEqual(["quick", "brown", "fox"]);
  });
  it("keeps alphanumeric tokens like error codes", () => {
    expect(tokenize("HTTP 429 error")).toEqual(["http", "429", "error"]);
  });
  it("returns an empty array for all-stopword input", () => {
    expect(tokenize("the of and to")).toEqual([]);
  });
});

describe("BM25", () => {
  const docs = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "cats and dogs are common household pets",
    "quantum entanglement links distant particles",
  ];
  const bm25 = new Bm25(docs);

  it("ranks the doc containing the query term first", () => {
    const r = bm25.search("quantum");
    expect(r[0].id).toBe(3);
    expect(r[0].score).toBeGreaterThan(0);
  });

  it("gives zero score to docs with no query term", () => {
    const r = bm25.search("quantum");
    const others = r.filter((d) => d.id !== 3);
    expect(others.every((d) => d.score === 0)).toBe(true);
  });

  it("rewards a rarer term more than a common one (idf)", () => {
    // 'cat' appears in doc 0 only; 'sat' appears in docs 0 and 1.
    const catScore = bm25.scoreDoc(["cat"], 0);
    const satScore = bm25.scoreDoc(["sat"], 0);
    expect(catScore).toBeGreaterThan(satScore);
  });

  it("returns one entry per document, sorted best-first", () => {
    const r = bm25.search("cat dog");
    expect(r).toHaveLength(docs.length);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    }
  });

  it("keeps idf non-negative (Lucene-style +1 smoothing) even for a term in every doc", () => {
    // 'alpha' is in all 3 docs; with the +1 idf form its weight stays small
    // but strictly positive, and never negative — so it cannot drag a score down.
    const all = new Bm25(["alpha beans", "alpha carrots", "alpha dates"]);
    const common = all.scoreDoc(["alpha"], 0); // in every doc -> low idf
    const rare = all.scoreDoc(["beans"], 0); // in one doc -> high idf
    expect(common).toBeGreaterThanOrEqual(0);
    expect(rare).toBeGreaterThan(common);
  });
});

describe("vec math", () => {
  it("dot and norm agree with hand calculation", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(norm([3, 4])).toBe(5);
  });
  it("cosine is 1 for identical, 0 for orthogonal, -1 for opposite", () => {
    expect(cosine([1, 1], [2, 2])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
  it("cosine is 0 against a zero vector", () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe("semanticSearch", () => {
  it("orders docs by cosine similarity to the query vector", () => {
    const q = [1, 0];
    const docs = [
      [0, 1], // orthogonal
      [1, 0], // identical
      [0.7, 0.7], // 45 degrees
    ];
    const r = semanticSearch(q, docs);
    expect(r.map((d) => d.id)).toEqual([1, 2, 0]);
  });
});

describe("reciprocalRankFusion", () => {
  const listA: ScoredDoc[] = [
    { id: 1, score: 9 },
    { id: 2, score: 8 },
    { id: 3, score: 7 },
  ];
  const listB: ScoredDoc[] = [
    { id: 3, score: 0.9 },
    { id: 1, score: 0.8 },
    { id: 4, score: 0.1 },
  ];

  it("promotes the doc ranked highly by both lists", () => {
    // doc 1: ranks 1 and 2; doc 3: ranks 3 and 1 -> doc 1 should win.
    const fused = reciprocalRankFusion(
      [
        { label: "A", ranking: listA },
        { label: "B", ranking: listB },
      ],
      60,
    );
    expect(fused[0].id).toBe(1);
  });

  it("records each list's rank and unions documents across lists", () => {
    const fused = reciprocalRankFusion(
      [
        { label: "A", ranking: listA },
        { label: "B", ranking: listB },
      ],
      60,
    );
    const ids = fused.map((d) => d.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4]); // doc 4 only in B, doc 2 only in A
    const doc1 = fused.find((d) => d.id === 1)!;
    expect(doc1.ranks.A).toBe(1);
    expect(doc1.ranks.B).toBe(2);
    const doc4 = fused.find((d) => d.id === 4)!;
    expect(doc4.ranks.A).toBeUndefined();
    expect(doc4.ranks.B).toBe(3);
  });

  it("uses the RRF formula 1/(k+rank) for the accumulated score", () => {
    const fused = reciprocalRankFusion(
      [
        { label: "A", ranking: listA },
        { label: "B", ranking: listB },
      ],
      60,
    );
    const doc1 = fused.find((d) => d.id === 1)!;
    expect(doc1.score).toBeCloseTo(1 / 61 + 1 / 62);
  });

  it("smaller k sharpens the advantage of top ranks", () => {
    const top: ScoredDoc[] = [
      { id: 1, score: 1 },
      { id: 2, score: 0.5 },
    ];
    const fusedSmallK = reciprocalRankFusion([{ label: "A", ranking: top }], 1);
    const gap = fusedSmallK[0].score - fusedSmallK[1].score; // 1/2 - 1/3
    expect(gap).toBeCloseTo(1 / 2 - 1 / 3);
  });
});

describe("normalizeScores", () => {
  it("maps the best score to 1 and the worst to 0", () => {
    const m = normalizeScores([
      { id: 0, score: 10 },
      { id: 1, score: 5 },
      { id: 2, score: 0 },
    ]);
    expect(m.get(0)).toBeCloseTo(1);
    expect(m.get(2)).toBeCloseTo(0);
    expect(m.get(1)).toBeCloseTo(0.5);
  });
});

describe("hybridSearch orchestration", () => {
  const bm25 = new Bm25([
    "http 429 too many requests rate limit",
    "notebook runs out of charge quickly",
    "reciprocal rank fusion combines ranked lists",
  ]);

  it("degrades to lexical-only when no vectors are supplied", () => {
    const r = hybridSearch(bm25, "429 requests", null, null);
    expect(r.lexical[0].id).toBe(0);
    expect(r.semantic).toEqual([]);
    expect(r.hybrid).toEqual([]);
  });

  it("produces all three rankings when vectors are present", () => {
    const docVecs = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const queryVec = [0, 0, 1]; // closest to doc 2 semantically
    const r = hybridSearch(bm25, "429 requests", queryVec, docVecs);
    expect(r.lexical[0].id).toBe(0); // lexical still favors the 429 doc
    expect(r.semantic[0].id).toBe(2); // semantic favors doc 2
    expect(r.hybrid.length).toBe(3);
    expect(r.hybrid[0].ranks[LEXICAL]).toBeDefined();
    expect(r.hybrid[0].ranks[SEMANTIC]).toBeDefined();
  });
});
