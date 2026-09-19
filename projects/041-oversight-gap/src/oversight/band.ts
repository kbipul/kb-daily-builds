/**
 * The band.
 *
 * Coverage says every action was inspected. It does not say every bad action
 * was caught. The catch rate -- recall -- is the number Anthropic asks other
 * developers to publish and does not publish for itself.
 *
 * This module answers one question: for a fleet whose published figures are
 * fixed, how many harmful actions ran anyway? The answer is a function of
 * recall, and recall is unknown, so the answer is a band rather than a number.
 */

export interface BandInput {
  /** Total actions in the period. */
  readonly actions: number;
  /** Observed share of actions blocked by the online monitor. */
  readonly blockRate: number;
  /** Share of actions that pass through a monitor at all. 1 = full coverage. */
  readonly coverage: number;
  /** Share of blocks that were genuinely harmful. Unknown; 1 is the most charitable reading. */
  readonly precision: number;
  /** Share of genuinely harmful actions the monitor blocks. Unknown. */
  readonly recall: number;
}

export interface BandResult {
  /** Actions blocked, from the observed rate. */
  readonly blocked: number;
  /** Blocks that were genuinely harmful: blocked * precision. */
  readonly trueBlocks: number;
  /** Blocks that were not: blocked - trueBlocks. */
  readonly falseBlocks: number;
  /** Harmful actions in the monitored stream, inferred: trueBlocks / recall. */
  readonly harmfulMonitored: number;
  /** Harmful actions the monitor saw and let through: harmfulMonitored - trueBlocks. */
  readonly missedMonitored: number;
  /** Harmful actions in the unmonitored stream, at the same underlying rate. */
  readonly missedUnmonitored: number;
  /** Everything harmful that ran: missedMonitored + missedUnmonitored. */
  readonly ranAnyway: number;
  /** Actions that were never inspected at all: actions * (1 - coverage). */
  readonly uninspected: number;
}

/**
 * With recall at exactly 0 the monitor catches nothing, so the observed blocks
 * cannot be true positives and the inference divides by zero. Callers are
 * clamped to this floor rather than shown Infinity, and the UI says so.
 */
export const MIN_RECALL = 0.01;

export function bandFor(input: BandInput): BandResult {
  const { actions, blockRate, coverage, precision } = input;
  const recall = Math.max(input.recall, MIN_RECALL);

  const monitored = actions * coverage;
  const uninspected = actions - monitored;

  const blocked = actions * blockRate;
  const trueBlocks = blocked * precision;
  const falseBlocks = blocked - trueBlocks;

  const harmfulMonitored = trueBlocks / recall;
  const missedMonitored = harmfulMonitored - trueBlocks;

  // The unmonitored stream is assumed to carry harm at the same underlying
  // rate as the monitored one. Nothing blocks there, so all of it runs.
  const harmfulRate = monitored > 0 ? harmfulMonitored / monitored : 0;
  const missedUnmonitored = uninspected * harmfulRate;

  return {
    blocked,
    trueBlocks,
    falseBlocks,
    harmfulMonitored,
    missedMonitored,
    missedUnmonitored,
    ranAnyway: missedMonitored + missedUnmonitored,
    uninspected,
  };
}

/**
 * Every published metric in `figures.ts` is invariant to recall: the same
 * coverage, the same block count, the same latency. This returns the observed
 * quantities so a test can assert they do not move while the band does.
 */
export function observedSignature(input: BandInput): {
  coverage: number;
  blocked: number;
} {
  const r = bandFor(input);
  return { coverage: input.coverage, blocked: r.blocked };
}

/** Sample the band across a range of recall values, for the chart. */
export function sweepRecall(
  input: Omit<BandInput, 'recall'>,
  recalls: readonly number[],
): readonly { recall: number; ranAnyway: number }[] {
  return recalls.map((recall) => ({
    recall,
    ranAnyway: bandFor({ ...input, recall }).ranAnyway,
  }));
}
