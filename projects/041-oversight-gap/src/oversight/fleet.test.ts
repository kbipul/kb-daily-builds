import { describe, it, expect } from 'vitest';
import { fleetMetrics, summaryLine, SCENARIOS } from './fleet';

const byName = (n: string) => {
  const f = SCENARIOS.find((s) => s.name.startsWith(n));
  if (!f) throw new Error(`no scenario ${n}`);
  return f;
};

describe('the three metrics on a fleet', () => {
  it('reproduces the published block rate for the Anthropic scenario', () => {
    const m = fleetMetrics(byName('Anthropic'));
    expect(m.coverage).toBe(1);
    expect(m.escalationRate).toBeCloseTo(1 / 47_000, 9);
  });

  it('turns that into about 4,804 blocked actions a week', () => {
    const m = fleetMetrics(byName('Anthropic'));
    expect(Math.round(m.blockedPerWeek)).toBe(4804);
  });

  it('flags a fleet with write actions nothing inspects', () => {
    const m = fleetMetrics(byName('Platform team'));
    expect(m.uninspectedWrites).toBe(3_300);
    expect(m.writeCoverage).toBeLessThan(1);
  });

  it('gives full write coverage where every write is checked', () => {
    const m = fleetMetrics(byName('Support desk'));
    expect(m.writeCoverage).toBe(1);
    expect(m.uninspectedWrites).toBe(0);
  });
});

describe('the sentence a team can hand its manager', () => {
  it('states coverage, latency and escalation with denominators', () => {
    const line = summaryLine(byName('Support desk'));
    expect(line).toContain('100% of our agents');
    expect(line).toContain('median of 6h');
    expect(line).toContain('0.081% of actions were held');
  });
});

describe('degenerate input', () => {
  it('reports zero rather than NaN for an empty period', () => {
    const m = fleetMetrics({
      name: 'empty',
      actions: 0,
      inspected: 0,
      writeActions: 0,
      writeInspected: 0,
      blocked: 0,
      medianHumanHours: 0,
      periodDays: 0,
    });
    expect(m.coverage).toBe(0);
    expect(m.escalationRate).toBe(0);
    expect(m.blockedPerWeek).toBe(0);
  });
});
