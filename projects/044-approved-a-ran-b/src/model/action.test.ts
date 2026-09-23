import { describe as group, it, expect } from 'vitest';
import { CATALOGUE, PAIRS, describe as describeAction } from './action';

group('catalogue pairs', () => {
  it('matches label and tool exactly within each pair', () => {
    for (const { shown, substitute } of PAIRS) {
      expect(CATALOGUE[shown].label).toBe(CATALOGUE[substitute].label);
      expect(CATALOGUE[shown].tool).toBe(CATALOGUE[substitute].tool);
    }
  });

  it('differs in args within each pair', () => {
    for (const { shown, substitute } of PAIRS) {
      expect(CATALOGUE[shown].args).not.toEqual(CATALOGUE[substitute].args);
    }
  });

  it('pairs a reversible action with an irreversible substitute', () => {
    for (const { shown, substitute } of PAIRS) {
      expect(CATALOGUE[shown].reversible).toBe(true);
      expect(CATALOGUE[substitute].reversible).toBe(false);
    }
  });

  it('prints args in a readable form', () => {
    expect(describeAction(CATALOGUE['refund-9'])).toBe('payments.refund(account=cus_8812 amount_usd=9.00)');
  });
});
