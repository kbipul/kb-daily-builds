import { describe, it, expect } from 'vitest';
import { classify } from './classify';
import { CASE_STUDIES } from '../data/framework';

describe('classify: the published decision rule', () => {
  it('resolves a complete investigation to Ready for Disclosure', () => {
    expect(classify({ investigationComplete: true, complexOrThirdParty: false }).track).toBe('ready');
  });

  it('resolves an incomplete, complex/third-party case to the Slow Track', () => {
    expect(classify({ investigationComplete: false, complexOrThirdParty: true }).track).toBe('slow');
  });

  it('resolves an incomplete, simple case to Minor Investigation', () => {
    expect(classify({ investigationComplete: false, complexOrThirdParty: false }).track).toBe('minor');
  });

  it('completeness always wins, even when a case is also complex', () => {
    expect(classify({ investigationComplete: true, complexOrThirdParty: true }).track).toBe('ready');
  });
});

describe('golden test: OpenAI’s own six incidents', () => {
  it('lists exactly six disclosed case studies', () => {
    expect(CASE_STUDIES).toHaveLength(6);
  });

  it('every one of the six, modeled as a completed investigation, reproduces OpenAI’s actual "Ready for Disclosure" outcome', () => {
    for (const cs of CASE_STUDIES) {
      const result = classify({ investigationComplete: true, complexOrThirdParty: false });
      expect(result.track).toBe(cs.track);
      expect(cs.track).toBe('ready');
    }
  });

  it('every case study cites a source', () => {
    for (const cs of CASE_STUDIES) {
      expect(cs.quote.length).toBeGreaterThan(10);
    }
  });
});
