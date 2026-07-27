// Near-duplicate detection via Jaccard similarity over word shingles.
// Catches lightly-edited / reordered paraphrases that exact and n-gram
// matching miss, without any model or embedding.

/**
 * Set of contiguous word shingles (k-grams) as space-joined strings.
 * For inputs shorter than k, falls back to a single shingle of all tokens
 * so very short items are still comparable.
 */
export function shingles(tokens: string[], k: number): Set<string> {
  if (k < 1) throw new Error("shingle size must be >= 1");
  if (tokens.length === 0) return new Set();
  if (tokens.length < k) return new Set([tokens.join(" ")]);
  const out = new Set<string>();
  for (let i = 0; i + k <= tokens.length; i++) {
    out.add(tokens.slice(i, i + k).join(" "));
  }
  return out;
}

/** Jaccard similarity |A ∩ B| / |A ∪ B|. Empty ∩ empty === 0 (defined). */
export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
