import { describe, it, expect } from "vitest";
import { EXAMPLES, DEFAULT_EXAMPLE_ID } from "../../data/examples";
import { parseTrace } from "../parse";
import { analyze } from "../analyze";

describe("bundled examples", () => {
  it("has a default that exists", () => {
    expect(EXAMPLES.some((e) => e.id === DEFAULT_EXAMPLE_ID)).toBe(true);
  });

  it("every example parses into at least one step or a final answer", () => {
    for (const ex of EXAMPLES) {
      const t = parseTrace(ex.trace);
      expect(t.steps.length + (t.finalAnswer ? 1 : 0)).toBeGreaterThan(0);
    }
  });

  it("each broken example produces its headline finding", () => {
    const want: Record<string, string> = {
      stuck: "stuck-loop",
      hallucinated: "ungrounded-answer",
      "unknown-tool": "unknown-tool",
      "error-thrash": "error-thrash",
    };
    for (const [id, code] of Object.entries(want)) {
      const ex = EXAMPLES.find((e) => e.id === id)!;
      const r = analyze(parseTrace(ex.trace), { tools: ex.tools });
      expect(r.findings.map((f) => f.code)).toContain(code);
    }
  });

  it("the healthy example scores an A and finishes cleanly", () => {
    const ex = EXAMPLES.find((e) => e.id === "healthy")!;
    const r = analyze(parseTrace(ex.trace), { tools: ex.tools });
    expect(r.grade).toBe("A");
    expect(r.finishedCleanly).toBe(true);
  });

  it("the default example is genuinely broken (score < 60)", () => {
    const ex = EXAMPLES.find((e) => e.id === DEFAULT_EXAMPLE_ID)!;
    const r = analyze(parseTrace(ex.trace), { tools: ex.tools });
    expect(r.score).toBeLessThan(60);
  });
});
