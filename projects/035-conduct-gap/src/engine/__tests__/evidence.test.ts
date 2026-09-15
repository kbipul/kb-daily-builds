import { describe, expect, it } from 'vitest';
import { EVIDENCE_SOURCES, grantedClasses, isUnreachable, sourcesGranting } from '../evidence';
import { CLAUSES } from '../corpus';
import type { EvidenceClass, EvidenceSourceId } from '../types';

const all = (ids: EvidenceSourceId[]) => new Set(ids);

describe('evidence catalogue', () => {
  it('grants nothing for a vendor attestation', () => {
    // The vendor's account of its own conduct is the claim under test.
    expect(EVIDENCE_SOURCES.find((s) => s.id === 'attestation')!.grants).toEqual([]);
    expect(grantedClasses(all(['attestation'])).size).toBe(0);
  });

  it('gives a red-team budget nothing without an endpoint to point it at', () => {
    expect(grantedClasses(all(['redteam'])).size).toBe(0);
    expect(grantedClasses(all(['redteam', 'endpoint'])).has('black-box-probe')).toBe(true);
  });

  it('reaches the counterfactual class from exactly one entry', () => {
    expect(sourcesGranting('counterfactual')).toEqual(['evaluator']);
  });

  it('separates the model’s own internals from the vendor’s records', () => {
    // Raw reasoning is an artefact the model produced. Review files are the
    // vendor's. Collapsing them made chain-of-thought access appear to settle
    // a clause about the red-teaming programme.
    expect(sourcesGranting('model-internals')).toEqual(['cot', 'evaluator']);
    expect(sourcesGranting('vendor-records')).toEqual(['evaluator']);
  });

  it('treats a clause with no stated observable as reachable by nothing', () => {
    expect(isUnreachable('none-defined')).toBe(true);
  });

  it('is order-independent and idempotent over the held set', () => {
    const a = grantedClasses(all(['endpoint', 'traces', 'redteam']));
    const b = grantedClasses(all(['redteam', 'endpoint', 'traces', 'endpoint']));
    expect([...a].sort()).toEqual([...b].sort());
  });

  it('never grants a class no clause in the corpus asks for, except one', () => {
    // deployment-config is granted and never required: nothing in the document
    // is settled by reading your own configuration. See the triage test that
    // pins this.
    const required = new Set<EvidenceClass>(CLAUSES.map((c) => c.requires));
    const grantedAnywhere = new Set<EvidenceClass>(EVIDENCE_SOURCES.flatMap((s) => s.grants));
    const orphans = [...grantedAnywhere].filter((c) => !required.has(c));
    expect(orphans).toEqual(['deployment-config']);
  });
});
