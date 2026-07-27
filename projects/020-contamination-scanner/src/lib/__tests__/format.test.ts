import { describe, it, expect } from "vitest";
import { pct, VERDICT_LABEL } from "../format";

describe("pct", () => {
  it("formats a fraction as a one-decimal percentage", () => {
    expect(pct(0)).toBe("0.0%");
    expect(pct(0.6667)).toBe("66.7%");
    expect(pct(1)).toBe("100.0%");
  });
});

describe("VERDICT_LABEL", () => {
  it("has a human label for every verdict", () => {
    expect(VERDICT_LABEL.exact).toBeTruthy();
    expect(VERDICT_LABEL.ngram).toBeTruthy();
    expect(VERDICT_LABEL["near-dup"]).toBeTruthy();
    expect(VERDICT_LABEL.clean).toBeTruthy();
  });
});
