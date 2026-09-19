/**
 * Queue arithmetic on the published figures.
 *
 * Anthropic states a review commitment ("humans review any blocked actions
 * within one week") and, separately, a block count. Put together they imply a
 * weekly human workload that neither number states on its own. Same for the
 * offline monitor: a flag volume and a flag rate imply a transcript volume.
 *
 * Nothing here is an accusation. It is division, applied to figures published
 * in one table, with the lower-bound caveat carried through.
 */

import {
  AUGUST_DAYS,
  AUGUST_DECISIONS_LOWER_BOUND,
  BLOCK_RATE_PERCENT,
  BLOCK_RATE_RATIO,
  DAYS_PER_WEEK,
  OFFLINE_FLAGS_PER_WEEK,
  OFFLINE_FLAG_RATE_HIGH,
  OFFLINE_FLAG_RATE_LOW,
  OFFLINE_HUMAN_REVIEWS_PER_WEEK,
} from './figures';

export const WEEKS_IN_AUGUST = AUGUST_DAYS / DAYS_PER_WEEK;

export interface BlockedReviewLoad {
  /** Blocks implied by "0.002%" of the stated decision count. */
  readonly fromPercent: number;
  /** Blocks implied by "about 1 in 47,000" of the same count. */
  readonly fromRatio: number;
  /** How far apart the two printed forms of one rate are, as a share. */
  readonly spread: number;
  /** Blocked actions per week needing a human look, from the ratio form. */
  readonly perWeekFromRatio: number;
  /** Same, from the percent form. */
  readonly perWeekFromPercent: number;
}

/**
 * "0.002% of them (about 1 in 47,000)" prints one rate two ways. 0.002% is one
 * in fifty thousand; one in forty-seven thousand is 0.00213%. Which form you
 * take changes every count derived from it.
 */
export function blockedReviewLoad(
  decisions: number = AUGUST_DECISIONS_LOWER_BOUND,
): BlockedReviewLoad {
  const fromPercent = decisions * BLOCK_RATE_PERCENT;
  const fromRatio = decisions * BLOCK_RATE_RATIO;
  return {
    fromPercent,
    fromRatio,
    spread: (fromRatio - fromPercent) / fromPercent,
    perWeekFromRatio: fromRatio / WEEKS_IN_AUGUST,
    perWeekFromPercent: fromPercent / WEEKS_IN_AUGUST,
  };
}

export interface OfflineFunnel {
  /** Flags raised per week. */
  readonly flags: number;
  /** Flags that reach a person. */
  readonly toHumans: number;
  /** Share of flags that reach a person. */
  readonly humanShare: number;
  /** Transcripts implied by the flag volume at the high end of the flag rate. */
  readonly transcriptsLow: number;
  /** Same, at the low end of the flag rate -- a larger population. */
  readonly transcriptsHigh: number;
}

/**
 * "roughly 100,000 transcripts per week" flagged, at "one to two transcripts in
 * every thousand", implies the population those flags were drawn from.
 */
export function offlineFunnel(): OfflineFunnel {
  return {
    flags: OFFLINE_FLAGS_PER_WEEK,
    toHumans: OFFLINE_HUMAN_REVIEWS_PER_WEEK,
    humanShare: OFFLINE_HUMAN_REVIEWS_PER_WEEK / OFFLINE_FLAGS_PER_WEEK,
    transcriptsLow: OFFLINE_FLAGS_PER_WEEK / OFFLINE_FLAG_RATE_HIGH,
    transcriptsHigh: OFFLINE_FLAGS_PER_WEEK / OFFLINE_FLAG_RATE_LOW,
  };
}

/**
 * Transcripts per agent per week, if the implied transcript population is
 * spread evenly over the stated fleet. Reported so a reader can judge whether
 * the two figures share a denominator. The app does not resolve it.
 */
export function transcriptsPerAgent(agents: number): {
  low: number;
  high: number;
} {
  const funnel = offlineFunnel();
  return {
    low: funnel.transcriptsLow / agents,
    high: funnel.transcriptsHigh / agents,
  };
}
