// Turn raw sources + a query into ScoredChunks: real token counts (tokenizer)
// and BM25 relevance (bm25.ts). This is the one module that touches both the
// tokenizer and the ranker; pack.ts stays pure numbers downstream.
import { bm25Score, buildCorpus, tokenizeWords } from "./bm25";
import { countTokens } from "./tokenizer";
import type { ScoredChunk, Source } from "./types";

/** Split a textarea blob into sources on lines that are just `---`. */
export function parseSources(blob: string): Source[] {
  return blob
    .split(/^\s*---\s*$/m)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({ id: `s${i + 1}`, text }));
}

export function scoreChunks(sources: Source[], query: string): ScoredChunk[] {
  const docs = sources.map((s) => tokenizeWords(s.text));
  const stats = buildCorpus(docs);
  const qTerms = tokenizeWords(query);
  const hasQuery = qTerms.length > 0;

  return sources.map((s, i) => {
    const tokens = countTokens(s.text);
    // No query => every block is equally "worth" one unit; the packer then
    // simply maximizes how many blocks fit.
    const relevance = hasQuery ? bm25Score(qTerms, docs[i], stats) : 1;
    return {
      id: s.id,
      text: s.text,
      tokens,
      relevance,
      density: tokens > 0 ? relevance / tokens : 0,
    };
  });
}
