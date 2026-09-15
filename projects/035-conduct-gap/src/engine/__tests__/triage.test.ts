import { describe, expect, it } from 'vitest';
import { CLAUSES } from '../corpus';
import { EVIDENCE_SOURCES } from '../evidence';
import { PRESETS } from '../presets';
import { marginalGain, movedClauses, triage } from '../triage';
import type { EvidenceSourceId, ScopeId, TriageResult } from '../types';

const held = (...ids: EvidenceSourceId[]) => new Set(ids);
const preset = (id: string) => PRESETS.find((p) => p.id === id)!;
const run = (id: string): TriageResult => {
  const p = preset(id);
  return triage(new Set(p.held), p.scope);
};
const checkable = (t: TriageResult) => t.counts['checkable'] + t.counts['checkable-configurable'];
const verdictOf = (t: TriageResult, id: string) => t.results.find((r) => r.clause.id === id)!.verdict;

describe('triage mechanics', () => {
  it('returns one result per clause and counts that sum to the corpus', () => {
    const t = run('platform');
    expect(t.results).toHaveLength(CLAUSES.length);
    expect(Object.values(t.counts).reduce((a, b) => a + b, 0)).toBe(CLAUSES.length);
    expect(t.total).toBe(CLAUSES.length);
  });

  it('never loses ground when access is added', () => {
    const ids = EVIDENCE_SOURCES.map((s) => s.id);
    let current = new Set<EvidenceSourceId>();
    let previous = checkable(triage(current, 'mai-operator'));
    for (const id of ids) {
      current = new Set([...current, id]);
      const now = checkable(triage(current, 'mai-operator'));
      expect(now, `adding ${id} reduced the checkable count`).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });

  it('does not depend on the order access was acquired in', () => {
    const a = triage(held('traces', 'endpoint', 'redteam'), 'mai-operator');
    const b = triage(held('redteam', 'traces', 'endpoint'), 'mai-operator');
    expect(a.counts).toEqual(b.counts);
  });
});

describe('scope', () => {
  it('detaches every clause from a model the document does not govern', () => {
    const t = run('foundry');
    expect(t.counts['out-of-scope']).toBe(CLAUSES.length);
    expect(t.inScope).toBe(0);
    // A capable team with a harness, a red team and traces — and nothing to apply.
    expect(checkable(t)).toBe(0);
  });

  it('refuses to guess the share on a mixed surface, and says so', () => {
    const mixed = triage(held('endpoint', 'config'), 'mixed-surface');
    const direct = triage(held('endpoint', 'config'), 'mai-direct');
    expect(mixed.scopeCaveat).toBeTruthy();
    expect(direct.scopeCaveat).toBeUndefined();
    // Counts are identical: the uncertainty is carried in words, not invented
    // as a number.
    expect(mixed.counts).toEqual(direct.counts);
  });
});

describe('what the findings are', () => {
  it('leaves an enterprise tenant no better off than a reader with a chat window', () => {
    // The tenant holds a system prompt and a vendor system card on top of the
    // reader's endpoint. Neither settles a single clause.
    expect(run('tenant').counts).toEqual(run('reader').counts);
    expect(checkable(run('reader'))).toBe(7);
  });

  it('makes nearly half of what a reader can check a default the operator may change', () => {
    const t = run('reader');
    const yes = t.results.filter((r) => r.verdict.startsWith('checkable'));
    expect(yes).toHaveLength(7);
    expect(yes.filter((r) => r.clause.part === 4)).toHaveLength(3);
    expect(yes.filter((r) => r.verdict === 'checkable-configurable')).toHaveLength(3);
  });

  it('settles no clause at all by reading your own configuration', () => {
    // Every clause is about the model. Your config is the input to a test, not
    // evidence about the answer.
    expect(CLAUSES.filter((c) => c.requires === 'deployment-config')).toHaveLength(0);
    expect(marginalGain(held('endpoint', 'traces', 'redteam'), 'config', 'mai-operator')).toBe(0);
  });

  it('settles no clause by buying an attestation, from any starting position', () => {
    for (const p of PRESETS) {
      const without = new Set(p.held.filter((h) => h !== 'attestation'));
      expect(marginalGain(without, 'attestation', p.scope), p.id).toBe(0);
    }
  });

  it('moves exactly one clause when raw chain of thought arrives, and not the ones about it', () => {
    const base = held('endpoint', 'redteam', 'traces', 'config');
    const withCot = new Set<EvidenceSourceId>([...base, 'cot']);
    expect(movedClauses(base, withCot, 'mai-operator')).toEqual(['c23']);

    // c22 forbids tampering with the chain of thought; c26 forbids concealing
    // behaviour under evaluation. Holding the reasoning you were handed settles
    // neither, because both are claims about the reasoning you were not.
    const t = triage(withCot, 'mai-operator');
    expect(verdictOf(t, 'c22')).toBe('needs-access');
    expect(verdictOf(t, 'c26')).toBe('needs-access');
    expect(verdictOf(t, 'c23')).toBe('checkable');
  });

  it('puts eight clauses beyond everything a customer can buy', () => {
    const t = run('ceiling');
    const stuck = t.results.filter((r) => r.verdict === 'needs-access');
    expect(stuck.map((r) => r.clause.id)).toEqual([
      'c11', 'c17', 'c20', 'c22', 'c23', 'c26', 'c28', 'c31',
    ]);
    // Every one of them waits on the same access, which no contract sells.
    for (const r of stuck) expect(r.unlockedBy, r.clause.id).toContain('evaluator');
  });

  it('splits two consecutive sentences about deception across the line', () => {
    // 3.3 forbids active deception, then passive deception, one after the
    // other. A chat window settles the first and can never settle the second.
    const t = run('reader');
    expect(verdictOf(t, 'c30')).toBe('checkable');
    expect(verdictOf(t, 'c31')).toBe('needs-access');
    expect(triage(new Set(preset('ceiling').held), 'mai-operator').results
      .find((r) => r.clause.id === 'c31')!.verdict).toBe('needs-access');
  });

  it('turns the shutdown commitment on a log you may not have', () => {
    // The headline promise of the document is testable, and only by whoever
    // runs the harness.
    expect(verdictOf(run('reader'), 'c15')).toBe('needs-access');
    expect(verdictOf(run('platform'), 'c15')).toBe('checkable');
  });

  it('leaves exactly two clauses that no access setting can reach', () => {
    for (const id of ['reader', 'platform', 'ceiling', 'evaluator']) {
      const t = run(id);
      expect(t.counts['unfalsifiable'], id).toBe(2);
      expect(t.results.filter((r) => r.verdict === 'unfalsifiable').map((r) => r.clause.id), id)
        .toEqual(['c01', 'c03']);
    }
  });

  it('reaches every remaining clause only with independent-evaluator access', () => {
    const t = run('evaluator');
    expect(t.counts['needs-access']).toBe(0);
    expect(checkable(t)).toBe(CLAUSES.length - 2);
  });
});

describe('presets', () => {
  it('names a scope that exists and access that exists', () => {
    const sourceIds = new Set(EVIDENCE_SOURCES.map((s) => s.id));
    const scopeIds: ScopeId[] = ['mai-direct', 'mai-operator', 'mai-subagent', 'third-party-hosted', 'mixed-surface'];
    for (const p of PRESETS) {
      expect(scopeIds).toContain(p.scope);
      for (const h of p.held) expect(sourceIds.has(h), `${p.id}:${h}`).toBe(true);
    }
  });

  it('orders the customer-side presets by how much they settle', () => {
    expect(checkable(run('reader'))).toBeLessThan(checkable(run('platform')));
    expect(checkable(run('platform'))).toBeLessThan(checkable(run('ceiling')));
    expect(checkable(run('ceiling'))).toBeLessThan(checkable(run('evaluator')));
  });
});
