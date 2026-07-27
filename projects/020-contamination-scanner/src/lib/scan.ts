// The contamination engine. Given a training-corpus sample and a benchmark
// test set (each as an array of lines), grade every test item with the
// strongest detector that fires:
//
//   exact    — normalized test string equals a normalized training line
//   ngram    — a contiguous `ngram`-token n-gram of the item appears verbatim
//              somewhere in the training corpus
//   near-dup — best word-shingle Jaccard vs any training line >= threshold
//   clean    — none of the above
//
// Detectors run strongest-first and short-circuit, so severity ties are
// impossible. Everything is deterministic and runs entirely client-side.

import {
  DEFAULT_CONFIG,
  ItemResult,
  ScanConfig,
  ScanReport,
  Verdict,
} from "./types";
import { normalizeText, tokenize } from "./normalize";
import { ngrams, ngramSet } from "./ngrams";
import { jaccard, shingles } from "./similarity";

interface TrainingIndex {
  lines: string[];
  normalized: string[];
  /** Map from normalized string → first training index (exact lookup). */
  exactMap: Map<string, number>;
  /** Map from training n-gram → first training index that contains it. */
  ngramMap: Map<string, number>;
  shingleSets: Set<string>[];
}

function buildTrainingIndex(
  training: string[],
  config: ScanConfig
): TrainingIndex {
  const normalized: string[] = [];
  const exactMap = new Map<string, number>();
  const ngramMap = new Map<string, number>();
  const shingleSets: Set<string>[] = [];

  training.forEach((line, i) => {
    const tokens = tokenize(line);
    const norm = normalizeText(line);
    normalized.push(norm);
    if (norm.length > 0 && !exactMap.has(norm)) exactMap.set(norm, i);
    for (const g of ngramSet(tokens, config.ngram)) {
      if (!ngramMap.has(g)) ngramMap.set(g, i);
    }
    shingleSets.push(shingles(tokens, config.shingle));
  });

  return { lines: training, normalized, exactMap, ngramMap, shingleSets };
}

function gradeItem(
  text: string,
  index: number,
  ti: TrainingIndex,
  config: ScanConfig
): ItemResult {
  const tokens = tokenize(text);
  const norm = normalizeText(text);
  const tooShort = tokens.length < config.minTokens;

  const base: ItemResult = {
    index,
    text,
    verdict: "clean",
    matchedTrainingIndex: null,
    matchedTrainingText: null,
    sharedNgram: null,
    jaccard: 0,
    tooShort,
  };

  // 1. Exact match (always runs, even for short items — a verbatim leak is a
  //    verbatim leak regardless of length).
  if (norm.length > 0 && ti.exactMap.has(norm)) {
    const mi = ti.exactMap.get(norm)!;
    return {
      ...base,
      verdict: "exact",
      matchedTrainingIndex: mi,
      matchedTrainingText: ti.lines[mi],
    };
  }

  // Short items skip the fuzzy detectors to avoid boilerplate false positives.
  if (tooShort) return base;

  // 2. n-gram overlap: first shared n-gram wins, recorded with its source line.
  for (const g of ngrams(tokens, config.ngram)) {
    if (ti.ngramMap.has(g)) {
      const mi = ti.ngramMap.get(g)!;
      return {
        ...base,
        verdict: "ngram",
        matchedTrainingIndex: mi,
        matchedTrainingText: ti.lines[mi],
        sharedNgram: g,
      };
    }
  }

  // 3. Near-duplicate: highest Jaccard over word shingles vs any training line.
  const testShingles = shingles(tokens, config.shingle);
  let bestSim = 0;
  let bestIdx = -1;
  ti.shingleSets.forEach((s, i) => {
    const sim = jaccard(testShingles, s);
    if (sim > bestSim) {
      bestSim = sim;
      bestIdx = i;
    }
  });

  if (bestSim >= config.nearDupThreshold && bestIdx >= 0) {
    return {
      ...base,
      verdict: "near-dup",
      matchedTrainingIndex: bestIdx,
      matchedTrainingText: ti.lines[bestIdx],
      jaccard: bestSim,
    };
  }

  return { ...base, jaccard: bestSim };
}

export function scan(
  training: string[],
  test: string[],
  config: ScanConfig = DEFAULT_CONFIG
): ScanReport {
  const ti = buildTrainingIndex(training, config);
  const results = test.map((t, i) => gradeItem(t, i, ti, config));

  const byVerdict: Record<Verdict, number> = {
    exact: 0,
    ngram: 0,
    "near-dup": 0,
    clean: 0,
  };
  for (const r of results) byVerdict[r.verdict]++;

  const total = results.length;
  const contaminatedCount = total - byVerdict.clean;
  const shortItemCount = results.filter((r) => r.tooShort).length;

  return {
    results,
    total,
    contaminatedCount,
    contaminationRate: total === 0 ? 0 : contaminatedCount / total,
    byVerdict,
    cleanSubsetSize: byVerdict.clean,
    shortItemCount,
    config,
  };
}
