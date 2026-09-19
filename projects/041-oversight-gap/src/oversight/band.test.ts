import { describe, it, expect } from 'vitest';
import { bandFor, observedSignature, sweepRecall, MIN_RECALL } from './band';
import type { BandInput } from './band';
import { BLOCK_RATE_RATIO } from './figures';

/** Anthropic's August 2026 stream, as published, with recall left open. */
const august = (recall: number, precision = 1): BandInput => ({
  actions: 1_000_000_000,
  blockRate: BLOCK_RATE_RATIO,
  coverage: 1,
  precision,
  recall,
});

describe('the published figures do not move with recall', () => {
  it('reports the same coverage and the same block count at every recall', () => {
    const perfect = observedSignature(august(1));
    const poor = observedSignature(august(0.1));
    expect(poor.coverage).toBe(perfect.coverage);
    expect(poor.blocked).toBe(perfect.blocked);
  });

  it('blocks about 21,277 actions regardless', () => {
    expect(Math.round(bandFor(august(1)).blocked)).toBe(21_277);
    expect(Math.round(bandFor(august(0.3)).blocked)).toBe(21_277);
  });
});

describe('what ran anyway', () => {
  it('is zero only when the monitor catches everything', () => {
    expect(bandFor(august(1)).ranAnyway).toBe(0);
  });

  it('at ninety percent recall, lets about 2,364 harmful actions through', () => {
    expect(Math.round(bandFor(august(0.9)).ranAnyway)).toBe(2_364);
  });

  it('at fifty percent recall, lets through as many as it blocked', () => {
    const r = bandFor(august(0.5));
    expect(Math.round(r.ranAnyway)).toBe(Math.round(r.blocked));
  });

  it('at ten percent recall, lets through nine times what it blocked', () => {
    const r = bandFor(august(0.1));
    expect(Math.round(r.ranAnyway)).toBe(Math.round(9 * r.blocked));
  });

  it('rises monotonically as recall falls', () => {
    const swept = sweepRecall(
      { actions: 1e9, blockRate: BLOCK_RATE_RATIO, coverage: 1, precision: 1 },
      [1, 0.9, 0.7, 0.5, 0.3, 0.1],
    );
    for (let i = 1; i < swept.length; i++) {
      expect(swept[i].ranAnyway).toBeGreaterThan(swept[i - 1].ranAnyway);
    }
  });
});

describe('precision is the other unknown', () => {
  it('shrinks the inferred harm when most blocks were false alarms', () => {
    const charitable = bandFor(august(0.5, 1));
    const noisy = bandFor(august(0.5, 0.2));
    expect(noisy.ranAnyway).toBeLessThan(charitable.ranAnyway);
    expect(Math.round(noisy.falseBlocks)).toBe(17_021);
  });

  it('does not change the observed block count either', () => {
    expect(observedSignature(august(0.5, 0.2)).blocked).toBe(
      observedSignature(august(0.5, 1)).blocked,
    );
  });
});

describe('coverage below one hundred percent', () => {
  it('adds harm from the stream nothing inspected', () => {
    const full = bandFor({ ...august(0.8), coverage: 1 });
    const partial = bandFor({ ...august(0.8), coverage: 0.9 });
    expect(partial.missedUnmonitored).toBeGreaterThan(0);
    expect(full.missedUnmonitored).toBe(0);
    expect(partial.ranAnyway).toBeGreaterThan(full.ranAnyway);
  });

  it('counts the uninspected actions themselves', () => {
    const r = bandFor({ ...august(0.8), coverage: 0.95 });
    expect(r.uninspected).toBe(50_000_000);
  });
});

describe('the floor at recall zero', () => {
  it('clamps rather than returning Infinity', () => {
    const r = bandFor(august(0));
    expect(Number.isFinite(r.ranAnyway)).toBe(true);
    expect(r.ranAnyway).toBe(bandFor(august(MIN_RECALL)).ranAnyway);
  });
});

describe('rounding order, learned the hard way', () => {
  it('rounds the product, not the product of roundings', () => {
    const r = bandFor(august(0.1));
    // 1e9 / 47,000 is 21,276.59..., so nine times the rounded block count and
    // the rounded nine-times figure differ by four whole actions.
    expect(Math.round(9 * r.blocked)).toBe(191_489);
    expect(9 * Math.round(r.blocked)).toBe(191_493);
  });
});
