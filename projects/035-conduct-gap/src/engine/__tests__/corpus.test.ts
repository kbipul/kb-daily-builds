import { describe, expect, it } from 'vitest';
import { CLAUSES, SCOPES, SELF_DESCRIPTION } from '../corpus';
import type { EvidenceClass } from '../types';

describe('corpus integrity', () => {
  it('has unique ids in document order', () => {
    const ids = CLAUSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
  });

  it('carries verbatim text for every clause, never a summary', () => {
    for (const c of CLAUSES) {
      expect(c.text.length, c.id).toBeGreaterThan(40);
      // Every quote is a sentence from the document, so it ends like one.
      expect(c.text.trim(), c.id).toMatch(/[.…]$/);
      expect(c.observable.length, c.id).toBeGreaterThan(20);
    }
  });

  it('never publishes a probe for a clause whose probe is withheld', () => {
    for (const c of CLAUSES) {
      if (c.probeWithheld) expect(c.probe, c.id).toBeUndefined();
    }
  });

  it('withholds the procedure for the CBRNE, cyber and child-safety constraints', () => {
    for (const id of ['c09', 'c10', 'c13']) {
      const c = CLAUSES.find((x) => x.id === id)!;
      expect(c.probeWithheld, id).toBeTruthy();
      expect(c.probe, id).toBeUndefined();
    }
  });

  it('gives every clause a probe, a withheld reason, or an unreachable requirement', () => {
    const reachableByTesting: EvidenceClass[] = ['output-inspection', 'black-box-probe', 'action-trace'];
    for (const c of CLAUSES) {
      if (!reachableByTesting.includes(c.requires)) continue;
      expect(Boolean(c.probe || c.probeWithheld), `${c.id} is testable but offers no procedure`).toBe(true);
    }
  });

  it('places every clause in a part the document actually has', () => {
    for (const c of CLAUSES) {
      expect(c.part, c.id).toBeGreaterThanOrEqual(1);
      expect(c.part, c.id).toBeLessThanOrEqual(5);
      expect(c.section.startsWith(String(c.part)), `${c.id} section ${c.section}`).toBe(true);
    }
  });

  it('marks every Part 4 clause as changeable by system instruction, and no other', () => {
    // Section 4.3: system instructions "cannot amend Objectives or the core
    // commitments of Parts 2 and 3 but they may change defaults described in
    // this Part."
    for (const c of CLAUSES) {
      if (c.part === 4) expect(c.changeable, c.id).toBe('system-instruction');
      else expect(c.changeable, c.id).not.toBe('system-instruction');
    }
  });

  it('keeps the self-description separate from the scored clauses', () => {
    const clauseText = new Set(CLAUSES.map((c) => c.text));
    for (const s of SELF_DESCRIPTION) expect(clauseText.has(s.text)).toBe(false);
    expect(SELF_DESCRIPTION.length).toBeGreaterThanOrEqual(5);
  });

  it('gives every scope a verbatim basis and a named source', () => {
    for (const s of SCOPES) {
      expect(s.basis.length, s.id).toBeGreaterThan(30);
      expect(s.basisSource.length, s.id).toBeGreaterThan(3);
    }
    expect(SCOPES.filter((s) => s.coverage === 'none')).toHaveLength(1);
    expect(SCOPES.filter((s) => s.coverage === 'partial')).toHaveLength(1);
  });
});
