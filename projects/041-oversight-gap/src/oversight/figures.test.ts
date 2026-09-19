import { describe, it, expect } from 'vitest';
import { PUBLISHED, SOURCE, MISSING_NUMBER, BLOCK_RATE_PERCENT, BLOCK_RATE_RATIO } from './figures';

describe('every published figure travels with its scope', () => {
  it('has a non-empty quote and scope on each entry', () => {
    for (const f of PUBLISHED) {
      expect(f.quote.length).toBeGreaterThan(20);
      expect(f.scope.length).toBeGreaterThan(10);
    }
  });

  it('covers all three of the proposed metrics', () => {
    const kinds = new Set(PUBLISHED.map((f) => f.metric));
    expect(kinds.has('coverage')).toBe(true);
    expect(kinds.has('latency')).toBe(true);
    expect(kinds.has('escalation')).toBe(true);
  });

  it('cites one source with a date', () => {
    expect(SOURCE.url).toBe(
      'https://www.anthropic.com/institute/measuring-pace-of-ai-development',
    );
    expect(SOURCE.published).toBe('2026-09-17');
  });

  it('records no catch rate, because the post publishes none', () => {
    const catchRate = PUBLISHED.find((f) => /catch|recall|false.negative/i.test(f.label));
    expect(catchRate).toBeUndefined();
    expect(MISSING_NUMBER.askedFor).toContain('how often known agent misbehavior is caught');
  });
});

describe('the block rate as printed', () => {
  it('reads 0.002 percent one way and one in 47,000 the other', () => {
    expect(BLOCK_RATE_PERCENT).toBeCloseTo(0.00002, 10);
    expect(1 / BLOCK_RATE_RATIO).toBe(47_000);
  });

  it('makes the ratio form the larger of the two', () => {
    expect(BLOCK_RATE_RATIO).toBeGreaterThan(BLOCK_RATE_PERCENT);
  });
});
