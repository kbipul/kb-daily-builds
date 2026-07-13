/**
 * Context-cost estimation.
 *
 * A skill file isn't read once — its description (and often its whole body)
 * rides along in the agent's context, session after session. Token bloat is
 * therefore a recurring tax, not a one-off.
 *
 * Estimator: the classic ~4 characters per token heuristic for English/markdown
 * (±15%). Good enough for a cost order-of-magnitude; we say so in the UI.
 */

export interface ModelPrice {
  model: string;
  /** USD per 1M input tokens — snapshot of published July-2026 list prices. */
  inputPerMTok: number;
}

export const PRICES: ModelPrice[] = [
  { model: "Grok 4.5", inputPerMTok: 2.0 },
  { model: "GPT-5.6 Terra", inputPerMTok: 2.5 },
  { model: "Claude Sonnet 5", inputPerMTok: 3.0 },
];

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Cost in USD of carrying `tokens` as input across `sessions` sessions. */
export function contextCostUSD(tokens: number, price: ModelPrice, sessions: number): number {
  return (tokens / 1_000_000) * price.inputPerMTok * sessions;
}

export function formatUSD(v: number): string {
  if (v === 0) return "$0";
  if (v < 0.01) return "<$0.01";
  return `$${v.toFixed(2)}`;
}
