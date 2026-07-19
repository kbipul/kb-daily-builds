// A small, dependency-free BM25 implementation used to score how relevant each
// source is to the user's query. BM25 is the workhorse lexical ranker behind
// classic search and the sparse half of every hybrid-RAG stack — good enough to
// rank context blocks without loading an embedding model, and fully offline.

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "as",
  "at", "by", "from", "you", "your", "we", "our", "they", "their", "i",
]);

/** Lowercase, split on non-alphanumerics, drop stopwords. */
export function tokenizeWords(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return raw.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export interface CorpusStats {
  idf: Map<string, number>;
  avgdl: number;
  n: number;
}

/** Build IDF + average document length over the tokenized corpus. */
export function buildCorpus(docs: string[][]): CorpusStats {
  const n = docs.length;
  const df = new Map<string, number>();
  let totalLen = 0;
  for (const doc of docs) {
    totalLen += doc.length;
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    // Robertson/Sparck-Jones IDF, +1 shifted so it stays non-negative.
    idf.set(term, Math.log(1 + (n - freq + 0.5) / (freq + 0.5)));
  }
  return { idf, avgdl: n > 0 ? totalLen / n : 0, n };
}

/** BM25 score of one document against the query terms. */
export function bm25Score(
  queryTerms: string[],
  docTerms: string[],
  stats: CorpusStats,
  k1 = 1.5,
  b = 0.75,
): number {
  if (queryTerms.length === 0 || docTerms.length === 0) return 0;
  const dl = docTerms.length;
  const tf = new Map<string, number>();
  for (const t of docTerms) tf.set(t, (tf.get(t) ?? 0) + 1);

  let score = 0;
  for (const q of new Set(queryTerms)) {
    const f = tf.get(q);
    if (!f) continue;
    const idf = stats.idf.get(q) ?? 0;
    const denom = f + k1 * (1 - b + (b * dl) / (stats.avgdl || 1));
    score += idf * ((f * (k1 + 1)) / denom);
  }
  return score;
}
