import { describe, it, expect } from "vitest";
import { DEFAULT_MODELS, PRICES_AS_OF, blankModel } from "../pricing";
import { rankByCost } from "../cost";

// The catalogue is data, and data rots. These tests do not assert that any
// particular price is *correct* — nobody can test that offline — but they do
// catch the mistakes a hand-edited refresh actually makes: a duplicated id, a
// decimal typo that makes output cheaper than input, a stale "as of" stamp, or
// a model quietly losing the note that explains where its number came from.

describe("PRICES_AS_OF", () => {
  it("is an ISO yyyy-mm-dd date", () => {
    expect(PRICES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(PRICES_AS_OF))).toBe(false);
  });

  it("is not in the future", () => {
    expect(Date.parse(PRICES_AS_OF)).toBeLessThanOrEqual(Date.now());
  });
});

describe("DEFAULT_MODELS", () => {
  it("has a catalogue to compare", () => {
    expect(DEFAULT_MODELS.length).toBeGreaterThanOrEqual(4);
  });

  it("uses unique ids", () => {
    const ids = DEFAULT_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices every model with finite, positive rates", () => {
    for (const m of DEFAULT_MODELS) {
      expect(Number.isFinite(m.inputPerM), `${m.id} input`).toBe(true);
      expect(Number.isFinite(m.outputPerM), `${m.id} output`).toBe(true);
      expect(m.inputPerM, `${m.id} input`).toBeGreaterThan(0);
      expect(m.outputPerM, `${m.id} output`).toBeGreaterThan(0);
    }
  });

  it("prices output at least as high as input (true of every model shipped so far)", () => {
    for (const m of DEFAULT_MODELS) {
      expect(m.outputPerM, `${m.id}`).toBeGreaterThanOrEqual(m.inputPerM);
    }
  });

  it("keeps every tokenMultiplier positive and within a sane band", () => {
    for (const m of DEFAULT_MODELS) {
      expect(m.tokenMultiplier, `${m.id}`).toBeGreaterThan(0);
      expect(m.tokenMultiplier, `${m.id}`).toBeLessThanOrEqual(3);
    }
  });

  it("explains every model with a note, so no price is unsourced", () => {
    for (const m of DEFAULT_MODELS) {
      expect(m.note, `${m.id} is missing its note`).toBeTruthy();
      expect((m.note ?? "").length, `${m.id} note too short`).toBeGreaterThan(20);
    }
  });

  it("names a vendor for every model", () => {
    for (const m of DEFAULT_MODELS) {
      expect(m.vendor.trim().length).toBeGreaterThan(0);
      expect(m.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("catalogue ranks end to end", () => {
  it("orders the shipped defaults cheapest-first on a realistic request", () => {
    const ranked = rankByCost(DEFAULT_MODELS, 2000, 500);
    expect(ranked).toHaveLength(DEFAULT_MODELS.length);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].totalCost).toBeGreaterThanOrEqual(ranked[i - 1].totalCost);
    }
  });

  it("charges Sonnet 5 for more tokens than it was given, via its multiplier", () => {
    const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet-5");
    expect(sonnet).toBeDefined();
    const [b] = rankByCost([sonnet!], 1000, 0);
    expect(b.inputTokens).toBeGreaterThan(1000);
  });
});

describe("blankModel", () => {
  it("produces an editable row that satisfies the same invariants", () => {
    const m = blankModel("custom-1");
    expect(m.id).toBe("custom-1");
    expect(m.inputPerM).toBeGreaterThan(0);
    expect(m.outputPerM).toBeGreaterThan(0);
    expect(m.tokenMultiplier).toBeGreaterThan(0);
    expect(m.note).toBeTruthy();
  });
});
