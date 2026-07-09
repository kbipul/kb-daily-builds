import { describe, it, expect } from "vitest";
import {
  parseLabels,
  normalizeResult,
  topLabel,
  toPercent,
  canClassify,
  type RawZeroShot,
} from "../labels";

describe("parseLabels", () => {
  it("splits, trims, and drops empties", () => {
    expect(parseLabels(" billing , bug ,, feature ")).toEqual([
      "billing",
      "bug",
      "feature",
    ]);
  });

  it("removes case-insensitive duplicates, keeping the first spelling", () => {
    expect(parseLabels("Bug, bug, BUG, feature")).toEqual(["Bug", "feature"]);
  });

  it("caps the number of labels", () => {
    const many = Array.from({ length: 20 }, (_, i) => `l${i}`).join(",");
    expect(parseLabels(many, 5)).toHaveLength(5);
  });

  it("returns [] for empty input", () => {
    expect(parseLabels("   ,  , ")).toEqual([]);
  });
});

describe("normalizeResult", () => {
  const raw: RawZeroShot = {
    sequence: "x",
    labels: ["billing", "bug", "praise"],
    scores: [0.2, 0.7, 0.1],
  };

  it("zips labels+scores and sorts by descending score", () => {
    expect(normalizeResult(raw)).toEqual([
      { label: "bug", score: 0.7 },
      { label: "billing", score: 0.2 },
      { label: "praise", score: 0.1 },
    ]);
  });

  it("tolerates missing scores", () => {
    const out = normalizeResult({ sequence: "x", labels: ["a", "b"], scores: [0.5] });
    expect(out).toContainEqual({ label: "b", score: 0 });
  });
});

describe("topLabel", () => {
  it("returns the highest-scored entry", () => {
    expect(topLabel([{ label: "a", score: 0.9 }, { label: "b", score: 0.1 }]))
      .toEqual({ label: "a", score: 0.9 });
  });
  it("returns null when empty", () => {
    expect(topLabel([])).toBeNull();
  });
});

describe("toPercent", () => {
  it("rounds to a whole percent", () => {
    expect(toPercent(0.826)).toBe(83);
    expect(toPercent(0)).toBe(0);
    expect(toPercent(1)).toBe(100);
  });
});

describe("canClassify", () => {
  it("needs text and at least two labels", () => {
    expect(canClassify("hi", ["a", "b"])).toBe(true);
    expect(canClassify("", ["a", "b"])).toBe(false);
    expect(canClassify("hi", ["a"])).toBe(false);
    expect(canClassify("   ", ["a", "b"])).toBe(false);
  });
});
