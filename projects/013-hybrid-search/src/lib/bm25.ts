// Okapi BM25 from scratch — the classic probabilistic lexical ranker. No
// libraries: build an inverted index over tokenized docs, then score a query
// against every doc. This is the "keyword" half of hybrid search and the part
// that reliably nails rare, exact terms (error codes, product names) that a
// dense embedding tends to smear together.
import { tokenize } from "./tokenize";

export interface Bm25Options {
  k1?: number; // term-frequency saturation (typical 1.2–2.0)
  b?: number; // length normalization strength (0 = none, 1 = full)
}

export interface ScoredDoc {
  id: number;
  score: number;
}

export class Bm25 {
  private readonly k1: number;
  private readonly b: number;
  private readonly docTokens: string[][];
  private readonly docLen: number[];
  private readonly avgdl: number;
  /** term -> document frequency (how many docs contain it at least once) */
  private readonly df = new Map<string, number>();
  /** term -> smoothed inverse document frequency */
  private readonly idf = new Map<string, number>();
  private readonly N: number;

  constructor(docs: string[], opts: Bm25Options = {}) {
    this.k1 = opts.k1 ?? 1.5;
    this.b = opts.b ?? 0.75;
    this.docTokens = docs.map(tokenize);
    this.docLen = this.docTokens.map((t) => t.length);
    this.N = docs.length;
    const totalLen = this.docLen.reduce((a, c) => a + c, 0);
    this.avgdl = this.N > 0 ? totalLen / this.N : 0;

    for (const tokens of this.docTokens) {
      for (const term of new Set(tokens)) {
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
    }
    // BM25 idf with the standard +0.5 smoothing; clamped at 0 so a term that
    // appears in more than half the corpus never contributes a negative score.
    for (const [term, df] of this.df) {
      const raw = Math.log((this.N - df + 0.5) / (df + 0.5) + 1);
      this.idf.set(term, Math.max(0, raw));
    }
  }

  /** Term frequency of `term` in document `id`. */
  private tf(term: string, id: number): number {
    let c = 0;
    for (const t of this.docTokens[id]) if (t === term) c++;
    return c;
  }

  /** BM25 score of a single document for the query terms. */
  scoreDoc(queryTerms: string[], id: number): number {
    let s = 0;
    const lenNorm = this.avgdl > 0 ? this.docLen[id] / this.avgdl : 0;
    for (const term of queryTerms) {
      const idf = this.idf.get(term);
      if (!idf) continue;
      const f = this.tf(term, id);
      if (f === 0) continue;
      const denom = f + this.k1 * (1 - this.b + this.b * lenNorm);
      s += idf * ((f * (this.k1 + 1)) / denom);
    }
    return s;
  }

  /** Rank every document for a raw query string, best first. */
  search(query: string): ScoredDoc[] {
    const terms = tokenize(query);
    const out: ScoredDoc[] = [];
    for (let id = 0; id < this.N; id++) {
      out.push({ id, score: this.scoreDoc(terms, id) });
    }
    // Stable-ish: higher score first, ties broken by document id.
    out.sort((a, b) => b.score - a.score || a.id - b.id);
    return out;
  }
}
