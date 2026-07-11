import { describe, it, expect } from "vitest";
import {
  tokenCost,
  effectiveTokens,
  costFor,
  rankByCost,
  monthlyCost,
  formatUSD,
  percentAboveCheapest,
} from "../cost";
import type { ModelPrice } from "../pricing";

const model = (over: Partial<ModelPrice> = {}): ModelPrice => ({
  id: "m",
  name: "M",
  vendor: "V",
  inputPerM: 2,
  outputPerM: 10,
  tokenMultiplier: 1,
  ...over,
});

describe("tokenCost", () => {
  it("prices tokens against a per-1M rate", () => {
    expect(tokenCost(1_000_000, 2)).toBe(2);
    expect(tokenCost(500_000, 10)).toBe(5);
    expect(tokenCost(0, 10)).toBe(0);
  });
  it("clamps negatives and tolerates non-finite input", () => {
    expect(tokenCost(-100, 5)).toBe(0);
    expect(tokenCost(100, NaN)).toBe(0);
    expect(tokenCost(Infinity, 5)).toBe(0);
  });
});

describe("effectiveTokens", () => {
  it("applies the multiplier and rounds to whole tokens", () => {
    expect(effectiveTokens(100, 1.42)).toBe(142);
    expect(effectiveTokens(101, 1)).toBe(101);
    expect(effectiveTokens(3, 1.5)).toBe(5); // 4.5 -> 5
  });
  it("treats a missing/invalid multiplier as 1x", () => {
    expect(effectiveTokens(100, 0)).toBe(100);
    expect(effectiveTokens(100, NaN)).toBe(100);
    expect(effectiveTokens(100, -2)).toBe(100);
  });
  it("is zero for empty input", () => {
    expect(effectiveTokens(0, 1.42)).toBe(0);
  });
});

describe("costFor", () => {
  it("computes input, output, and total from base token counts", () => {
    const b = costFor(model(), 1_000_000, 1_000_000);
    expect(b.inputCost).toBe(2);
    expect(b.outputCost).toBe(10);
    expect(b.totalCost).toBe(12);
  });
  it("folds the tokenizer multiplier into the billed cost", () => {
    const b = costFor(model({ tokenMultiplier: 1.42 }), 1_000_000, 0);
    expect(b.inputTokens).toBe(1_420_000);
    expect(b.inputCost).toBeCloseTo(2.84, 5);
  });
});

describe("rankByCost", () => {
  it("orders models cheapest-first for the same workload", () => {
    const cheap = model({ id: "cheap", inputPerM: 1, outputPerM: 3 });
    const dear = model({ id: "dear", inputPerM: 5, outputPerM: 20 });
    const ranked = rankByCost([dear, cheap], 1000, 1000);
    expect(ranked.map((r) => r.model.id)).toEqual(["cheap", "dear"]);
  });
});

describe("monthlyCost", () => {
  it("scales a per-request cost across 30 days", () => {
    expect(monthlyCost(0.01, 100)).toBeCloseTo(30, 5); // 0.01 * 100 * 30
    expect(monthlyCost(0.01, 0)).toBe(0);
  });
});

describe("formatUSD", () => {
  it("keeps precision for tiny amounts and rounds big ones", () => {
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(0.000123)).toBe("$0.00012");
    expect(formatUSD(0.1234)).toBe("$0.1234");
    expect(formatUSD(12.5)).toBe("$12.50");
    expect(formatUSD(12345.6)).toBe("$12,346");
  });
});

describe("percentAboveCheapest", () => {
  it("reports how much dearer a model is than the baseline", () => {
    expect(percentAboveCheapest(2, 1)).toBe(100);
    expect(percentAboveCheapest(1, 1)).toBe(0);
    expect(percentAboveCheapest(5, 4)).toBe(25);
  });
  it("is zero when the baseline is unusable", () => {
    expect(percentAboveCheapest(5, 0)).toBe(0);
  });
});
