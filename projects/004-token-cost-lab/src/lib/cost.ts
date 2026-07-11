// Pure, framework-free cost math. Everything here is unit-tested; the React
// layer only wires these functions to inputs and to the tokenizer.

import type { ModelPrice } from "./pricing";

export interface CostBreakdown {
  model: ModelPrice;
  /** Effective input tokens after the model's tokenMultiplier. */
  inputTokens: number;
  /** Effective output tokens after the model's tokenMultiplier. */
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/** Cost of N tokens at a per-1M price. */
export function tokenCost(tokens: number, perMillion: number): number {
  if (!isFinite(tokens) || !isFinite(perMillion)) return 0;
  return (Math.max(0, tokens) / 1_000_000) * Math.max(0, perMillion);
}

/**
 * Given a base token count from the counter, apply the model's tokenizer
 * multiplier and round to whole tokens (you cannot be billed a fractional one).
 */
export function effectiveTokens(baseTokens: number, multiplier: number): number {
  if (!isFinite(baseTokens) || baseTokens <= 0) return 0;
  const m = isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.round(baseTokens * m);
}

/** Full per-model breakdown from base (counter) input/output token counts. */
export function costFor(
  model: ModelPrice,
  baseInputTokens: number,
  baseOutputTokens: number,
): CostBreakdown {
  const inputTokens = effectiveTokens(baseInputTokens, model.tokenMultiplier);
  const outputTokens = effectiveTokens(baseOutputTokens, model.tokenMultiplier);
  const inputCost = tokenCost(inputTokens, model.inputPerM);
  const outputCost = tokenCost(outputTokens, model.outputPerM);
  return {
    model,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/** Breakdowns for many models, sorted cheapest-first. */
export function rankByCost(
  models: ModelPrice[],
  baseInputTokens: number,
  baseOutputTokens: number,
): CostBreakdown[] {
  return models
    .map((m) => costFor(m, baseInputTokens, baseOutputTokens))
    .sort((a, b) => a.totalCost - b.totalCost);
}

/** Multiply a single-request cost out to a monthly volume. */
export function monthlyCost(perRequest: number, requestsPerDay: number): number {
  if (!isFinite(perRequest) || !isFinite(requestsPerDay)) return 0;
  return perRequest * Math.max(0, requestsPerDay) * 30;
}

/**
 * Format a USD amount with a precision that stays useful across six orders of
 * magnitude: sub-cent requests need more decimals than a monthly bill.
 */
export function formatUSD(amount: number): string {
  if (!isFinite(amount)) return "$0";
  if (amount === 0) return "$0";
  if (amount < 0.01) return "$" + amount.toFixed(5);
  if (amount < 1) return "$" + amount.toFixed(4);
  if (amount < 1000) return "$" + amount.toFixed(2);
  return "$" + Math.round(amount).toLocaleString("en-US");
}

/** Percentage a value is above the cheapest baseline (baseline => 0%). */
export function percentAboveCheapest(value: number, cheapest: number): number {
  if (!isFinite(value) || !isFinite(cheapest) || cheapest <= 0) return 0;
  return Math.round(((value - cheapest) / cheapest) * 100);
}
