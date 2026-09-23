import { FALSE_LEADS, GROUND_TRUTH, PATHS, type Path, type Vuln } from './repo';
import { rng, sample } from './rng';

/**
 * The three verdicts the Cloudflare security-audit-skill writes to findings.json,
 * with the criteria its docs state: `confirmed` has a complete source trace and a
 * bounded observed result, `needs_validation` has an exact unresolved fact and no
 * severity, `rejected` records a disproved candidate.
 */
export type Verdict = 'confirmed' | 'needs_validation' | 'rejected';

export type Finding = {
  id: string;
  path: Path;
  cls: string;
  verdict: Verdict;
  /** True once a verifying agent that did not find it has re-checked its claims. */
  verified: boolean;
  /** Which run produced it. */
  run: number;
  /** Set when a later run would have re-found it but skipped it instead. */
  skippedLater?: boolean;
};

export type Run = {
  n: number;
  /** Paths this run explored. The rest were never read. */
  explored: Path[];
  /** Paths this run skipped because a prior findings.json already named them. */
  skipped: Path[];
  found: Finding[];
};

export type AuditState = {
  runs: Run[];
  findings: Finding[];
  /** Ground truth, carrying any fixes the user applied. */
  truth: Vuln[];
};

export const PATHS_PER_RUN = 4;

export function initialState(): AuditState {
  return { runs: [], findings: [], truth: GROUND_TRUTH.map((v) => ({ ...v })) };
}

/**
 * One audit run.
 *
 * Phase 1 recon + phase 2 hunting: explore a subset of paths. Per the skill's
 * documented behaviour, runs are additive because "each run explores different
 * code paths" and it "reads prior findings.json files to skip known issues and
 * target gaps" — so a path already carrying a finding is deprioritised.
 *
 * Phase 3 validation assigns a verdict. Phase 6 independent verification is a
 * separate agent pass that re-checks each claim against source; it can reject a
 * finding, and it cannot raise one.
 */
export function runAudit(state: AuditState, seed: number): AuditState {
  const n = state.runs.length + 1;
  const next = rng(seed + n * 7919);

  const known = new Set(state.findings.filter((f) => f.verdict !== 'rejected').map((f) => f.path));
  const gaps = PATHS.filter((p) => !known.has(p));
  const explored = sample(gaps.length >= PATHS_PER_RUN ? gaps : PATHS, PATHS_PER_RUN, next).sort();
  const skipped = PATHS.filter((p) => known.has(p) && !explored.includes(p));

  const found: Finding[] = [];

  for (const path of explored) {
    // Hunting reaches a real vulnerability on this path only if it is still
    // present. A fixed one leaves nothing to find.
    const real = state.truth.find((v) => v.path === path && !v.fixed);
    if (real && next() < 0.85) {
      found.push({
        id: real.id,
        path,
        cls: real.cls,
        verdict: real.exploitable ? 'confirmed' : 'needs_validation',
        verified: true,
        run: n,
      });
    }
    // Hunting also raises candidates that do not hold up. Independent
    // verification is exactly what catches these.
    const lead = FALSE_LEADS.find((f) => f.path === path);
    if (lead && next() < 0.5) {
      found.push({ id: lead.id, path, cls: lead.cls, verdict: 'rejected', verified: true, run: n });
    }
  }

  // A path this run skipped that still holds a live vulnerability is where a
  // regression hides: the report already names it, so the hunter never returns.
  const findings = state.findings.map((f) => ({
    ...f,
    skippedLater:
      f.skippedLater ||
      (skipped.includes(f.path) && f.verdict !== 'rejected' && state.truth.some((v) => v.id === f.id && !v.fixed)),
  }));

  return {
    ...state,
    runs: [...state.runs, { n, explored, skipped, found }],
    findings: [...findings, ...found],
  };
}

/** Fix a vulnerability: it is no longer in the repo. */
export function fix(state: AuditState, id: string): AuditState {
  return { ...state, truth: state.truth.map((v) => (v.id === id ? { ...v, fixed: true } : v)) };
}

/** Reintroduce it. The report still carries the finding from before the fix. */
export function regress(state: AuditState, id: string): AuditState {
  return { ...state, truth: state.truth.map((v) => (v.id === id ? { ...v, fixed: false } : v)) };
}

export type Summary = {
  confirmed: number;
  needsValidation: number;
  rejected: number;
  /** Real, live vulnerabilities the report names. */
  trueFound: number;
  /** Real, live vulnerabilities in the repo. */
  trueTotal: number;
  /** Paths never read by any run. */
  unexplored: Path[];
  /** Live vulnerabilities on paths a later run skipped because a finding existed. */
  shielded: Vuln[];
};

export function summarise(state: AuditState): Summary {
  const live = state.truth.filter((v) => !v.fixed);
  const reported = new Set(state.findings.filter((f) => f.verdict !== 'rejected').map((f) => f.id));
  const everExplored = new Set(state.runs.flatMap((r) => r.explored));
  const lastSkipped = new Set(state.runs.length ? state.runs[state.runs.length - 1].skipped : []);

  return {
    confirmed: state.findings.filter((f) => f.verdict === 'confirmed').length,
    needsValidation: state.findings.filter((f) => f.verdict === 'needs_validation').length,
    rejected: state.findings.filter((f) => f.verdict === 'rejected').length,
    trueFound: live.filter((v) => reported.has(v.id)).length,
    trueTotal: live.length,
    unexplored: PATHS.filter((p) => !everExplored.has(p)),
    shielded: live.filter((v) => lastSkipped.has(v.path) && reported.has(v.id)),
  };
}
