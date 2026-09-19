import { describe, it, expect } from 'vitest';
import {
  blockedReviewLoad,
  offlineFunnel,
  transcriptsPerAgent,
  WEEKS_IN_AUGUST,
} from './queue';
import { AUGUST_DECISIONS_LOWER_BOUND } from './figures';

describe('the two printed forms of one block rate', () => {
  it('0.002 percent is one in fifty thousand, not one in forty-seven thousand', () => {
    const load = blockedReviewLoad(AUGUST_DECISIONS_LOWER_BOUND);
    expect(load.fromPercent).toBe(20_000);
    expect(Math.round(load.fromRatio)).toBe(21_277);
  });

  it('puts the two forms about six percent apart', () => {
    const load = blockedReviewLoad(AUGUST_DECISIONS_LOWER_BOUND);
    expect(load.spread).toBeGreaterThan(0.06);
    expect(load.spread).toBeLessThan(0.065);
  });

  it('scales with the decision count, so a larger true count widens the gap', () => {
    const a = blockedReviewLoad(1_000_000_000);
    const b = blockedReviewLoad(2_000_000_000);
    expect(b.fromRatio - b.fromPercent).toBeCloseTo(
      2 * (a.fromRatio - a.fromPercent),
      6,
    );
  });
});

describe('the human review queue implied by the one-week commitment', () => {
  it('turns a monthly block count into a weekly queue', () => {
    expect(WEEKS_IN_AUGUST).toBeCloseTo(4.4286, 3);
  });

  it('puts roughly forty-eight hundred blocked actions a week in front of people', () => {
    const load = blockedReviewLoad(AUGUST_DECISIONS_LOWER_BOUND);
    expect(Math.round(load.perWeekFromRatio)).toBe(4804);
    expect(Math.round(load.perWeekFromPercent)).toBe(4516);
  });
});

describe('the offline funnel', () => {
  it('sends one flag in two thousand to a person', () => {
    const f = offlineFunnel();
    expect(f.humanShare).toBeCloseTo(0.0005, 6);
  });

  it('implies a transcript population of fifty to a hundred million a week', () => {
    const f = offlineFunnel();
    expect(f.transcriptsLow).toBe(50_000_000);
    expect(f.transcriptsHigh).toBe(100_000_000);
  });

  it('spreads that population over 30,000 agents at a rate worth questioning', () => {
    const t = transcriptsPerAgent(30_000);
    expect(Math.round(t.low)).toBe(1667);
    expect(Math.round(t.high)).toBe(3333);
  });
});
