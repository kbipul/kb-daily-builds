// Contamination Scanner — shared types.
//
// A "verdict" grades how strongly a benchmark test item overlaps the pasted
// training corpus, from strongest to weakest evidence of contamination.
export type Verdict = "exact" | "ngram" | "near-dup" | "clean";

// Ordered strongest → weakest so a stronger detector always wins a tie.
export const VERDICT_SEVERITY: Record<Verdict, number> = {
  exact: 3,
  ngram: 2,
  "near-dup": 1,
  clean: 0,
};

export interface ScanConfig {
  /** Contiguous token n-gram length for the n-gram detector (GPT-3 used 13). */
  ngram: number;
  /** Jaccard similarity (0..1) at/above which a near-duplicate is flagged. */
  nearDupThreshold: number;
  /** Word-shingle size used by the near-duplicate Jaccard comparison. */
  shingle: number;
  /** Test items with fewer tokens than this are never n-gram/near-dup flagged. */
  minTokens: number;
}

export const DEFAULT_CONFIG: ScanConfig = {
  ngram: 8,
  nearDupThreshold: 0.5,
  shingle: 2,
  minTokens: 4,
};

export interface ItemResult {
  /** Index of the test item in the submitted test set (0-based). */
  index: number;
  /** Original (untrimmed-of-meaning) test item text. */
  text: string;
  verdict: Verdict;
  /** Index of the training line that produced the match, if any. */
  matchedTrainingIndex: number | null;
  /** The training line that produced the match, if any. */
  matchedTrainingText: string | null;
  /** The exact shared n-gram (space-joined tokens) when verdict === "ngram". */
  sharedNgram: string | null;
  /** Best Jaccard similarity found (0..1); populated for near-dup / clean. */
  jaccard: number;
  /** True when the item was too short (< minTokens) to n-gram/near-dup check. */
  tooShort: boolean;
}

export interface ScanReport {
  results: ItemResult[];
  total: number;
  contaminatedCount: number;
  /** contaminatedCount / total, or 0 when total === 0. */
  contaminationRate: number;
  /** Count per verdict. */
  byVerdict: Record<Verdict, number>;
  /** Test items left after removing every contaminated one. */
  cleanSubsetSize: number;
  /** How many items were too short to fully check. */
  shortItemCount: number;
  config: ScanConfig;
}
