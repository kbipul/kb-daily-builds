/** A half-open window of UTC minutes-from-midnight: [startMin, endMin). */
export interface UtcWindow {
  startMin: number;
  endMin: number;
}

/** Prices are USD per 1,000,000 output tokens. */
export interface BandPrice {
  peak: number;
  offpeak: number;
}

export interface ModelPricing {
  id: string;
  provider: string;
  name: string;
  /** USD per 1M OUTPUT tokens. Flat-rate models have peak === offpeak. */
  outputPerMTok: BandPrice;
  /** Empty array => flat pricing, no time-of-day bands. */
  peakWindowsUtc: UtcWindow[];
  /** The flat rate in force before this repricing, if the source states one. */
  previousFlatOutputPerMTok: number | null;
  effectiveFrom: string;
  source: string;
  note: string;
}

export interface Zone {
  id: string;
  label: string;
  /** Minutes east of UTC. IST = +330. Fixed offset — no DST arithmetic. */
  offsetMin: number;
}

export interface Workload {
  id: string;
  name: string;
  /** 24 buckets of output tokens, indexed by LOCAL hour in the chosen zone. */
  hourlyOutputTokens: number[];
  /** Whether this traffic may legitimately be run later or earlier. */
  deferrable: boolean;
  /** SLA: how many hours this work may be moved, in either direction. */
  maxShiftHours: number;
}

export interface TrafficProfile {
  id: string;
  name: string;
  blurb: string;
  workloads: Workload[];
}

/** Per-local-hour cost breakdown. */
export interface HourCost {
  hour: number;
  tokens: number;
  /** Fraction of this local hour that falls inside a peak window, 0..1. */
  peakFraction: number;
  /** Blended USD per 1M tokens for this hour. */
  blendedPerMTok: number;
  costUsd: number;
}

export interface CostReport {
  hours: HourCost[];
  totalTokens: number;
  totalCostUsd: number;
  /** Share of total cost attributable to peak-priced minutes, 0..1. */
  peakExposure: number;
  /** Cost under the previous flat rate, when the source published one. */
  previousFlatCostUsd: number | null;
}

export interface ShiftMove {
  workloadId: string;
  fromHour: number;
  toHour: number;
  tokens: number;
  savedUsd: number;
}

export interface ShiftResult {
  /** Per-workload shifted hourly arrays, keyed by workload id. */
  shifted: Record<string, number[]>;
  moves: ShiftMove[];
  /** Deferrable tokens that had no strictly cheaper reachable hour with capacity. */
  strandedTokens: number;
}
