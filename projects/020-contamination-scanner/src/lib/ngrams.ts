// Contiguous token n-grams — the core of the standard train/test
// contamination check (a test item is "contaminated" when one of its
// n-grams appears verbatim somewhere in the training corpus).

/**
 * Contiguous n-grams of `tokens`, each returned as a space-joined string.
 * Returns [] when there are fewer than `n` tokens (item too short to check).
 */
export function ngrams(tokens: string[], n: number): string[] {
  if (n < 1) throw new Error("n-gram length must be >= 1");
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export function ngramSet(tokens: string[], n: number): Set<string> {
  return new Set(ngrams(tokens, n));
}
