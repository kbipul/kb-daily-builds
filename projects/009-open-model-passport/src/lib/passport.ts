import type { Clearance, Finding, Intent, ModelRecord, Passport } from "./types";

/**
 * EU AI Act, Article 51: a general-purpose AI model trained with >= 10^25 FLOP
 * is PRESUMED to have high-impact capabilities and is classified as carrying
 * systemic risk. The presumption is rebuttable by the provider, not by you.
 * Source: https://artificialintelligenceact.eu/gpai-guidelines-overview/
 */
export const SYSTEMIC_RISK_FLOP_THRESHOLD = 1e25;

const RANK: Record<Clearance, number> = { clear: 0, conditions: 1, blocked: 2 };

/** The worst clearance across findings decides the overall verdict. */
export function worst(clearances: Clearance[]): Clearance {
  return clearances.reduce<Clearance>(
    (acc, c) => (RANK[c] > RANK[acc] ? c : acc),
    "clear",
  );
}

export function formatFlop(flop: number): string {
  const exp = Math.floor(Math.log10(flop));
  const mantissa = flop / 10 ** exp;
  const m = Number.isInteger(mantissa) ? String(mantissa) : mantissa.toFixed(1);
  return `${m} x 10^${exp} FLOP`;
}

function commercialFinding(m: ModelRecord): Finding {
  const { licence } = m;
  const base = { area: "Commercial use", source: licence.source, asOf: licence.asOf, confidence: licence.confidence };
  if (licence.commercialUse === "no") {
    return {
      ...base,
      clearance: "blocked",
      title: `${licence.name} forbids commercial use`,
      detail: licence.note,
    };
  }
  if (licence.commercialUse === "conditional") {
    return {
      ...base,
      clearance: "conditions",
      title: `${licence.name} allows commercial use with conditions`,
      detail: licence.note,
    };
  }
  return {
    ...base,
    clearance: "clear",
    title: `${licence.name} permits commercial use`,
    detail: licence.note,
  };
}

function selfHostFinding(m: ModelRecord): Finding {
  const { weights } = m;
  const base = { area: "Self-hosting", source: weights.source, asOf: weights.asOf, confidence: weights.confidence };
  if (weights.status === "api-only") {
    return {
      ...base,
      clearance: "blocked",
      title: "No weights to host",
      detail: `${m.name} is served via API only. ${weights.note}`,
    };
  }
  if (weights.status === "gated") {
    return {
      ...base,
      clearance: "conditions",
      title: "Weights are gated",
      detail: weights.note,
    };
  }
  return {
    ...base,
    clearance: "clear",
    title: "Weights are openly downloadable",
    detail: weights.note + (m.hosting.note ? ` ${m.hosting.note}` : ""),
  };
}

function fineTuneFinding(m: ModelRecord): Finding {
  const { licence } = m;
  const base = { area: "Fine-tuning", source: licence.source, asOf: licence.asOf, confidence: licence.confidence };
  if (m.weights.status === "api-only") {
    return {
      ...base,
      clearance: "blocked",
      title: "Derivatives are not possible without weights",
      detail: "Any tuning is limited to what the provider's API exposes, on the provider's terms.",
    };
  }
  if (licence.derivatives === "no") {
    return { ...base, clearance: "blocked", title: `${licence.name} forbids derivative works`, detail: licence.note };
  }
  if (licence.derivatives === "conditional") {
    return {
      ...base,
      clearance: "conditions",
      title: "Derivatives allowed, with strings attached",
      detail: licence.note,
    };
  }
  return { ...base, clearance: "clear", title: "Derivatives permitted", detail: licence.note };
}

function redistributeFinding(m: ModelRecord): Finding {
  const { licence } = m;
  const base = { area: "Redistribution", source: licence.source, asOf: licence.asOf, confidence: licence.confidence };
  if (licence.redistribution === "no") {
    return {
      ...base,
      clearance: "blocked",
      title: `${licence.name} forbids redistribution`,
      detail: licence.note,
    };
  }
  if (licence.redistribution === "conditional") {
    return {
      ...base,
      clearance: "conditions",
      title: "Redistribution allowed, with obligations you must pass downstream",
      detail: licence.note,
    };
  }
  return { ...base, clearance: "clear", title: "Redistribution permitted", detail: licence.note };
}

/**
 * EU AI Act exposure. Two separate things get confused constantly:
 *  - Art. 53 baseline GPAI obligations (documentation, copyright policy,
 *    training-data summary), which carry a partial open-source exemption; and
 *  - Art. 55 systemic-risk obligations above 10^25 FLOP, where the
 *    open-source exemption does NOT apply at all.
 */
function euFinding(m: ModelRecord): Finding {
  const { training, weights } = m;
  const base = { area: "EU AI Act", source: training.source, asOf: training.asOf, confidence: training.confidence };
  const isOpen = weights.status === "open";

  if (training.computeFlop !== null && training.computeFlop >= SYSTEMIC_RISK_FLOP_THRESHOLD) {
    return {
      ...base,
      clearance: "conditions",
      title: `Systemic-risk GPAI: disclosed ${formatFlop(training.computeFlop)} is above the 10^25 threshold`,
      detail:
        `${training.note} Above this threshold the model is presumed to carry systemic risk (Art. 51). ` +
        (isOpen
          ? "Open-weight release does NOT exempt it: the open-source carve-out is inapplicable above the threshold, so the full Art. 53 duties plus Art. 55 duties (adversarial testing, incident reporting to the AI Office, cybersecurity, energy reporting) attach to the provider. "
          : "Art. 55 duties attach to the provider. ") +
        "Those duties sit with the model provider - but as a downstream deployer you inherit the evidence burden of showing you used a compliant model.",
    };
  }

  if (training.computeFlop === null) {
    return {
      ...base,
      clearance: "conditions",
      title: "Training compute undisclosed - systemic-risk status cannot be determined",
      detail:
        `${training.note} You cannot verify the Art. 51 threshold against a number nobody published. ` +
        "For procurement, treat undisclosed compute as an open question to put to the vendor in writing, not as a pass.",
    };
  }

  return {
    ...base,
    clearance: "clear",
    title: `Below the systemic-risk threshold (${formatFlop(training.computeFlop)})`,
    detail: `${training.note} Baseline Art. 53 GPAI duties may still apply to the provider.`,
  };
}

function residencyFinding(m: ModelRecord): Finding {
  const { hosting, weights } = m;
  const base = { area: "Data residency", source: weights.source, asOf: weights.asOf, confidence: weights.confidence };
  if (hosting.selfHostable && weights.status !== "api-only") {
    return {
      ...base,
      clearance: "clear",
      title: "Residency is yours to decide",
      detail:
        "Weights run on infrastructure you choose, so prompts and completions never leave your boundary. This is the strongest residency position available." +
        (hosting.note ? ` ${hosting.note}` : ""),
    };
  }
  const clouds = hosting.majorClouds.length ? hosting.majorClouds.join(", ") : "the provider's own endpoint";
  return {
    ...base,
    clearance: "conditions",
    title: "Residency depends on the serving contract",
    detail:
      `Inference happens on someone else's machines (${clouds}). Residency becomes a contractual guarantee to negotiate and evidence, not a property of your architecture.` +
      (hosting.note ? ` ${hosting.note}` : ""),
  };
}

function summarise(model: ModelRecord, clearance: Clearance, blockers: Finding[]): string {
  if (clearance === "blocked") {
    return `${model.name} cannot be shipped as intended. ${blockers
      .map((b) => b.title)
      .join("; ")}.`;
  }
  if (clearance === "conditions") {
    return `${model.name} is shippable for this intent, but conditions attach that someone must own.`;
  }
  return `${model.name} clears every check for this intent.`;
}

/** Builds the passport: intent x facts -> findings -> verdict. */
export function buildPassport(model: ModelRecord, intent: Intent): Passport {
  const findings: Finding[] = [];

  if (intent.commercial) findings.push(commercialFinding(model));
  if (intent.selfHost) findings.push(selfHostFinding(model));
  if (intent.fineTune) findings.push(fineTuneFinding(model));
  if (intent.redistribute) findings.push(redistributeFinding(model));
  if (intent.serveEu) findings.push(euFinding(model));
  findings.push(residencyFinding(model));

  const clearance = worst(findings.map((f) => f.clearance));
  const blockers = findings.filter((f) => f.clearance === "blocked");

  return { model, clearance, summary: summarise(model, clearance, blockers), findings };
}
