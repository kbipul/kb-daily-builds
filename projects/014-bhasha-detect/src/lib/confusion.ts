// confusion.ts — an honest, computed confusion matrix over the profiled
// languages. For every sample sentence we re-classify it using profiles built
// from all OTHER samples (leave-one-out), so a language never trivially matches
// its own held-out sentence. The result is deliberately shown in the UI: the
// unique-script languages form perfect diagonal blocks, while same-script
// siblings (Hindi/Marathi/Sanskrit/Nepali, Bengali/Assamese, English/Hinglish)
// are where the off-diagonal confusion actually lives.

import { LANGUAGES, type Language } from "./languages";
import { buildProfile, cosine, markerScore } from "./ngram";

const COSINE_WEIGHT = 0.55;
const MARKER_WEIGHT = 0.45;

const FULL: Language[] = LANGUAGES.filter((l) => l.tier === "full");

export interface ConfusionMatrix {
  labels: { code: string; name: string }[];
  // matrix[i][j] = number of language-i samples classified as language-j
  matrix: number[][];
  correct: number;
  total: number;
  accuracy: number;
}

export function buildConfusion(): ConfusionMatrix {
  const labels = FULL.map((l) => ({ code: l.code, name: l.name }));
  const index = new Map(FULL.map((l, i) => [l.code, i]));
  const matrix = FULL.map(() => FULL.map(() => 0));
  let correct = 0;
  let total = 0;

  for (const trueLang of FULL) {
    for (let s = 0; s < trueLang.samples.length; s++) {
      const heldOut = trueLang.samples[s];
      // Classify heldOut against every full language, using leave-one-out
      // profiles for the true language (drop the held-out sample).
      const input = buildProfile(heldOut);
      let bestCode = FULL[0].code;
      let bestScore = -Infinity;
      for (const cand of FULL) {
        const trainText =
          cand.code === trueLang.code
            ? cand.samples.filter((_, k) => k !== s).join(" ")
            : cand.samples.join(" ");
        const prof = buildProfile(trainText);
        const score =
          COSINE_WEIGHT * cosine(input, prof) +
          MARKER_WEIGHT * markerScore(heldOut, cand.markers);
        if (score > bestScore) {
          bestScore = score;
          bestCode = cand.code;
        }
      }
      const i = index.get(trueLang.code)!;
      const j = index.get(bestCode)!;
      matrix[i][j]++;
      total++;
      if (i === j) correct++;
    }
  }
  return { labels, matrix, correct, total, accuracy: total ? correct / total : 0 };
}
