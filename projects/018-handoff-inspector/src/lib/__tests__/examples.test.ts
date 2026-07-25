import { describe, it, expect } from "vitest";
import { EXAMPLES, DEFAULT_EXAMPLE_ID, exampleById } from "../../data/examples";
import { parseTrace } from "../parse";
import { analyze } from "../analyze";

const analyzeExample = (id: string) => analyze(exampleById(id).trace);
const codesOf = (id: string) => analyzeExample(id).issues.map((i) => i.code);

describe("examples", () => {
  it("has a resolvable default", () => {
    expect(exampleById(DEFAULT_EXAMPLE_ID).id).toBe(DEFAULT_EXAMPLE_ID);
  });

  it("clean pipeline is spotless (score 100, no issues)", () => {
    const r = analyzeExample("clean");
    expect(r.issues).toHaveLength(0);
    expect(r.score).toBe(100);
  });

  it("each broken example surfaces its headline failure", () => {
    expect(codesOf("dropped")).toContain("dropped_handoff");
    expect(codesOf("loop")).toContain("delegation_loop");
    expect(codesOf("context")).toContain("context_loss");
    expect(codesOf("duplicate")).toContain("duplicated_work");
  });

  it("the messy run stacks several failures and never converges", () => {
    const c = codesOf("messy");
    expect(c).toContain("dropped_handoff");
    expect(c).toContain("no_final_answer");
    expect(analyzeExample("messy").score).toBeLessThan(100);
  });

  it("every example round-trips through the parser unchanged", () => {
    for (const ex of EXAMPLES) {
      const parsed = parseTrace(JSON.stringify(ex.trace));
      expect(parsed.errors, ex.id).toEqual([]);
      // Re-analyzing the parsed trace yields the same issue codes.
      const direct = analyze(ex.trace).issues.map((i) => i.code).sort();
      const roundtrip = analyze(parsed.trace!).issues.map((i) => i.code).sort();
      expect(roundtrip, ex.id).toEqual(direct);
    }
  });

  it("only broken examples lose points", () => {
    for (const ex of EXAMPLES) {
      const score = analyze(ex.trace).score;
      if (ex.id === "clean") expect(score).toBe(100);
      else expect(score).toBeLessThan(100);
    }
  });
});
