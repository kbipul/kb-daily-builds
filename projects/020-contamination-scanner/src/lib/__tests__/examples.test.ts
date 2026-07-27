import { describe, it, expect } from "vitest";
import { scan } from "../scan";
import { splitLines } from "../normalize";
import { DEFAULT_CONFIG } from "../types";
import { EXAMPLES, DEFAULT_EXAMPLE } from "../../data/examples";

const run = (id: string) => {
  const ex = EXAMPLES.find((e) => e.id === id)!;
  return scan(splitLines(ex.training), splitLines(ex.test), DEFAULT_CONFIG);
};

describe("fixtures", () => {
  it("exposes three examples with unique ids and non-empty text", () => {
    expect(EXAMPLES).toHaveLength(3);
    const ids = EXAMPLES.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
    for (const e of EXAMPLES) {
      expect(e.training.trim().length).toBeGreaterThan(0);
      expect(e.test.trim().length).toBeGreaterThan(0);
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it("default example is the leaky one", () => {
    expect(DEFAULT_EXAMPLE.id).toBe("leaky");
  });

  it("leaky example demonstrates all four verdicts", () => {
    const r = run("leaky");
    expect(r.byVerdict.exact).toBeGreaterThanOrEqual(1);
    expect(r.byVerdict.ngram).toBeGreaterThanOrEqual(1);
    expect(r.byVerdict["near-dup"]).toBeGreaterThanOrEqual(1);
    expect(r.byVerdict.clean).toBeGreaterThanOrEqual(1);
    expect(r.contaminationRate).toBeGreaterThan(0.5);
  });

  it("clean example has zero contamination", () => {
    const r = run("clean");
    expect(r.contaminatedCount).toBe(0);
    expect(r.contaminationRate).toBe(0);
    expect(r.cleanSubsetSize).toBe(r.total);
  });

  it("paraphrase example is caught mainly by near-duplicate detection", () => {
    const r = run("paraphrase");
    expect(r.byVerdict["near-dup"]).toBeGreaterThanOrEqual(3);
    expect(r.byVerdict.exact).toBeGreaterThanOrEqual(1);
    expect(r.contaminationRate).toBeGreaterThan(0.5);
  });
});
