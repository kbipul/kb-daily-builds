// ngram.ts — character n-gram profiles and the similarity used to tell apart
// languages that share a Unicode script.
//
// A profile is an L2-normalised frequency vector over character trigrams (with
// word-boundary padding). Cosine similarity between two profiles measures how
// alike their character statistics are — enough to separate Hindi from Marathi
// or Bengali from Assamese, which share a script and so cannot be told apart by
// script detection alone.

export type Profile = Map<string, number>;

const N = 3;

// Normalise for profiling / tokenising. We lowercase (affects only Latin) and
// treat every run of non-letter, non-combining-mark characters as a separator.
// Using Unicode property escapes (\p{L}, \p{M}) means digits, ASCII punctuation,
// the Devanagari danda "।", the Urdu full stop "۔" etc. all become spaces, while
// Indic matras and viramas (combining marks) are preserved as part of the word.
export function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}]+/gu, " ").trim();
}

// Character n-grams over a padded token, e.g. "है" -> "  ह", " है", "है ".
function* grams(token: string): Generator<string> {
  const padded = " ".repeat(N - 1) + token + " ";
  const chars = Array.from(padded);
  for (let i = 0; i + N <= chars.length; i++) {
    yield chars.slice(i, i + N).join("");
  }
}

export function buildProfile(text: string): Profile {
  const counts: Profile = new Map();
  const norm = normalise(text);
  if (!norm) return counts;
  for (const token of norm.split(" ")) {
    if (!token) continue;
    for (const g of grams(token)) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  // L2 normalise so cosine == dot product and long/short text compare fairly.
  let sumSq = 0;
  for (const v of counts.values()) sumSq += v * v;
  const norm2 = Math.sqrt(sumSq) || 1;
  for (const [k, v] of counts) counts.set(k, v / norm2);
  return counts;
}

// Cosine similarity of two already-L2-normalised profiles (iterate the smaller).
export function cosine(a: Profile, b: Profile): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) {
    const w = big.get(k);
    if (w) dot += v * w;
  }
  return dot;
}

// Fraction of the text's tokens that are exact matches for a language's marker
// (function) words. Exact whole-token matching is deliberate: an earlier
// substring version let a one-letter marker like Nepali "र" match inside the
// conjuncts of unrelated Devanagari words and hijack the score.
export function markerScore(text: string, markers: string[]): number {
  if (markers.length === 0) return 0;
  const tokens = normalise(text).split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;
  const set = new Set(markers.map((m) => m.toLowerCase()));
  let hits = 0;
  for (const tok of tokens) if (set.has(tok)) hits++;
  return Math.min(1, hits / tokens.length);
}
