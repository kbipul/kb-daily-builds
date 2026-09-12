/**
 * The rule checks.
 *
 * Each rule restates one published output convention as something mechanically
 * testable, and reports its own evidence. A rule that cannot apply to the input
 * returns 'n/a' rather than a free pass - a response that never mentions an
 * error should not score a point for describing errors well.
 */

import { CAUSE_WORDS, ERROR_WORDS, FIX_WORDS, LOCATION_WORDS, TIME_UNITS, VAGUE_TIME } from './cues';
import { countHedges } from './classify';
import type { RuleResult, Segment } from './types';

/** Hedges per 100 words above which the response reads as non-committal. */
export const HEDGE_DENSITY_LIMIT = 2.5;

function has(text: string, words: string[]): boolean {
  const norm = text.toLowerCase();
  return words.some((w) => norm.includes(w));
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function rolesOf(segments: Segment[], role: string): Segment[] {
  return segments.filter((s) => s.role === role);
}

function answerFirst(segments: Segment[], burialDepth: number): RuleResult {
  const base = {
    id: 'answer-first' as const,
    title: 'Answer first',
    convention: 'Open with the answer or the next action.',
  };
  if (burialDepth < 0) {
    return {
      ...base,
      status: 'fail',
      detail: 'No segment in the response carries a substance marker, so there is no answer to lead with.',
      evidence: [],
    };
  }
  if (burialDepth === 0) {
    return { ...base, status: 'pass', detail: 'The first segment is the answer.', evidence: [] };
  }
  const before = segments.filter((s) => s.wordsBefore < burialDepth);
  return {
    ...base,
    status: 'fail',
    detail: `${burialDepth} ${plural(burialDepth, 'word', 'words')} across ${before.length} ${plural(
      before.length,
      'segment',
      'segments',
    )} come before the first answer.`,
    evidence: before.map((s) => s.index),
  };
}

function absenceRule(
  id: 'no-preamble' | 'no-closer' | 'no-recap',
  title: string,
  convention: string,
  role: 'preamble' | 'closer' | 'recap',
  segments: Segment[],
): RuleResult {
  const hits = rolesOf(segments, role);
  if (hits.length === 0) {
    return { id, title, convention, status: 'pass', detail: `No ${role} detected.`, evidence: [] };
  }
  const quoted = hits[0].cue ? `"${hits[0].cue}"` : `"${hits[0].text.slice(0, 40)}"`;
  return {
    id,
    title,
    convention,
    status: 'fail',
    detail: `${hits.length} ${plural(hits.length, 'segment', 'segments')} flagged, starting with ${quoted}.`,
    evidence: hits.map((s) => s.index),
  };
}

/**
 * Bounded steps: a numbered step should contain one action. Two or more
 * imperative clauses joined by "and then" / "after that" / a semicolon means
 * the step is really two steps wearing one number.
 */
function boundedSteps(segments: Segment[]): RuleResult {
  const base = {
    id: 'bounded-steps' as const,
    title: 'Bounded steps',
    convention: 'Number multi-step work; one bounded action per step.',
  };
  const numbered = segments.filter((s) => s.numbered);
  const stepIds = [...new Set(numbered.map((s) => s.stepId))];
  if (stepIds.length === 0) {
    return {
      ...base,
      status: 'n/a',
      detail: 'No numbered steps in this response.',
      evidence: [],
    };
  }
  const joiners = [' and then ', ' after that ', ' then you ', ' followed by ', '; then ', ' and also '];
  // A step is unbounded if ANY of its sentences chains a second action on.
  const unboundedIds = stepIds.filter((id) =>
    numbered.filter((s) => s.stepId === id).some((s) => has(s.text, joiners)),
  );
  if (unboundedIds.length === 0) {
    return {
      ...base,
      status: 'pass',
      detail: `${stepIds.length} numbered ${plural(
        stepIds.length,
        'step carries',
        'steps carry',
      )} a single action.`,
      evidence: [],
    };
  }
  return {
    ...base,
    status: 'fail',
    detail: `${unboundedIds.length} of ${stepIds.length} numbered ${plural(
      stepIds.length,
      'step packs',
      'steps pack',
    )} more than one action into one number.`,
    evidence: numbered.filter((s) => unboundedIds.includes(s.stepId)).map((s) => s.index),
  };
}

/** Concrete time: durations expressed in units, not in vibes. */
function concreteTime(segments: Segment[]): RuleResult {
  const base = {
    id: 'concrete-time' as const,
    title: 'Concrete time',
    convention: 'Give time estimates in units, not in vague adverbs.',
  };
  const vague = segments.filter((s) => has(s.text, VAGUE_TIME));
  const concrete = segments.filter((s) =>
    TIME_UNITS.some((u) => new RegExp(`\\d+\\s*-?\\s*${u}\\b`, 'i').test(s.text)),
  );
  if (vague.length === 0 && concrete.length === 0) {
    return { ...base, status: 'n/a', detail: 'No duration claims in this response.', evidence: [] };
  }
  if (vague.length === 0) {
    return {
      ...base,
      status: 'pass',
      detail: `${concrete.length} duration ${plural(concrete.length, 'claim', 'claims')} given in units.`,
      evidence: [],
    };
  }
  return {
    ...base,
    status: 'fail',
    detail: `${vague.length} vague ${plural(vague.length, 'duration', 'durations')} with no unit attached.`,
    evidence: vague.map((s) => s.index),
  };
}

/** Error shape: when an error is discussed, say where, why and what to do. */
function errorShape(segments: Segment[]): RuleResult {
  const base = {
    id: 'error-shape' as const,
    title: 'Error shape',
    convention: 'State an error as location, cause and fix.',
  };
  const mentions = segments.filter((s) => has(s.text, ERROR_WORDS));
  if (mentions.length === 0) {
    return { ...base, status: 'n/a', detail: 'No error discussed in this response.', evidence: [] };
  }
  const whole = segments.map((s) => s.text).join(' ');
  // A fix can be stated as a remediation phrase, shown as a code block, or
  // simply given as an instruction -- all three tell the reader what to do.
  const hasFix =
    has(whole, FIX_WORDS) ||
    segments.some((s) => s.role === 'code') ||
    segments.some((s) => s.markers.includes('imperative'));

  const parts: string[] = [];
  if (!has(whole, LOCATION_WORDS)) parts.push('location');
  if (!has(whole, CAUSE_WORDS)) parts.push('cause');
  if (!hasFix) parts.push('fix');

  if (parts.length === 0) {
    return {
      ...base,
      status: 'pass',
      detail: 'Location, cause and fix are all present.',
      evidence: [],
    };
  }
  return {
    ...base,
    status: 'fail',
    detail: `An error is discussed but ${parts.join(' and ')} ${plural(
      parts.length,
      'is',
      'are',
    )} missing.`,
    evidence: mentions.map((s) => s.index),
  };
}

/** Hedge density: qualification per 100 words. */
function hedgeDensity(segments: Segment[], totalWords: number): RuleResult {
  const base = {
    id: 'hedge-density' as const,
    title: 'Hedge density',
    convention: `Stay under ${HEDGE_DENSITY_LIMIT} hedges per 100 words.`,
  };
  if (totalWords === 0) {
    return { ...base, status: 'n/a', detail: 'Nothing to measure.', evidence: [] };
  }
  const hits = segments.filter((s) => countHedges(s.text).length > 0);
  const count = segments.reduce((n, s) => n + countHedges(s.text).length, 0);
  const density = (count / totalWords) * 100;
  const shown = density.toFixed(1);
  if (density <= HEDGE_DENSITY_LIMIT) {
    return {
      ...base,
      status: 'pass',
      detail: `${count} ${plural(count, 'hedge', 'hedges')} in ${totalWords} words - ${shown} per 100.`,
      evidence: [],
    };
  }
  return {
    ...base,
    status: 'fail',
    detail: `${count} ${plural(count, 'hedge', 'hedges')} in ${totalWords} words - ${shown} per 100.`,
    evidence: hits.map((s) => s.index),
  };
}

export function runRules(segments: Segment[], burialDepth: number, totalWords: number): RuleResult[] {
  return [
    answerFirst(segments, burialDepth),
    absenceRule('no-preamble', 'No preamble', 'Cut the throat-clearing before the content.', 'preamble', segments),
    absenceRule('no-recap', 'No recap', 'Do not restate what you just said.', 'recap', segments),
    absenceRule('no-closer', 'No closer', 'End on the next action, not on a sign-off.', 'closer', segments),
    boundedSteps(segments),
    concreteTime(segments),
    errorShape(segments),
    hedgeDensity(segments, totalWords),
  ];
}
