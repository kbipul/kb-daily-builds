// Small orchestration layer that turns embeddings into a ranked list and
// assembles the three views (lexical, semantic, hybrid). Kept free of React and
// of the network so the ranking logic is unit-testable with injected vectors.
import { Bm25, type ScoredDoc } from "./bm25";
import { cosine, type Vec } from "./vec";
import { reciprocalRankFusion, type FusedDoc, type RankedList } from "./fuse";

export const LEXICAL = "BM25";
export const SEMANTIC = "Vector";

/** Rank documents by cosine similarity of their vectors to the query vector. */
export function semanticSearch(queryVec: Vec, docVecs: Vec[]): ScoredDoc[] {
  const out: ScoredDoc[] = docVecs.map((v, id) => ({
    id,
    score: cosine(queryVec, v),
  }));
  out.sort((a, b) => b.score - a.score || a.id - b.id);
  return out;
}

export interface HybridResult {
  lexical: ScoredDoc[];
  semantic: ScoredDoc[];
  hybrid: FusedDoc[];
}

/**
 * Produce all three rankings. When the query vector / doc vectors are absent
 * (embedding model still loading or unavailable), the semantic and hybrid
 * lists fall back to the lexical ranking so the UI degrades gracefully.
 */
export function hybridSearch(
  bm25: Bm25,
  query: string,
  queryVec: Vec | null,
  docVecs: Vec[] | null,
  k = 60,
): HybridResult {
  const lexical = bm25.search(query);
  if (!queryVec || !docVecs || docVecs.length === 0) {
    return { lexical, semantic: [], hybrid: [] };
  }
  const semantic = semanticSearch(queryVec, docVecs);
  const lists: RankedList[] = [
    { label: LEXICAL, ranking: lexical },
    { label: SEMANTIC, ranking: semantic },
  ];
  const hybrid = reciprocalRankFusion(lists, k);
  return { lexical, semantic, hybrid };
}
