// Reciprocal Rank Fusion (Cormack et al., 2009) — the surprisingly hard-to-beat
// way to combine two ranked lists that live on different scales. BM25 scores
// and cosine similarities are not comparable numbers, so we throw the numbers
// away and fuse on RANK alone: each list contributes 1 / (k + rank) to every
// document it ranks. A single robust knob (k) damps the influence of the very
// top positions so one runaway list cannot dominate the other.

import type { ScoredDoc } from "./bm25";

export interface RankedList {
  label: string;
  ranking: ScoredDoc[]; // already sorted best-first
}

export interface FusedDoc {
  id: number;
  score: number;
  /** per-list 1-based rank, or undefined if the list did not rank this doc */
  ranks: Record<string, number | undefined>;
}

/**
 * Fuse any number of ranked lists with RRF.
 * @param lists   ranked lists (each best-first)
 * @param k       RRF constant; 60 is the value from the original paper
 */
export function reciprocalRankFusion(
  lists: RankedList[],
  k = 60,
): FusedDoc[] {
  const acc = new Map<number, FusedDoc>();

  for (const { label, ranking } of lists) {
    ranking.forEach((doc, idx) => {
      const rank = idx + 1; // 1-based
      const entry =
        acc.get(doc.id) ?? { id: doc.id, score: 0, ranks: {} };
      entry.score += 1 / (k + rank);
      entry.ranks[label] = rank;
      acc.set(doc.id, entry);
    });
  }

  return [...acc.values()].sort(
    (a, b) => b.score - a.score || a.id - b.id,
  );
}

/**
 * Min–max normalize scores of a ranked list into [0, 1] for display only.
 * Never used for fusion (that is rank-based on purpose) — purely so the score
 * bars in the UI are comparable within a column.
 */
export function normalizeScores(ranking: ScoredDoc[]): Map<number, number> {
  const out = new Map<number, number>();
  if (ranking.length === 0) return out;
  const scores = ranking.map((d) => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min;
  for (const d of ranking) {
    out.set(d.id, span > 0 ? (d.score - min) / span : d.score > 0 ? 1 : 0);
  }
  return out;
}
