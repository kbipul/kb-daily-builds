// Pure, dependency-free text + scoring helpers. These carry all the logic that
// is worth unit-testing; the ML model itself lives in sentiment.ts.

/**
 * Split a block of text into trimmed sentences, keeping terminal punctuation.
 * Handles ., !, ? and newlines as boundaries and drops empty fragments.
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    // break after sentence-ending punctuation followed by whitespace
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface RawResult {
  /** model label, e.g. "POSITIVE" | "NEGATIVE" */
  label: string;
  /** model confidence 0..1 */
  score: number;
}

/**
 * Convert a raw text-classification result into a signed sentiment in [-1, 1].
 * POSITIVE keeps its confidence; NEGATIVE is negated. Unknown labels → 0.
 */
export function toSigned({ label, score }: RawResult): number {
  const l = label.toUpperCase();
  if (l.startsWith("POS")) return score;
  if (l.startsWith("NEG")) return -score;
  return 0;
}

/** Bucket a signed score into a coarse mood label. */
export function moodLabel(signed: number): "positive" | "neutral" | "negative" {
  if (signed > 0.2) return "positive";
  if (signed < -0.2) return "negative";
  return "neutral";
}

/**
 * Map a signed score in [-1, 1] to an HSL heatmap color:
 * -1 → red (hue 0), 0 → amber (hue ~55), +1 → green (hue 140).
 * Saturation grows with |score| so confident sentences read stronger.
 */
export function scoreToColor(signed: number): string {
  const s = Math.max(-1, Math.min(1, signed));
  const hue = ((s + 1) / 2) * 140; // 0..140
  const sat = 45 + Math.abs(s) * 40; // 45..85
  return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, 46%)`;
}

export interface MoodSummary {
  count: number;
  positive: number;
  negative: number;
  neutral: number;
  mean: number; // average signed score
  overall: "positive" | "neutral" | "negative";
}

/** Aggregate signed sentence scores into a room-level summary. */
export function summarize(signedScores: number[]): MoodSummary {
  const count = signedScores.length;
  if (count === 0) {
    return { count: 0, positive: 0, negative: 0, neutral: 0, mean: 0, overall: "neutral" };
  }
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let sum = 0;
  for (const s of signedScores) {
    sum += s;
    const m = moodLabel(s);
    if (m === "positive") positive++;
    else if (m === "negative") negative++;
    else neutral++;
  }
  const mean = sum / count;
  return { count, positive, negative, neutral, mean, overall: moodLabel(mean) };
}

/** Format a signed score as a signed percentage string, e.g. "+82%". */
export function formatScore(signed: number): string {
  const pct = Math.round(signed * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}
