// Tiny deterministic text utilities shared by the detectors and the retrieval
// simulator. No dependencies, no model — everything here is pure and testable.

/** Lowercase alphanumeric word tokens. */
export function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[a-z0-9]+/g);
  return m ? m : [];
}

/** Rough token estimate (~4 chars/token), matching the order of magnitude that
 *  cost/context tools use. Deterministic; not a real BPE tokenizer. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.trim().length / 4));
}

/** Jaccard similarity over unique token sets — used for near-duplicate detection. */
export function jaccard(a: string, b: string): number {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Normalize a phrase for grouping: collapse whitespace, lowercase, trim punctuation. */
export function normPhrase(s: string): string {
  return s.toLowerCase().replace(/[\s_]+/g, " ").replace(/[.!?,;:'"]+/g, "").trim();
}
