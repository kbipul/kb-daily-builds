import { describe, it, expect } from "vitest";
import { analyze, reportToMarkdown } from "../analyze";
import { scoreFindings } from "../score";
import { estimateTokens, contextCostUSD, formatUSD, PRICES } from "../tokens";
import { scan } from "../rules";
import { SAMPLES } from "../samples";

const byId = (id: string) => SAMPLES.find((s) => s.id === id)!;

describe("end-to-end grading of the three fixtures", () => {
  it("grades the clean skill highly with no criticals", () => {
    const r = analyze(byId("clean").text);
    expect(r.counts.critical).toBe(0);
    expect(r.counts.high).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.grade).toBe("A");
    expect(r.skillName).toBe("commit-message-helper");
  });

  it("grades the sloppy skill in the middle — risky, not hostile", () => {
    const r = analyze(byId("sketchy").text);
    expect(r.counts.critical).toBe(0);
    expect(r.counts.high).toBeGreaterThan(0); // curl | bash
    expect(r.score).toBeLessThan(90);
    expect(["B", "C", "D", "F"]).toContain(r.grade);
  });

  it("fails the hostile skill and catches every attack class", () => {
    const r = analyze(byId("malicious").text);
    const found = new Set(r.findings.map((f) => f.ruleId));

    expect(found.has("injection-override")).toBe(true);
    expect(found.has("injection-conceal")).toBe(true);
    expect(found.has("jailbreak-persona")).toBe(true);
    expect(found.has("exfil-endpoint")).toBe(true);
    expect(found.has("cred-access")).toBe(true);
    expect(found.has("hidden-comment")).toBe(true);
    expect(found.has("zero-width-chars")).toBe(true);
    expect(found.has("base64-blob")).toBe(true);
    expect(found.has("broad-permissions")).toBe(true);

    expect(r.counts.critical).toBeGreaterThanOrEqual(4);
    expect(r.grade === "F" || r.grade === "D").toBe(true);
    expect(r.verdict).toMatch(/do not install/i);
  });

  it("orders the fixtures clean > sketchy > malicious by score", () => {
    const clean = analyze(byId("clean").text).score;
    const sketchy = analyze(byId("sketchy").text).score;
    const malicious = analyze(byId("malicious").text).score;
    expect(clean).toBeGreaterThan(sketchy);
    expect(sketchy).toBeGreaterThan(malicious);
  });
});

describe("scoring", () => {
  it("returns a perfect score for no findings", () => {
    const r = scoreFindings([]);
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("caps a grade at D or F whenever a critical exists", () => {
    const one = scan("cat ~/.ssh/id_rsa");
    const r = scoreFindings(one);
    expect(["D", "F"]).toContain(r.grade);
  });

  it("never goes below zero", () => {
    const many = scan(byId("malicious").text.repeat(4));
    expect(scoreFindings(many).score).toBeGreaterThanOrEqual(0);
  });

  it("caps the deduction from any single repeated rule", () => {
    // 20 TODO lines (low = 3 each, cap = 2x weight = 6 total)
    const text = Array(20).fill("TODO: fix").join("\n");
    expect(scoreFindings(scan(text)).score).toBeGreaterThanOrEqual(90);
  });
});

describe("token + cost estimation", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("computes recurring context cost across sessions", () => {
    const price = PRICES[0];
    const cost = contextCostUSD(1_000_000, price, 1);
    expect(cost).toBeCloseTo(price.inputPerMTok, 5);
    expect(contextCostUSD(1_000_000, price, 10)).toBeCloseTo(price.inputPerMTok * 10, 5);
  });

  it("formats small amounts readably", () => {
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(0.001)).toBe("<$0.01");
    expect(formatUSD(1.5)).toBe("$1.50");
  });
});

describe("markdown export", () => {
  it("includes the grade, verdict and every finding title", () => {
    const r = analyze(byId("malicious").text);
    const md = reportToMarkdown(r);
    expect(md).toContain(`Grade ${r.grade}`);
    expect(md).toContain(r.verdict);
    for (const f of r.findings) expect(md).toContain(f.title);
  });

  it("handles a clean file without crashing", () => {
    const md = reportToMarkdown(analyze(byId("clean").text));
    expect(md).toContain("commit-message-helper");
  });
});
