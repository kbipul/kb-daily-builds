import { describe, expect, it } from 'vitest';
import { DEFAULT_RECORD, togglePurpose, type ConsentRecord } from './record';
import { USES, use } from './uses';
import { countBy, evaluate, ledger } from './evaluate';

const base: ConsentRecord = { ...DEFAULT_RECORD };

function withPurposes(...ps: ConsentRecord['specifiedPurposes']): ConsentRecord {
  return { ...base, specifiedPurposes: ps };
}

describe('evaluate', () => {
  it('authorises the stage the notice actually specified', () => {
    const r = evaluate(withPurposes('service-delivery'), use('serve-answer'));
    expect(r.verdict).toBe('authorised');
    expect(r.basis).toContain('s6_1');
  });

  it('refuses training when the notice only mentioned delivering the service', () => {
    const r = evaluate(withPurposes('service-delivery'), use('train-base-model'));
    expect(r.verdict).toBe('not-authorised');
    expect(r.basis).toEqual(['s6_1']);
    expect(r.reason).toContain('limited to such personal data');
  });

  it('authorises training once model-improvement is a specified purpose', () => {
    const r = evaluate(withPurposes('service-delivery', 'model-improvement'), use('train-base-model'));
    expect(r.verdict).toBe('authorised');
  });

  it('treats the other product as a separate purpose, not an extension of this one', () => {
    const wide = withPurposes('service-delivery', 'safety-review', 'model-improvement', 'advertising');
    expect(evaluate(wide, use('seed-other-product')).verdict).toBe('not-authorised');
    const withCross = togglePurpose(wide, 'cross-product-personalisation');
    expect(evaluate(withCross, use('seed-other-product')).verdict).toBe('authorised');
  });

  it('returns unsettled where the Act does not settle it, and says what the question is', () => {
    const r = evaluate(withPurposes('service-delivery'), use('index-embeddings'));
    expect(r.verdict).toBe('unsettled');
    expect(r.openQuestion).toContain('identifiab');
    expect(r.basis).toContain('s2t');
  });

  it('does not reach the unsettled question when the purpose was never specified', () => {
    // Order matters: purpose limitation is decided before identifiability.
    const r = evaluate(withPurposes('advertising'), use('index-embeddings'));
    expect(r.verdict).toBe('not-authorised');
    expect(r.openQuestion).toBeUndefined();
  });

  it('section 9(3) blocks ads for a child even with advertising specified', () => {
    const r = evaluate({ ...withPurposes('advertising'), principalIsChild: true }, use('select-ads'));
    expect(r.verdict).toBe('not-authorised');
    expect(r.basis).toEqual(['s9_3']);
  });

  it('section 9(3) bites before withdrawal is even considered', () => {
    const r = evaluate(
      { ...withPurposes('advertising'), principalIsChild: true, withdrawn: true },
      use('select-ads'),
    );
    expect(r.basis).toEqual(['s9_3']);
  });

  it('a child can still be served the assistant', () => {
    const r = evaluate({ ...withPurposes('service-delivery'), principalIsChild: true }, use('serve-answer'));
    expect(r.verdict).toBe('authorised');
  });

  it('withdrawal refuses everything that is consent-based, whatever was specified', () => {
    const everything = withPurposes(
      'service-delivery',
      'safety-review',
      'model-improvement',
      'cross-product-personalisation',
      'advertising',
    );
    const rows = ledger({ ...everything, withdrawn: true }, USES);
    expect(rows.every((r) => r.ruling.verdict === 'not-authorised')).toBe(true);
    for (const r of rows) expect(r.ruling.basis).toContain('s6_6');
  });

  it('withdrawal cites cease, not erase — those are different duties', () => {
    const r = evaluate({ ...base, withdrawn: true }, use('retain-transcript'));
    expect(r.basis).toContain('s6_6');
    expect(r.basis).not.toContain('s8_7');
  });

  it('the default record authorises two of nine stages', () => {
    const counts = countBy(ledger(base, USES));
    expect(counts.authorised).toBe(2);
    expect(counts.unsettled).toBe(2);
    expect(counts['not-authorised']).toBe(5);
    expect(counts.authorised + counts.unsettled + counts['not-authorised']).toBe(USES.length);
  });

  it('consenting to everything still leaves the unsettled rows unsettled', () => {
    const everything = withPurposes(
      'service-delivery',
      'safety-review',
      'model-improvement',
      'cross-product-personalisation',
      'advertising',
    );
    const counts = countBy(ledger(everything, USES));
    expect(counts['not-authorised']).toBe(0);
    expect(counts.unsettled).toBe(2);
  });

  it('every use is reachable as authorised by some record', () => {
    for (const u of USES) {
      const r = evaluate(withPurposes(u.requires), u);
      expect(['authorised', 'unsettled'], u.id).toContain(r.verdict);
    }
  });

  it('every ruling gives a reason and at least one provision', () => {
    for (const u of USES) {
      for (const rec of [base, { ...base, withdrawn: true }, { ...base, principalIsChild: true }]) {
        const r = evaluate(rec, u);
        expect(r.reason.length, u.id).toBeGreaterThan(20);
        expect(r.basis.length, u.id).toBeGreaterThan(0);
      }
    }
  });
});
