import { describe, it, expect } from "vitest";
import { analyze } from "../analyze";
import { EXAMPLES } from "../../data/examples";

const support = EXAMPLES.find((e) => e.id === "support-agent")!;

describe("analyze on the messy support-agent store", () => {
  const { report } = analyze(support.memories);

  it("counts every record", () => {
    expect(report.total).toBe(12);
  });

  it("produces the expected findings per detector", () => {
    const d = report.countsByDetector;
    expect(d.expired).toBe(1);
    expect(d.stale).toBe(2);
    expect(d["scope-durable-in-session"]).toBe(1);
    expect(d["scope-ephemeral-in-user"]).toBe(1);
    expect(d.contradiction).toBe(2);
    expect(d.pii).toBe(2);
    expect(d.duplicate).toBe(1);
    expect(d["missing-provenance"]).toBe(2);
    expect(d["unbounded-growth"] ?? 0).toBe(0);
  });

  it("grades the store an F", () => {
    expect(report.grade.letter).toBe("F");
    expect(report.grade.score).toBeLessThan(10);
  });

  it("splits records across the three scopes", () => {
    const byScope = Object.fromEntries(report.scopes.map((s) => [s.scope, s.count]));
    expect(byScope).toEqual({ procedural: 3, user: 6, session: 3 });
  });

  it("is deterministic under a fixed clock", () => {
    const a = analyze(support.memories);
    const b = analyze(support.memories);
    expect(a.report.findings.length).toBe(b.report.findings.length);
    expect(a.report.grade.score).toBe(b.report.grade.score);
  });
});
