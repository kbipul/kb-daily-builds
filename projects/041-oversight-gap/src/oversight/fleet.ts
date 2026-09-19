/**
 * The three metrics Anthropic proposes, computed for any fleet from a tool-call
 * log shape: coverage, review latency, escalation rate. The definitions are
 * Anthropic's; the arithmetic is a count over a count and a timestamp
 * difference, which is the point the post makes about them.
 */

export interface FleetInput {
  readonly name: string;
  /** Actions (tool calls, not model turns) in the period. */
  readonly actions: number;
  /** Actions that passed through an automated check. */
  readonly inspected: number;
  /** Write-capable actions in the period. */
  readonly writeActions: number;
  /** Write-capable actions that passed through a check. */
  readonly writeInspected: number;
  /** Actions blocked or held. */
  readonly blocked: number;
  /** Median hours from a flag to a named person opening it. */
  readonly medianHumanHours: number;
  /** Days in the period, for weekly rates. */
  readonly periodDays: number;
}

export interface FleetMetrics {
  readonly coverage: number;
  readonly writeCoverage: number;
  readonly escalationRate: number;
  readonly blockedPerWeek: number;
  readonly medianHumanHours: number;
  /** Actions with a path to act that nothing inspects. */
  readonly uninspectedWrites: number;
}

export function fleetMetrics(f: FleetInput): FleetMetrics {
  const weeks = f.periodDays / 7;
  return {
    coverage: f.actions > 0 ? f.inspected / f.actions : 0,
    writeCoverage: f.writeActions > 0 ? f.writeInspected / f.writeActions : 0,
    escalationRate: f.actions > 0 ? f.blocked / f.actions : 0,
    blockedPerWeek: weeks > 0 ? f.blocked / weeks : 0,
    medianHumanHours: f.medianHumanHours,
    uninspectedWrites: f.writeActions - f.writeInspected,
  };
}

/** The one-line summary the post suggests a team should be able to say. */
export function summaryLine(f: FleetInput): string {
  const m = fleetMetrics(f);
  const writePct = (m.writeCoverage * 100).toFixed(0);
  const escPct = (m.escalationRate * 100).toFixed(3);
  return (
    `${writePct}% of our agents' write actions are checked before they run; ` +
    `a person opens anything blocked in a median of ${m.medianHumanHours}h; ` +
    `${escPct}% of actions were held last period.`
  );
}

export const SCENARIOS: readonly FleetInput[] = [
  {
    name: 'Anthropic, August 2026 (derived from published figures)',
    actions: 1_000_000_000,
    inspected: 1_000_000_000,
    writeActions: 1_000_000_000,
    writeInspected: 1_000_000_000,
    blocked: 21_277,
    medianHumanHours: 168,
    periodDays: 31,
  },
  {
    name: 'Support desk: 3 agents that can refund',
    actions: 42_000,
    inspected: 42_000,
    writeActions: 1_900,
    writeInspected: 1_900,
    blocked: 34,
    medianHumanHours: 6,
    periodDays: 30,
  },
  {
    name: 'Platform team: coding agents that can merge',
    actions: 310_000,
    inspected: 268_000,
    writeActions: 12_400,
    writeInspected: 9_100,
    blocked: 96,
    medianHumanHours: 52,
    periodDays: 30,
  },
];
