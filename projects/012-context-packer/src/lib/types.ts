/** A raw block of context the user wants to (maybe) include. */
export interface Source {
  id: string;
  text: string;
}

/** A source after scoring: real token cost + query relevance. */
export interface ScoredChunk {
  id: string;
  text: string;
  tokens: number; // real tokenizer count (gpt-tokenizer, o200k_base)
  relevance: number; // BM25 score vs the query (>= 0); 1.0 when no query
  density: number; // relevance per token — the greedy heuristic
}

/** The output of one packing strategy. */
export interface PackResult {
  strategy: string;
  selectedIds: string[];
  tokensUsed: number;
  relevanceCaptured: number;
  budget: number;
}
