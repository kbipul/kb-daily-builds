import { describe, it, expect } from "vitest";
import { EXAMPLES, exampleJson } from "../../data/examples";
import { parseMemories } from "../parse";
import { analyze } from "../analyze";

describe("bundled examples", () => {
  it("has three examples", () => {
    expect(EXAMPLES).toHaveLength(3);
  });

  it("every example round-trips through JSON and the parser", () => {
    for (const ex of EXAMPLES) {
      const { records, errors } = parseMemories(exampleJson(ex));
      expect(errors).toHaveLength(0);
      expect(records).toHaveLength(ex.memories.length);
    }
  });

  it("the healthy store grades A with no findings", () => {
    const clean = EXAMPLES.find((e) => e.id === "clean-store")!;
    const { report } = analyze(clean.memories);
    expect(report.findings).toHaveLength(0);
    expect(report.grade.letter).toBe("A");
  });

  it("the unbounded store trips the growth detector", () => {
    const grown = EXAMPLES.find((e) => e.id === "unbounded")!;
    const { report } = analyze(grown.memories);
    expect(report.countsByDetector["unbounded-growth"]).toBeGreaterThanOrEqual(1);
    const session = report.scopes.find((s) => s.scope === "session")!;
    expect(session.count).toBe(60);
  });
});
