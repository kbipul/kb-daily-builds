// Text normalization + tokenization shared by every detector.
//
// Tokenization is Unicode-aware: a token is a maximal run of letters or
// numbers, lowercased. Punctuation and whitespace are separators. This keeps
// the n-gram and Jaccard detectors robust to spacing and casing differences
// while staying fully deterministic.

const TOKEN_RE = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(TOKEN_RE);
  return matches ? matches : [];
}

/**
 * Canonical single-string form used for exact-match comparison:
 * lowercased tokens re-joined by single spaces. Two strings that differ only
 * in punctuation, casing, or whitespace normalize to the same value.
 */
export function normalizeText(text: string): string {
  return tokenize(text).join(" ");
}

/** Split a pasted textarea into non-empty, trimmed lines. */
export function splitLines(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
