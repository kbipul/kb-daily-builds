// detect.ts — the two-stage language identifier.
//
//   Stage 1  Script detection (scripts.ts) narrows 22+ languages to the handful
//            that share the dominant Unicode script. This stage is ~exact.
//   Stage 2  Character n-grams + marker words (ngram.ts) rank the same-script
//            candidates. This stage carries all the real uncertainty.
//
// The result separates what we are confident about (the script, and the best
// profiled language) from what we are not (other scheduled languages that share
// the script but have no profile yet).

import { scriptHistogram, type ScriptId } from "./scripts";
import { LANGUAGES, SCRIPT_LABEL, type Language } from "./languages";
import { buildProfile, cosine, markerScore, type Profile } from "./ngram";

const COSINE_WEIGHT = 0.55;
const MARKER_WEIGHT = 0.45;
const SOFTMAX_T = 0.12;

interface Trained {
  lang: Language;
  profile: Profile;
}

// Precompute a profile for every "full" language once, at module load.
const TRAINED: Trained[] = LANGUAGES.filter((l) => l.tier === "full").map((l) => ({
  lang: l,
  profile: buildProfile(l.samples.join(" ")),
}));

export interface Candidate {
  code: string;
  name: string;
  native: string;
  scheduled: boolean;
  score: number;
  confidence: number; // share among profiled same-script candidates (0..1)
}

export interface ScriptOnly {
  code: string;
  name: string;
  native: string;
}

export interface DetectResult {
  ok: boolean;
  reason?: string;
  charCount: number;
  script: ScriptId;
  scriptLabel: string;
  scriptCoverage: number; // share of script-bearing chars in the dominant script
  mixed: boolean;
  top?: Candidate;
  ranked: Candidate[];
  scriptOnly: ScriptOnly[]; // same-script scheduled langs we can't yet confirm
  note?: string;
}

function softmax(scores: number[], t: number): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function detect(text: string): DetectResult {
  const hist = scriptHistogram(text);
  const base: DetectResult = {
    ok: false,
    charCount: hist.total,
    script: hist.dominant,
    scriptLabel: SCRIPT_LABEL[hist.dominant] ?? "Other",
    scriptCoverage: hist.coverage,
    mixed: false,
    ranked: [],
    scriptOnly: [],
  };

  if (hist.total === 0) {
    return { ...base, reason: "No letters from a supported script were found. Paste a sentence in an Indian language." };
  }
  if (hist.total < 4) {
    return { ...base, reason: "Too short to identify confidently — paste a few more words." };
  }

  const script = hist.dominant;
  const mixed = hist.coverage < 0.65;

  // Full (profiled) candidates that share the dominant script.
  const fullCandidates = TRAINED.filter((t) => t.lang.script === script);

  // Same-script scheduled languages we cannot individually confirm.
  const scriptOnly: ScriptOnly[] = LANGUAGES.filter(
    (l) => l.script === script && l.scheduled && l.tier === "partial",
  ).map((l) => ({ code: l.code, name: l.name, native: l.native }));

  // Case A: no profiled candidate, but a language uniquely owns this script
  // (e.g. Ol Chiki -> Santali, Meitei Mayek -> Manipuri). Script alone answers.
  if (fullCandidates.length === 0) {
    const owner = LANGUAGES.find((l) => l.script === script && l.tier === "script");
    if (owner) {
      const cand: Candidate = {
        code: owner.code, name: owner.name, native: owner.native,
        scheduled: owner.scheduled, score: 1, confidence: hist.coverage,
      };
      return {
        ...base, ok: true, mixed, top: cand, ranked: [cand], scriptOnly,
        note: `${owner.name} is the only scheduled language written in the ${SCRIPT_LABEL[script]} script, so its script alone identifies it.`,
      };
    }
    return { ...base, mixed, scriptOnly, reason: `Detected the ${SCRIPT_LABEL[script]} script, but no profiled language matches it yet.` };
  }

  const input = buildProfile(text);
  const scored = fullCandidates.map((t) => {
    const cos = cosine(input, t.profile);
    const mark = markerScore(text, t.lang.markers);
    return { t, score: COSINE_WEIGHT * cos + MARKER_WEIGHT * mark };
  });
  scored.sort((a, b) => b.score - a.score);

  const shares = softmax(scored.map((s) => s.score), SOFTMAX_T);
  const ranked: Candidate[] = scored.map((s, i) => ({
    code: s.t.lang.code,
    name: s.t.lang.name,
    native: s.t.lang.native,
    scheduled: s.t.lang.scheduled,
    score: s.score,
    confidence: shares[i],
  }));

  const top = ranked[0];
  let note: string | undefined;
  if (mixed) {
    note = "The text mixes scripts (code-switching), so this reflects the dominant script only.";
  } else if (fullCandidates.length === 1 && scriptOnly.length > 0) {
    note = `${scriptOnly.length} other scheduled language${scriptOnly.length > 1 ? "s" : ""} share the ${SCRIPT_LABEL[script]} script and are not individually profiled yet — treat the script as certain and the language as the best available match.`;
  } else if (scriptOnly.length > 0) {
    note = `Ranked among profiled languages; ${scriptOnly.map((s) => s.name).join(", ")} share this script but have no profile yet.`;
  }

  return { ...base, ok: true, mixed, top, ranked, scriptOnly, note };
}
