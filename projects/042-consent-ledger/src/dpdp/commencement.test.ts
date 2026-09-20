import { describe, expect, it } from 'vitest';
import {
  ALTERNATE_PUBLICATION,
  GROUPS,
  PUBLICATION,
  countdown,
  countdowns,
  inForceToday,
} from './commencement';

const [oneYear, eighteenMonths] = GROUPS;

describe('commencement arithmetic', () => {
  it('states the periods in the notification\'s own words', () => {
    expect(oneYear.period).toContain('one year from the date of publication');
    expect(eighteenMonths.period).toContain('eighteen months from the date of publication');
  });

  it('the two publication dates differ by exactly one day', () => {
    const diff = Date.parse(`${ALTERNATE_PUBLICATION}T00:00:00Z`) - Date.parse(`${PUBLICATION}T00:00:00Z`);
    expect(diff).toBe(86_400_000);
  });

  it('carries the one-day ambiguity through to every computed date', () => {
    for (const g of GROUPS) {
      const a = Date.parse(`${g.computed}T00:00:00Z`);
      const b = Date.parse(`${g.computedAlternate}T00:00:00Z`);
      expect(b - a, g.id).toBe(86_400_000);
    }
  });

  it('counts days to the one-year group from a fixed date', () => {
    const c = countdown(new Date('2026-09-20T00:00:00Z'), oneYear);
    expect(c.daysAway).toBe(54);
    expect(c.daysAwayAlternate).toBe(55);
    expect(c.arrived).toBe(false);
  });

  it('counts days to the eighteen-month group from the same date', () => {
    const c = countdown(new Date('2026-09-20T00:00:00Z'), eighteenMonths);
    expect(c.daysAway).toBe(235);
  });

  it('ignores the time of day, so a countdown does not move at noon', () => {
    const morning = countdown(new Date('2026-09-20T00:01:00Z'), oneYear).daysAway;
    const night = countdown(new Date('2026-09-20T23:59:00Z'), oneYear).daysAway;
    expect(morning).toBe(night);
  });

  it('marks a group arrived on the day itself, not the day after', () => {
    expect(countdown(new Date('2026-11-13T09:00:00Z'), oneYear).arrived).toBe(true);
    expect(countdown(new Date('2026-11-12T09:00:00Z'), oneYear).arrived).toBe(false);
  });

  it('none of the duties this app models are in force in September 2026', () => {
    expect(inForceToday(new Date('2026-09-20T00:00:00Z'))).toBe(false);
  });

  it('the consent duties arrive in the eighteen-month group, not the one-year group', () => {
    expect(oneYear.brings).toContain('Not the consent duties themselves');
    expect(eighteenMonths.brings).toContain('section 6(1) to (8)');
  });

  it('returns both groups in order, nearest first', () => {
    const cs = countdowns(new Date('2026-09-20T00:00:00Z'));
    expect(cs).toHaveLength(2);
    expect(cs[0].daysAway).toBeLessThan(cs[1].daysAway);
  });

  it('each group points at the clause it comes from', () => {
    expect(oneYear.clause).toBe('gsr843_b');
    expect(eighteenMonths.clause).toBe('gsr843_c');
  });
});
