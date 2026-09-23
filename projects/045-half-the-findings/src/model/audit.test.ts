import { describe as group, it, expect } from 'vitest';
import { initialState, runAudit, summarise, fix, regress, PATHS_PER_RUN } from './audit';
import { GROUND_TRUTH, PATHS } from './repo';

function runs(n: number, seed = 42) {
  let s = initialState();
  for (let i = 0; i < n; i++) s = runAudit(s, seed);
  return s;
}

group('one run explores a subset', () => {
  it('reads exactly PATHS_PER_RUN paths, not the whole repo', () => {
    const s = runAudit(initialState(), 42);
    expect(s.runs[0].explored.length).toBe(PATHS_PER_RUN);
    expect(PATHS_PER_RUN).toBeLessThan(PATHS.length);
  });

  it('leaves the rest of the repo unread', () => {
    const s = runAudit(initialState(), 42);
    expect(summarise(s).unexplored.length).toBe(PATHS.length - PATHS_PER_RUN);
  });

  it('cannot report a vulnerability on a path it never read', () => {
    const s = runAudit(initialState(), 42);
    for (const f of s.findings) expect(s.runs[0].explored).toContain(f.path);
  });
});

group('runs are additive but never complete', () => {
  it('finds strictly more over successive runs than in the first', () => {
    const one = summarise(runs(1)).trueFound;
    const six = summarise(runs(6)).trueFound;
    expect(six).toBeGreaterThan(one);
  });

  it('targets gaps: a later run skips paths already carrying a finding', () => {
    const s = runs(3);
    const later = s.runs[2];
    for (const p of later.skipped) {
      expect(s.findings.some((f) => f.path === p && f.verdict !== 'rejected')).toBe(true);
    }
  });

  it('never reports more real vulnerabilities than the repo holds', () => {
    const sum = summarise(runs(10));
    expect(sum.trueFound).toBeLessThanOrEqual(sum.trueTotal);
  });
});

group('verdicts follow the documented criteria', () => {
  it('gives a non-exploitable vulnerability no confirmed verdict', () => {
    const nonExploitable = GROUND_TRUTH.filter((v) => !v.exploitable).map((v) => v.id);
    const s = runs(12);
    for (const f of s.findings.filter((x) => nonExploitable.includes(x.id))) {
      expect(f.verdict).toBe('needs_validation');
    }
  });

  it('marks every finding verified, including the rejected ones', () => {
    const s = runs(6);
    expect(s.findings.length).toBeGreaterThan(0);
    for (const f of s.findings) expect(f.verified).toBe(true);
  });

  it('rejects candidates that were never real', () => {
    const s = runs(12);
    const rejected = s.findings.filter((f) => f.verdict === 'rejected');
    for (const f of rejected) expect(GROUND_TRUTH.some((v) => v.id === f.id)).toBe(false);
  });
});

group('verification is a false-positive control', () => {
  it('rejects at least one false lead over enough runs, and never a real vulnerability', () => {
    const s = runs(14);
    const sum = summarise(s);
    expect(sum.rejected).toBeGreaterThan(0);
    const rejectedIds = s.findings.filter((f) => f.verdict === 'rejected').map((f) => f.id);
    for (const id of rejectedIds) expect(id.startsWith('F')).toBe(true);
  });

  it('leaves most of the repo unread after a single run', () => {
    const sum = summarise(runs(1));
    expect(sum.unexplored.length).toBe(PATHS.length - PATHS_PER_RUN);
    expect(sum.unexplored.length).toBeGreaterThan(PATHS_PER_RUN);
  });

  it('cannot raise a finding: every finding belongs to the run that hunted it', () => {
    const s = runs(4);
    for (const f of s.findings) {
      expect(s.runs[f.run - 1].explored).toContain(f.path);
    }
  });
});

group('fix, then regress', () => {
  it('stops finding a vulnerability once it is fixed', () => {
    let s = initialState();
    s = fix(s, 'V1');
    for (let i = 0; i < 12; i++) s = runAudit(s, 7);
    expect(s.findings.some((f) => f.id === 'V1')).toBe(false);
  });

  it('shields a regressed vulnerability behind the finding that already names it', () => {
    let s = initialState();
    // Run until V1's path is reported, then regress it and keep running.
    for (let i = 0; i < 8; i++) s = runAudit(s, 42);
    const reported = s.findings.find((f) => f.id === 'V1');
    expect(reported).toBeDefined();
    s = fix(s, 'V1');
    s = regress(s, 'V1');
    s = runAudit(s, 42);
    const last = s.runs[s.runs.length - 1];
    const stillReported = s.findings.some((f) => f.id === 'V1' && f.verdict !== 'rejected');
    expect(stillReported).toBe(true);
    expect(last.explored.includes('src/api/orders.ts') || last.skipped.includes('src/api/orders.ts')).toBe(true);
  });

  it('counts a fixed vulnerability out of the repo total', () => {
    const before = summarise(initialState()).trueTotal;
    const after = summarise(fix(initialState(), 'V1')).trueTotal;
    expect(after).toBe(before - 1);
  });
});

group('reproducibility', () => {
  it('gives the same explored set for the same seed', () => {
    expect(runAudit(initialState(), 99).runs[0].explored).toEqual(runAudit(initialState(), 99).runs[0].explored);
  });

  it('gives different explored sets for different seeds somewhere in six runs', () => {
    const a = runs(6, 1).runs.map((r) => r.explored.join(','));
    const b = runs(6, 2).runs.map((r) => r.explored.join(','));
    expect(a).not.toEqual(b);
  });
});
