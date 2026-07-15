import { describe, expect, it } from "vitest";
import { buildPassport, formatFlop, SYSTEMIC_RISK_FLOP_THRESHOLD, worst } from "./passport";
import { MODELS } from "../data/models";
import type { Intent, ModelRecord } from "./types";

const model = (id: string): ModelRecord => {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`fixture model ${id} missing`);
  return m;
};

const intent = (over: Partial<Intent> = {}): Intent => ({
  commercial: false,
  selfHost: false,
  fineTune: false,
  redistribute: false,
  serveEu: false,
  ...over,
});

describe("worst", () => {
  it("returns clear for an all-clear set", () => {
    expect(worst(["clear", "clear"])).toBe("clear");
  });

  it("lets conditions beat clear", () => {
    expect(worst(["clear", "conditions", "clear"])).toBe("conditions");
  });

  it("lets blocked beat everything", () => {
    expect(worst(["clear", "conditions", "blocked"])).toBe("blocked");
  });

  it("returns clear for an empty set", () => {
    expect(worst([])).toBe("clear");
  });
});

describe("formatFlop", () => {
  it("renders the EU threshold in scientific notation", () => {
    expect(formatFlop(1e25)).toBe("1 x 10^25 FLOP");
  });

  it("keeps one decimal for non-integer mantissas", () => {
    expect(formatFlop(3.8e25)).toBe("3.8 x 10^25 FLOP");
  });
});

describe("commercial use", () => {
  it("blocks a non-production licence for commercial intent", () => {
    const p = buildPassport(model("mistral-large"), intent({ commercial: true }));
    expect(p.clearance).toBe("blocked");
    expect(p.summary).toContain("cannot be shipped");
    expect(p.findings.some((f) => f.area === "Commercial use" && f.clearance === "blocked")).toBe(true);
  });

  it("does not raise a commercial finding when commercial use is not intended", () => {
    const p = buildPassport(model("mistral-large"), intent({ selfHost: true }));
    expect(p.findings.some((f) => f.area === "Commercial use")).toBe(false);
    expect(p.clearance).not.toBe("blocked");
  });

  it("clears MIT weights for commercial use", () => {
    const p = buildPassport(model("phi-4"), intent({ commercial: true }));
    expect(p.findings.find((f) => f.area === "Commercial use")?.clearance).toBe("clear");
  });

  it("flags the Llama community licence as conditional, not clear", () => {
    const p = buildPassport(model("llama-3.1-405b"), intent({ commercial: true }));
    const f = p.findings.find((x) => x.area === "Commercial use");
    expect(f?.clearance).toBe("conditions");
    expect(f?.detail).toContain("700 million");
  });
});

describe("self-hosting", () => {
  it("blocks an API-only model", () => {
    const p = buildPassport(model("mimo-v2-pro"), intent({ selfHost: true }));
    expect(p.clearance).toBe("blocked");
    expect(p.findings.find((f) => f.area === "Self-hosting")?.title).toBe("No weights to host");
  });

  it("clears open weights", () => {
    const p = buildPassport(model("glm-5.2"), intent({ selfHost: true }));
    expect(p.findings.find((f) => f.area === "Self-hosting")?.clearance).toBe("clear");
  });

  it("marks gated weights as conditional", () => {
    const p = buildPassport(model("gemma-3"), intent({ selfHost: true }));
    expect(p.findings.find((f) => f.area === "Self-hosting")?.clearance).toBe("conditions");
  });
});

describe("fine-tuning", () => {
  it("blocks fine-tuning when there are no weights at all", () => {
    const p = buildPassport(model("gpt-5.6"), intent({ fineTune: true }));
    expect(p.findings.find((f) => f.area === "Fine-tuning")?.clearance).toBe("blocked");
  });

  it("allows fine-tuning of MIT weights", () => {
    const p = buildPassport(model("deepseek-v4"), intent({ fineTune: true }));
    expect(p.findings.find((f) => f.area === "Fine-tuning")?.clearance).toBe("clear");
  });
});

describe("redistribution", () => {
  it("makes Gemma redistribution conditional on passing the policy downstream", () => {
    const p = buildPassport(model("gemma-3"), intent({ redistribute: true }));
    const f = p.findings.find((x) => x.area === "Redistribution");
    expect(f?.clearance).toBe("conditions");
    expect(f?.detail).toContain("downstream");
  });

  it("blocks redistribution of an API-only model", () => {
    const p = buildPassport(model("gpt-5.6"), intent({ redistribute: true }));
    expect(p.findings.find((f) => f.area === "Redistribution")?.clearance).toBe("blocked");
  });
});

describe("EU AI Act", () => {
  it("only evaluates the Act when the user serves EU users", () => {
    const p = buildPassport(model("llama-3.1-405b"), intent({ commercial: true }));
    expect(p.findings.some((f) => f.area === "EU AI Act")).toBe(false);
  });

  it("flags a disclosed compute above 10^25 as systemic risk", () => {
    const p = buildPassport(model("llama-3.1-405b"), intent({ serveEu: true }));
    const f = p.findings.find((x) => x.area === "EU AI Act");
    expect(f?.clearance).toBe("conditions");
    expect(f?.title).toContain("Systemic-risk GPAI");
    expect(f?.title).toContain("3.8 x 10^25");
  });

  it("states that open weights do NOT exempt a model above the threshold", () => {
    const p = buildPassport(model("llama-3.1-405b"), intent({ serveEu: true }));
    const f = p.findings.find((x) => x.area === "EU AI Act");
    expect(f?.detail).toContain("does NOT exempt");
  });

  it("treats undisclosed training compute as an open question, not a pass", () => {
    const p = buildPassport(model("glm-5.2"), intent({ serveEu: true }));
    const f = p.findings.find((x) => x.area === "EU AI Act");
    expect(f?.clearance).toBe("conditions");
    expect(f?.title).toContain("undisclosed");
  });

  it("uses 10^25 as the threshold constant", () => {
    expect(SYSTEMIC_RISK_FLOP_THRESHOLD).toBe(1e25);
  });
});

describe("data residency", () => {
  it("is always assessed, whatever the intent", () => {
    const p = buildPassport(model("phi-4"), intent());
    expect(p.findings.some((f) => f.area === "Data residency")).toBe(true);
  });

  it("gives self-hostable weights the strongest position", () => {
    const p = buildPassport(model("phi-4"), intent());
    expect(p.findings.find((f) => f.area === "Data residency")?.clearance).toBe("clear");
  });

  it("makes API-only residency contractual", () => {
    const p = buildPassport(model("gpt-5.6"), intent());
    const f = p.findings.find((x) => x.area === "Data residency");
    expect(f?.clearance).toBe("conditions");
    expect(f?.detail).toContain("Azure OpenAI Service");
  });
});

describe("verdicts", () => {
  it("clears Phi-4 for the full commercial self-host intent", () => {
    const p = buildPassport(
      model("phi-4"),
      intent({ commercial: true, selfHost: true, fineTune: true, redistribute: true }),
    );
    expect(p.clearance).toBe("clear");
    expect(p.summary).toContain("clears every check");
  });

  it("blocks the most-used model on the strictest intent", () => {
    const p = buildPassport(
      model("mimo-v2-pro"),
      intent({ commercial: true, selfHost: true, fineTune: true, redistribute: true, serveEu: true }),
    );
    expect(p.clearance).toBe("blocked");
  });

  it("never returns a finding without a source and a date", () => {
    const full = intent({ commercial: true, selfHost: true, fineTune: true, redistribute: true, serveEu: true });
    for (const m of MODELS) {
      for (const f of buildPassport(m, full).findings) {
        expect(f.source).toMatch(/^https:\/\//);
        expect(f.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("dataset integrity", () => {
  it("has unique model ids", () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
  });

  it("never claims an api-only model is self-hostable", () => {
    for (const m of MODELS) {
      if (m.weights.status === "api-only") expect(m.hosting.selfHostable).toBe(false);
    }
  });

  it("carries a source url and asOf date on every sourced fact", () => {
    for (const m of MODELS) {
      for (const fact of [m.weights, m.licence, m.training]) {
        expect(fact.source, `${m.id} source`).toMatch(/^https:\/\//);
        expect(fact.asOf, `${m.id} asOf`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["verified", "reported"]).toContain(fact.confidence);
      }
    }
  });
});
