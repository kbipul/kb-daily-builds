import { describe, it, expect } from "vitest";
import { scan } from "../scan";
import { DEFAULT_CONFIG, ScanConfig } from "../types";

const cfg = (over: Partial<ScanConfig> = {}): ScanConfig => ({
  ...DEFAULT_CONFIG,
  ...over,
});

describe("scan — exact detection", () => {
  it("flags a verbatim copy as exact", () => {
    const r = scan(["The cat sat on the mat."], ["the cat sat on the mat"]);
    expect(r.results[0].verdict).toBe("exact");
    expect(r.results[0].matchedTrainingIndex).toBe(0);
  });
  it("ignores punctuation and casing when matching exact", () => {
    const r = scan(["Hello, World!"], ["hello world"]);
    expect(r.results[0].verdict).toBe("exact");
  });
  it("records the matched training text", () => {
    const r = scan(["alpha beta gamma"], ["Alpha Beta Gamma"]);
    expect(r.results[0].matchedTrainingText).toBe("alpha beta gamma");
  });
  it("exact wins even for short items below minTokens", () => {
    const r = scan(["red blue"], ["red blue"], cfg({ minTokens: 8 }));
    expect(r.results[0].verdict).toBe("exact");
  });
});

describe("scan — n-gram detection", () => {
  const training = [
    "an agent learns a policy by maximizing the expected cumulative reward over time",
  ];
  it("flags a shared contiguous n-gram", () => {
    const r = scan(
      training,
      ["during training an agent learns a policy by maximizing the expected reward"],
      cfg({ ngram: 8 })
    );
    expect(r.results[0].verdict).toBe("ngram");
    expect(r.results[0].sharedNgram).toContain("agent learns a policy by maximizing");
  });
  it("does not fire when the shared run is shorter than the n-gram length", () => {
    const r = scan(["the sky is very blue today"], ["the sky is green"], cfg({ ngram: 8 }));
    expect(r.results[0].verdict).toBe("clean");
  });
  it("a larger n-gram is stricter (fewer hits)", () => {
    const t = ["one two three four five six seven eight nine ten"];
    const q = ["one two three four five zebra seven eight nine ten"];
    expect(scan(t, q, cfg({ ngram: 4 })).results[0].verdict).toBe("ngram");
    expect(scan(t, q, cfg({ ngram: 8 })).results[0].verdict).not.toBe("ngram");
  });
});

describe("scan — near-duplicate detection", () => {
  it("flags a light paraphrase that breaks the n-gram", () => {
    const t = ["The learning rate controls how large a step the optimizer takes on each update during training"];
    const q = ["The learning rate sets how large a step the optimizer takes upon each update during training"];
    const r = scan(t, q, cfg({ ngram: 8 }));
    expect(r.results[0].verdict).toBe("near-dup");
    expect(r.results[0].jaccard).toBeGreaterThanOrEqual(DEFAULT_CONFIG.nearDupThreshold);
  });
  it("respects the threshold — raising it above the score clears the flag", () => {
    const t = ["The learning rate controls how large a step the optimizer takes on each update during training"];
    const q = ["The learning rate sets how large a step the optimizer takes upon each update during training"];
    const strict = scan(t, q, cfg({ ngram: 8, nearDupThreshold: 0.95 }));
    expect(strict.results[0].verdict).toBe("clean");
  });
  it("unrelated sentences stay clean", () => {
    const r = scan(
      ["photosynthesis converts sunlight into chemical energy in plants"],
      ["the quarterly revenue report is due next friday afternoon"]
    );
    expect(r.results[0].verdict).toBe("clean");
  });
});

describe("scan — severity ordering", () => {
  it("prefers exact over an available n-gram match", () => {
    // Training has both a verbatim line and a longer line sharing an n-gram.
    const training = [
      "alpha beta gamma delta epsilon zeta eta theta",
      "alpha beta gamma delta epsilon zeta eta theta iota kappa",
    ];
    const r = scan(training, ["alpha beta gamma delta epsilon zeta eta theta"], cfg({ ngram: 5 }));
    expect(r.results[0].verdict).toBe("exact");
    expect(r.results[0].matchedTrainingIndex).toBe(0);
  });
});

describe("scan — short item gate", () => {
  it("marks short items and skips fuzzy detectors", () => {
    const r = scan(
      ["the model parameters are updated during each optimizer step here"],
      ["model parameters step"],
      cfg({ minTokens: 5 })
    );
    expect(r.results[0].tooShort).toBe(true);
    expect(r.results[0].verdict).toBe("clean");
  });
});

describe("scan — report aggregation", () => {
  const report = scan(
    [
      "the mitochondria is the powerhouse of the cell",
      "an agent learns a policy by maximizing the expected cumulative reward over time",
    ],
    [
      "the mitochondria is the powerhouse of the cell", // exact
      "an agent learns a policy by maximizing the reward", // ngram
      "a totally unrelated sentence about weekend gardening plans", // clean
    ],
    cfg({ ngram: 6 })
  );

  it("counts verdicts", () => {
    expect(report.byVerdict.exact).toBe(1);
    expect(report.byVerdict.ngram).toBe(1);
    expect(report.byVerdict.clean).toBe(1);
  });
  it("computes contamination count and rate", () => {
    expect(report.contaminatedCount).toBe(2);
    expect(report.total).toBe(3);
    expect(report.contaminationRate).toBeCloseTo(2 / 3, 6);
  });
  it("reports the clean subset size", () => {
    expect(report.cleanSubsetSize).toBe(1);
  });
  it("preserves item order and indices", () => {
    expect(report.results.map((r) => r.index)).toEqual([0, 1, 2]);
  });
});

describe("scan — edge cases", () => {
  it("handles an empty test set", () => {
    const r = scan(["anything"], []);
    expect(r.total).toBe(0);
    expect(r.contaminationRate).toBe(0);
    expect(r.cleanSubsetSize).toBe(0);
  });
  it("handles an empty training corpus (everything clean)", () => {
    const r = scan([], ["some benchmark question here about things"]);
    expect(r.byVerdict.clean).toBe(1);
    expect(r.contaminationRate).toBe(0);
  });
  it("is deterministic across runs", () => {
    const a = scan(["a b c d e f g h"], ["a b c d e f g h i"], cfg({ ngram: 5 }));
    const b = scan(["a b c d e f g h"], ["a b c d e f g h i"], cfg({ ngram: 5 }));
    expect(a).toEqual(b);
  });
});
