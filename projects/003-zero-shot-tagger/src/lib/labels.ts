// Pure, dependency-free label parsing + score shaping. All the logic worth
// unit-testing lives here; the ML pipeline is isolated in classifier.ts.

/**
 * Parse a comma-separated label string into a clean list:
 * trims each entry, drops empties, removes case-insensitive duplicates
 * (keeping the first spelling), and caps the count to keep inference snappy.
 */
export function parseLabels(input: string, max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= max) break;
  }
  return out;
}

export interface RawZeroShot {
  sequence: string;
  labels: string[];
  scores: number[];
}

export interface Scored {
  label: string;
  score: number; // 0..1
}

/**
 * Zip a transformers.js zero-shot result into a [{label, score}] list sorted
 * by descending score. The pipeline usually returns them pre-sorted, but we
 * never rely on that.
 */
export function normalizeResult(result: RawZeroShot): Scored[] {
  const pairs = result.labels.map((label, i) => ({
    label,
    score: result.scores[i] ?? 0,
  }));
  pairs.sort((a, b) => b.score - a.score);
  return pairs;
}

/** The single best label, or null when there are no candidates. */
export function topLabel(scored: Scored[]): Scored | null {
  return scored.length > 0 ? scored[0] : null;
}

/** Whole-number percentage for display. */
export function toPercent(score: number): number {
  return Math.round(score * 100);
}

/**
 * Whether the input is ready to classify: non-empty text and at least two
 * distinct labels (a single-label "classification" is meaningless).
 */
export function canClassify(text: string, labels: string[]): boolean {
  return text.trim().length > 0 && labels.length >= 2;
}
