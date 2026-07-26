import { describe, it, expect } from "vitest";
import { gradeFromFindings, countBy, scopeStats } from "../score";
import { normalize } from "../parse";
import { Finding } from "../types";

function f(detector: Finding["detector"], severity: Finding["severity"]): Finding {
  return { detector, severity, memoryIds: ["x"], message: "m" };
}

describe("gradeFromFindings", () => {
  it("gives an A to a clean store", () => {
    expect(gradeFromFindings([]).letter).toBe("A");
    expect(gradeFromFindings([]).score).toBe(100);
  });

  it("drops the grade for high-severity findings", () => {
    const g = gradeFromFindings([f("expired", "high"), f("contradiction", "high")]);
    expect(g.score).toBe(70); // 100 - 15 - 15
    expect(g.letter).toBe("C");
  });

  it("caps the deduction from a single detector class", () => {
    // Ten low duplicates would be -20 uncapped; per-detector cap is 30 so this
    // stays bounded and one repeated issue can't zero the score alone.
    const many = Array.from({ length: 30 }, () => f("duplicate", "low"));
    const g = gradeFromFindings(many);
    expect(g.score).toBe(70); // 100 - min(60, 30)
  });

  it("floors at zero", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      f((["expired", "contradiction", "pii", "unbounded-growth", "stale"][i % 5]) as Finding["detector"], "high")
    );
    expect(gradeFromFindings(many).score).toBeGreaterThanOrEqual(0);
  });
});

describe("countBy", () => {
  it("counts by severity and detector", () => {
    const c = countBy([f("expired", "high"), f("expired", "high"), f("stale", "low")]);
    expect(c.bySeverity.high).toBe(2);
    expect(c.byDetector.expired).toBe(2);
    expect(c.byDetector.stale).toBe(1);
  });
});

describe("scopeStats", () => {
  it("counts records, tokens and expired per scope", () => {
    const now = Date.parse("2026-07-26T00:00:00Z");
    const mem = normalize([
      { id: "a", scope: "session", content: "hello world", createdAt: "2026-01-01T00:00:00Z", ttlSeconds: 3600 },
      { id: "b", scope: "user", content: "durable fact" },
    ]);
    const s = scopeStats(mem, now);
    const session = s.find((x) => x.scope === "session")!;
    const user = s.find((x) => x.scope === "user")!;
    expect(session.count).toBe(1);
    expect(session.expired).toBe(1);
    expect(user.count).toBe(1);
    expect(user.tokens).toBeGreaterThan(0);
  });
});
