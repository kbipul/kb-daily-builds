import { CLAUSES, SCOPES } from './corpus';
import { grantedClasses, isUnreachable, sourcesGranting } from './evidence';
import type {
  Clause,
  ClauseResult,
  EvidenceSourceId,
  Scope,
  ScopeId,
  TriageResult,
  Verdict,
} from './types';

export const ALL_VERDICTS: Verdict[] = [
  'checkable',
  'checkable-configurable',
  'needs-access',
  'unfalsifiable',
  'out-of-scope',
];

export function scopeById(id: ScopeId): Scope {
  const found = SCOPES.find((s) => s.id === id);
  if (!found) throw new Error(`unknown scope: ${id}`);
  return found;
}

/**
 * A clause is out of scope when the surface is served by models the document
 * says it does not govern. `partial` surfaces are NOT marked out of scope —
 * the document attaches to an unknown share of requests, and pretending to
 * know the share would be the dishonest move. The UI carries the uncertainty
 * instead.
 */
function outOfScope(scope: Scope): boolean {
  return scope.coverage === 'none';
}

function verdictFor(clause: Clause, held: ReadonlySet<EvidenceSourceId>, scope: Scope): ClauseResult {
  if (outOfScope(scope)) {
    return {
      clause,
      verdict: 'out-of-scope',
      unlockedBy: [],
      reason: `The Code of Conduct does not govern this surface: "${scope.basis}"`,
    };
  }

  const granted = grantedClasses(held);
  const need = clause.requires;

  if (granted.has(need)) {
    const configurable = clause.changeable === 'system-instruction';
    return {
      clause,
      verdict: configurable ? 'checkable-configurable' : 'checkable',
      unlockedBy: [],
      reason: configurable
        ? 'Your evidence would show a violation, but this clause is a Part 4 default, which the document says a system instruction may change.'
        : 'Your evidence would show a violation.',
    };
  }

  if (isUnreachable(need)) {
    return {
      clause,
      verdict: 'unfalsifiable',
      unlockedBy: [],
      reason:
        need === 'none-defined'
          ? 'The clause states no behavioural observable, so no access setting changes the answer.'
          : 'No access in the catalogue reaches this class of evidence.',
    };
  }

  return {
    clause,
    verdict: 'needs-access',
    unlockedBy: sourcesGranting(need),
    reason: 'Reachable, with access you do not currently hold.',
  };
}

export function triage(held: ReadonlySet<EvidenceSourceId>, scopeId: ScopeId): TriageResult {
  const scope = scopeById(scopeId);
  const results = CLAUSES.map((c) => verdictFor(c, held, scope));

  const counts = Object.fromEntries(ALL_VERDICTS.map((v) => [v, 0])) as Record<Verdict, number>;
  for (const r of results) counts[r.verdict] += 1;

  return {
    results,
    counts,
    inScope: results.length - counts['out-of-scope'],
    total: results.length,
    scopeCaveat:
      scope.coverage === 'partial'
        ? 'These counts assume the clause applies. On this surface it applies to an unknown share of requests, and which model family served a given request is not disclosed per request.'
        : undefined,
  };
}

/**
 * What one extra access would buy, as a count of clauses moving into either
 * checkable state. Used by the UI to label each unheld toggle, and the reason
 * the `attestation` entry is worth shipping: it always returns 0.
 */
export function marginalGain(
  held: ReadonlySet<EvidenceSourceId>,
  add: EvidenceSourceId,
  scopeId: ScopeId,
): number {
  if (held.has(add)) return 0;
  const before = triage(held, scopeId);
  const after = triage(new Set([...held, add]), scopeId);
  const checkable = (t: TriageResult) => t.counts['checkable'] + t.counts['checkable-configurable'];
  return checkable(after) - checkable(before);
}

/** Clause ids whose verdict differs between two held sets. */
export function movedClauses(
  a: ReadonlySet<EvidenceSourceId>,
  b: ReadonlySet<EvidenceSourceId>,
  scopeId: ScopeId,
): string[] {
  const ra = triage(a, scopeId).results;
  const rb = triage(b, scopeId).results;
  const out: string[] = [];
  for (let i = 0; i < ra.length; i += 1) {
    if (ra[i].verdict !== rb[i].verdict) out.push(ra[i].clause.id);
  }
  return out;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  checkable: 'You could catch it',
  'checkable-configurable': 'You could catch it, but it is a changeable default',
  'needs-access': 'Needs access you do not hold',
  unfalsifiable: 'Nothing here can falsify it',
  'out-of-scope': 'Does not apply to this surface',
};

export const VERDICT_ORDER: Record<Verdict, number> = {
  checkable: 0,
  'checkable-configurable': 1,
  'needs-access': 2,
  unfalsifiable: 3,
  'out-of-scope': 4,
};
