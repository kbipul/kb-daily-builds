/**
 * Burial Depth - core types.
 *
 * The unit of analysis is a "segment": either one sentence of prose or one
 * fenced code block. Every segment gets exactly one role. Burial depth is the
 * number of words that sit in front of the first answer-bearing segment.
 */

export type Role =
  /** "Great question!", "Let me help you with that." - social throat-clearing. */
  | 'preamble'
  /** "First I'll check the config." - narration of the process, not the result. */
  | 'scaffold'
  /** "It depends, you may want to consider..." - qualification without commitment. */
  | 'hedge'
  /** "To summarise what we did above..." - restating work already stated. */
  | 'recap'
  /** "Hope this helps! Let me know if you have questions." - sign-off. */
  | 'closer'
  /** Prose carrying no substance marker: true but contentless connective tissue. */
  | 'filler'
  /** A fenced code block. Always answer-bearing. */
  | 'code'
  /** Prose carrying a substance marker and matching no anti-pattern cue. */
  | 'answer';

/** Roles that count as "the answer has started". */
export const ANSWER_ROLES: readonly Role[] = ['answer', 'code'];

/** Roles the published conventions name as things to remove outright. */
export const ANTI_PATTERN_ROLES: readonly Role[] = [
  'preamble',
  'scaffold',
  'recap',
  'closer',
];

export interface Segment {
  /** Position in the original text, 0-based. */
  index: number;
  /** The segment text, trimmed. */
  text: string;
  role: Role;
  /** Word count of this segment. Code blocks count their tokens as words. */
  words: number;
  /** Cumulative word count of every segment before this one. */
  wordsBefore: number;
  /** Which cue phrase triggered the role, when a cue was responsible. */
  cue?: string;
  /** Which substance markers were found, for the "why is this an answer" view. */
  markers: string[];
  /** True if this segment is part of a numbered list item. */
  numbered: boolean;
  /** Ordinal of the numbered step this segment belongs to, or -1. */
  stepId: number;
}

export type RuleId =
  | 'answer-first'
  | 'no-preamble'
  | 'no-closer'
  | 'no-recap'
  | 'bounded-steps'
  | 'concrete-time'
  | 'error-shape'
  | 'hedge-density';

export type RuleStatus = 'pass' | 'fail' | 'n/a';

export interface RuleResult {
  id: RuleId;
  /** Short label for the table. */
  title: string;
  /** The convention this check encodes, in one line. */
  convention: string;
  status: RuleStatus;
  /** One line explaining the verdict for THIS input. */
  detail: string;
  /** Offending segment indices, so the UI can point at them. */
  evidence: number[];
}

export interface Analysis {
  segments: Segment[];
  /** Total words in the input. */
  totalWords: number;
  /** Words before the first answer-bearing segment. -1 when nothing answers. */
  burialDepth: number;
  /** Index of the first answer-bearing segment, or -1. */
  firstAnswerIndex: number;
  /** burialDepth as a share of totalWords, 0..1. 1 when nothing answers. */
  burialRatio: number;
  /** Words that the anti-pattern roles account for, anywhere in the text. */
  removableWords: number;
  rules: RuleResult[];
  /** Count of rules that could be evaluated (status !== 'n/a'). */
  rulesApplicable: number;
  rulesPassed: number;
  /** The text with anti-pattern segments removed. */
  trimmed: string;
}

export type Band = 'clean' | 'shallow' | 'deep' | 'buried';

export interface BandInfo {
  band: Band;
  label: string;
  blurb: string;
}

/**
 * Bands are stated in words, not percentages, because a reader's patience is
 * absolute rather than proportional: 60 words of preamble is 20 seconds of
 * reading whether the answer is 100 words long or 1,000.
 */
export function bandFor(burialDepth: number): BandInfo {
  if (burialDepth < 0) {
    return {
      band: 'buried',
      label: 'No answer found',
      blurb:
        'Nothing here carries a substance marker - no command, no path, no number, no cause, no imperative. It may still be correct prose, but the checker cannot find a sentence that commits to anything.',
    };
  }
  if (burialDepth === 0) {
    return {
      band: 'clean',
      label: 'Answer first',
      blurb: 'The response opens with the answer. This is the shape the convention asks for.',
    };
  }
  if (burialDepth <= 25) {
    return {
      band: 'shallow',
      label: 'Shallow',
      blurb:
        'About a sentence of warm-up. Survivable, but it is still a sentence the reader pays for.',
    };
  }
  if (burialDepth <= 80) {
    return {
      band: 'deep',
      label: 'Deep',
      blurb:
        'A paragraph of scaffolding before the point. This is where readers start skimming to the bottom.',
    };
  }
  return {
    band: 'buried',
    label: 'Buried',
    blurb:
      'Past this depth the reader is scrolling, not reading. Whatever the answer is, it arrives after the attention has left.',
  };
}
