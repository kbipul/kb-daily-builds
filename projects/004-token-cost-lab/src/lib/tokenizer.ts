// Thin wrapper around gpt-tokenizer. We count with a single modern
// OpenAI-style BPE tokenizer (o200k_base, used by GPT-4o / GPT-5.x). Every
// model's real tokenizer differs slightly; pricing.ts corrects for that with a
// per-model tokenMultiplier. Isolating the dependency here keeps the cost math
// (cost.ts) pure and trivially testable.
import { encode } from "gpt-tokenizer/encoding/o200k_base";

/** Count tokens in a string with the o200k_base tokenizer. Empty => 0. */
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    // Extremely defensive: never let a tokenizer edge case break the UI.
    return Math.ceil(text.length / 4);
  }
}

export const TOKENIZER_NAME = "o200k_base";
