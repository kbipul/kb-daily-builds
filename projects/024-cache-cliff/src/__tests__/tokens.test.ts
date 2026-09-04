import { describe, expect, it } from 'vitest';
import { ESTIMATOR_ERROR_BAND, estimateTokens } from '../engine/tokens';

describe('estimateTokens', () => {
  it('is zero for empty input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   ')).toBe(1);
  });

  it('counts a short word as one token', () => {
    expect(estimateTokens('cat')).toBe(1);
  });

  it('keeps ordinary words whole and splits only the long ones', () => {
    expect(estimateTokens('caching')).toBe(1);
    expect(estimateTokens('extraordinarily')).toBe(3);
  });

  it('chunks digit runs more densely than letters', () => {
    expect(estimateTokens('123456789')).toBe(3);
    expect(estimateTokens('123456789')).toBeGreaterThan(estimateTokens('abcdefghi'));
  });

  it('does not charge for the single space between words', () => {
    expect(estimateTokens('one two')).toBe(estimateTokens('one') + estimateTokens('two'));
  });

  it('gives punctuation its own token', () => {
    expect(estimateTokens('hi, there')).toBe(estimateTokens('hi') + 1 + estimateTokens('there'));
  });

  it('grows monotonically with text length', () => {
    let prev = 0;
    for (const n of [1, 10, 100, 1000]) {
      const t = estimateTokens('word '.repeat(n));
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });

  it('lands within its own stated error band on ordinary English prose', () => {
    const prose =
      'The quick brown fox jumps over the lazy dog while the engineer wonders whether the prompt cache will hold together for another billing cycle.';
    // 24 words plus a full stop. Reference counts from cl100k/o200k-class
    // tokenizers on this sentence land at 26-28 tokens.
    const reference = 27;
    const t = estimateTokens(prose);
    expect(Math.abs(t - reference) / reference).toBeLessThanOrEqual(ESTIMATOR_ERROR_BAND);
  });

  it('handles newlines without exploding', () => {
    expect(estimateTokens('a\n\n\n\nb')).toBeGreaterThan(estimateTokens('a b'));
  });
});
