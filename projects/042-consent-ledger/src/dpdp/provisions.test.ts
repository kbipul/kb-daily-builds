import { describe, expect, it } from 'vitest';
import { ALL_PROVISIONS, PROVISIONS, provision } from './provisions';

describe('provisions', () => {
  it('every entry carries a citation, text, commencement and source', () => {
    for (const p of ALL_PROVISIONS) {
      expect(p.cite.length, p.id).toBeGreaterThan(0);
      expect(p.text.length, p.id).toBeGreaterThan(0);
      expect(p.source.length, p.id).toBeGreaterThan(0);
      expect(p.commencement, p.id).toMatch(/^(in-force|computed-)/);
    }
  });

  it('ids are self-consistent with the record keys', () => {
    for (const [key, p] of Object.entries(PROVISIONS)) {
      expect(p.id).toBe(key);
    }
  });

  it('quotes section 6(1) with the limitation clause intact', () => {
    expect(provision('s6_1').text).toContain(
      'limited to such personal data as is necessary for such specified purpose',
    );
  });

  it('quotes section 8(7) with both limbs, including the processor limb', () => {
    const text = provision('s8_7').text;
    expect(text).toContain('(a) erase personal data, upon the Data Principal withdrawing her consent');
    expect(text).toContain('(b) cause its Data Processor to erase');
  });

  it('keeps section 6(6) as cease, not erase', () => {
    expect(provision('s6_6').text).toContain('cease and cause its Data Processors to cease processing');
    expect(provision('s6_6').text).not.toContain('erase');
  });

  it('keeps the withdrawal consequences clause that people skip', () => {
    expect(provision('s6_5').text).toContain(
      'shall not affect the legality of processing of the personal data based on consent before its withdrawal',
    );
  });

  it('reproduces the missing space in the commencement notification as printed', () => {
    expect(provision('gsr843_c').text).toContain('section 6,sections 7 to 10');
  });

  it('section 9(3) is an unconditional prohibition, with no consent carve-out in the text', () => {
    const text = provision('s9_3').text;
    expect(text).toContain('shall not undertake tracking or behavioural monitoring of children');
    expect(text.toLowerCase()).not.toContain('unless');
    expect(text.toLowerCase()).not.toContain('consent');
  });

  it('no quoted provision mentions AI, models, training or algorithms', () => {
    // The whole point of the app: the duties an Indian AI team is about to be
    // held to are written about "personal data" and "purpose", not about ML.
    // If a future edit paraphrases a provision into ML vocabulary, this fails.
    for (const p of ALL_PROVISIONS) {
      expect(p.text, p.id).not.toMatch(/artificial intelligence|machine learning|\bmodel\b|\btraining\b|algorithm/i);
    }
  });

  it('only the commencement notification is already in force', () => {
    const inForce = ALL_PROVISIONS.filter((p) => p.commencement === 'in-force').map((p) => p.id);
    expect(inForce.sort()).toEqual(['gsr843_b', 'gsr843_c', 's2t']);
  });

  it('every consent and erasure duty sits in the eighteen-month group', () => {
    for (const id of ['s6_1', 's6_4', 's6_5', 's6_6', 's8_7', 's9_3'] as const) {
      expect(provision(id).commencement, id).toBe('computed-2027-05-13');
    }
  });
});
