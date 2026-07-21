// scripts.ts — Unicode-block script detection.
//
// Every one of India's scheduled languages is written in a script that occupies
// a well-defined Unicode block. Script detection is therefore the one part of
// language ID that is essentially 100% reliable: a Tamil letter can only be
// Tamil. Where several languages share a block (Devanagari, Bengali-Assamese,
// Perso-Arabic), script alone cannot pick the language — that is what the
// n-gram stage in detect.ts is for.

export type ScriptId =
  | "Devanagari"
  | "Bengali"      // Bengali-Assamese script (shared by Bengali, Assamese, Manipuri)
  | "Gurmukhi"
  | "Gujarati"
  | "Odia"
  | "Tamil"
  | "Telugu"
  | "Kannada"
  | "Malayalam"
  | "Arabic"       // Perso-Arabic (Urdu, Sindhi, Kashmiri)
  | "OlChiki"
  | "MeiteiMayek"
  | "Latin"
  | "Other";

interface Range {
  script: ScriptId;
  lo: number;
  hi: number;
}

// Ordered list of the Unicode ranges we care about. Kept explicit and small so
// the logic is auditable — no regex \p{Script} dependency, works everywhere.
const RANGES: Range[] = [
  { script: "Devanagari", lo: 0x0900, hi: 0x097f },
  { script: "Devanagari", lo: 0xa8e0, hi: 0xa8ff }, // Devanagari Extended
  { script: "Bengali", lo: 0x0980, hi: 0x09ff },
  { script: "Gurmukhi", lo: 0x0a00, hi: 0x0a7f },
  { script: "Gujarati", lo: 0x0a80, hi: 0x0aff },
  { script: "Odia", lo: 0x0b00, hi: 0x0b7f },
  { script: "Tamil", lo: 0x0b80, hi: 0x0bff },
  { script: "Telugu", lo: 0x0c00, hi: 0x0c7f },
  { script: "Kannada", lo: 0x0c80, hi: 0x0cff },
  { script: "Malayalam", lo: 0x0d00, hi: 0x0d7f },
  { script: "Arabic", lo: 0x0600, hi: 0x06ff },
  { script: "Arabic", lo: 0x0750, hi: 0x077f }, // Arabic Supplement
  { script: "Arabic", lo: 0x08a0, hi: 0x08ff }, // Arabic Extended-A
  { script: "Arabic", lo: 0xfb50, hi: 0xfdff }, // Arabic Presentation Forms-A
  { script: "Arabic", lo: 0xfe70, hi: 0xfeff }, // Arabic Presentation Forms-B
  { script: "OlChiki", lo: 0x1c50, hi: 0x1c7f },
  { script: "MeiteiMayek", lo: 0xabc0, hi: 0xabff },
  { script: "Latin", lo: 0x0041, hi: 0x005a },
  { script: "Latin", lo: 0x0061, hi: 0x007a },
  { script: "Latin", lo: 0x00c0, hi: 0x024f }, // Latin-1 Supp + Extended-A/B
];

export function scriptOfCodePoint(cp: number): ScriptId {
  for (const r of RANGES) {
    if (cp >= r.lo && cp <= r.hi) return r.script;
  }
  return "Other";
}

export interface ScriptHistogram {
  counts: Record<string, number>;
  total: number; // number of script-bearing characters (excludes spaces/digits/punct)
  dominant: ScriptId;
  coverage: number; // share of script-bearing chars that belong to `dominant` (0..1)
}

// Build a histogram of scripts over the "meaningful" characters only. We ignore
// ASCII digits, whitespace and common punctuation so that "नमस्ते!!! 123" is
// still confidently Devanagari rather than being diluted by the Latin/space.
export function scriptHistogram(text: string): ScriptHistogram {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // skip whitespace, ASCII digits and ASCII punctuation from the tally
    if (cp <= 0x2f || (cp >= 0x3a && cp <= 0x40) || (cp >= 0x5b && cp <= 0x60) || (cp >= 0x7b && cp <= 0x7e)) {
      continue;
    }
    const s = scriptOfCodePoint(cp);
    if (s === "Other") continue;
    counts[s] = (counts[s] ?? 0) + 1;
    total++;
  }
  let dominant: ScriptId = "Other";
  let best = 0;
  for (const [s, c] of Object.entries(counts)) {
    if (c > best) {
      best = c;
      dominant = s as ScriptId;
    }
  }
  return { counts, total, dominant, coverage: total ? best / total : 0 };
}
