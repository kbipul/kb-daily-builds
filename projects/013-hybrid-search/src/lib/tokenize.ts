// Tiny, dependency-free English tokenizer shared by the lexical index. Kept
// pure and deterministic so BM25 is fully unit-testable. Lowercases, splits on
// any non-alphanumeric run, drops a small stopword set and 1-char tokens.

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in",
  "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the",
  "their", "then", "there", "these", "they", "this", "to", "was", "will",
  "with", "i", "you", "we", "do", "does", "how", "what", "when", "which",
]);

/** Split text into normalized content tokens (stopwords + 1-char removed). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
