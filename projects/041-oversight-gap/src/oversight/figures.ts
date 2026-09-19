/**
 * Anthropic's published oversight figures, 17 September 2026.
 *
 * Source: "Measurements for understanding the pace of AI development inside
 * frontier labs", Marina Favaro and Phillie Wright, Anthropic Institute.
 * https://www.anthropic.com/institute/measuring-pace-of-ai-development
 *
 * Every `quote` below is copied verbatim from that post. Every `scope` is the
 * sentence Anthropic attaches to the number; it travels with the number
 * everywhere it is used in this app. Nothing here is estimated or filled in --
 * a figure Anthropic did not publish is absent, not guessed.
 */

export const SOURCE = {
  title:
    'Measurements for understanding the pace of AI development inside frontier labs',
  authors: 'Marina Favaro and Phillie Wright, Anthropic Institute',
  url: 'https://www.anthropic.com/institute/measuring-pace-of-ai-development',
  published: '2026-09-17',
  read: '2026-09-19',
} as const;

export type MetricKind = 'coverage' | 'latency' | 'escalation' | 'fleet';

export interface PublishedFigure {
  readonly id: string;
  readonly metric: MetricKind;
  readonly label: string;
  readonly value: string;
  readonly quote: string;
  readonly scope: string;
}

export const PUBLISHED: readonly PublishedFigure[] = [
  {
    id: 'agents',
    metric: 'fleet',
    label: 'Agents running',
    value: '~30,000',
    quote:
      'As of August 2026, there were approximately 30,000 agents doing research and engineering work at Anthropic at any one time in our most-used internal platform.',
    scope: 'Most-used internal platform only, as of August 2026.',
  },
  {
    id: 'coverage-online',
    metric: 'coverage',
    label: 'Coverage, online monitor',
    value: '100% of actions',
    quote:
      '100% of these agents’ actions pass through the online monitor before they are executed, usually within seconds.',
    scope: 'Checked before execution. Coverage counts inspection, not detection.',
  },
  {
    id: 'coverage-offline',
    metric: 'coverage',
    label: 'Coverage, offline monitor',
    value: '100% of actions',
    quote:
      '100% of these agents’ actions are ingested by the monitor after they are taken.',
    scope: 'Ingested after the fact, for slow-developing problems.',
  },
  {
    id: 'latency-online',
    metric: 'latency',
    label: 'Review latency, online',
    value: 'Before action; humans within one week',
    quote:
      'Automated review happens before an agent takes action; humans review any blocked actions within one week.',
    scope: 'The human clock starts at a block, not at an action.',
  },
  {
    id: 'latency-offline',
    metric: 'latency',
    label: 'Review latency, offline',
    value: '~100,000 flags/week; ~50 to humans',
    quote:
      'The monitor flags roughly 100,000 transcripts per week that are then reviewed by multiple classifiers for false-positives and initial oversight review. Most of the flags are resolved by this process, and the highest priority flags (approximately ~50 per week) are escalated to human review.',
    scope: 'Flag volume and human-escalation volume, per week.',
  },
  {
    id: 'blocking',
    metric: 'escalation',
    label: 'Blocking rate, online',
    value: '0.002% (about 1 in 47,000)',
    quote:
      'We analyzed over a billion decisions from our research & engineering agents over August 2026 and found that 0.002% of them (about 1 in 47,000) were blocked by this monitor.',
    scope: 'Over a billion decisions, August 2026. "Over" makes it a lower bound.',
  },
  {
    id: 'flagging',
    metric: 'escalation',
    label: 'Flag rate, offline',
    value: '1 to 2 per 1,000 transcripts',
    quote:
      'The monitor flags roughly one to two transcripts in every thousand for further review.',
    scope: 'Transcripts, not actions. A different denominator from the block rate.',
  },
];

/**
 * The number Anthropic asks other developers to publish and does not publish
 * itself. Quoted rather than paraphrased, because an absence is easy to
 * misrepresent and this project is built on one.
 */
export const MISSING_NUMBER = {
  askedFor:
    'Developers should share how often known agent misbehavior is caught by monitors, and should have third parties do this kind of testing independently.',
  limitation:
    'At this scale of agent activity, it is hard to be certain we have a complete picture of all possible kinds of behaviors, or that we are making these patterns adequately legible to human oversight.',
  whyItMatters:
    'In our monitoring data to date, individual agents rarely misbehave. But when there are millions or billions of agents operating in the economy, even rare events can happen regularly.',
} as const;

/** The two forms of the block rate, as printed in one sentence. */
export const BLOCK_RATE_PERCENT = 0.002 / 100; // 0.002%       -> 1 in 50,000
export const BLOCK_RATE_RATIO = 1 / 47_000; //    1 in 47,000  -> 0.0021276%

/** "over a billion decisions" -- used as the lower bound it is. */
export const AUGUST_DECISIONS_LOWER_BOUND = 1_000_000_000;

/** Offline monitor, per week. */
export const OFFLINE_FLAGS_PER_WEEK = 100_000;
export const OFFLINE_HUMAN_REVIEWS_PER_WEEK = 50;
export const OFFLINE_FLAG_RATE_LOW = 1 / 1000;
export const OFFLINE_FLAG_RATE_HIGH = 2 / 1000;

/** August 2026 has 31 days. Used to turn a monthly count into a weekly queue. */
export const AUGUST_DAYS = 31;
export const DAYS_PER_WEEK = 7;
