// Thin wrapper around gpt-tokenizer (o200k_base — the modern OpenAI-style BPE,
// the family GPT-5.x and friends use). Real token counts matter here: a packer
// that budgets by character count silently lies about what fits in the window.
// Isolating the dependency keeps pack.ts and bm25.ts pure and unit-testable.
import { encode } from "gpt-tokenizer/encoding/o200k_base";

/** Count tokens in a string. Empty => 0. Never throws. */
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    // Defensive: a tokenizer edge case must never break the UI.
    return Math.ceil(text.length / 4);
  }
}

export const TOKENIZER_NAME = "o200k_base";
