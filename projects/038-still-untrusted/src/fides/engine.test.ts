import { describe, expect, it } from 'vitest';
import { combineLabels, confidentialityExceeds, DEFAULT_LABEL } from './labels';
import { simulate } from './engine';
import { SCENARIOS } from './scenarios';

describe('combineLabels — the combining rule', () => {
  it('defaults to trusted/public with no inputs', () => {
    expect(combineLabels()).toEqual(DEFAULT_LABEL);
  });

  it('untrusted wins over trusted on the integrity axis', () => {
    const result = combineLabels(
      { integrity: 'trusted', confidentiality: 'public' },
      { integrity: 'untrusted', confidentiality: 'public' },
    );
    expect(result.integrity).toBe('untrusted');
  });

  it('trusted stays trusted only when every input is trusted', () => {
    const result = combineLabels(
      { integrity: 'trusted', confidentiality: 'public' },
      { integrity: 'trusted', confidentiality: 'private' },
    );
    expect(result.integrity).toBe('trusted');
  });

  it('confidentiality ranks user_identity > private > public', () => {
    expect(
      combineLabels({ integrity: 'trusted', confidentiality: 'public' }, { integrity: 'trusted', confidentiality: 'private' })
        .confidentiality,
    ).toBe('private');
    expect(
      combineLabels(
        { integrity: 'trusted', confidentiality: 'private' },
        { integrity: 'trusted', confidentiality: 'user_identity' },
      ).confidentiality,
    ).toBe('user_identity');
  });
});

describe('confidentialityExceeds', () => {
  it('reports true only when the label ranks strictly above the cap', () => {
    expect(confidentialityExceeds('private', 'public')).toBe(true);
    expect(confidentialityExceeds('public', 'public')).toBe(false);
    expect(confidentialityExceeds('public', 'user_identity')).toBe(false);
  });
});

// Golden test: reproduces the exact walkthrough from Microsoft's
// "Agent Security with FIDES" page, step by step, and asserts this
// project's engine reaches the same decisions and labels the docs describe
// in prose. If combineLabels() or the policy checks in engine.ts drift from
// what the page says, this test is the one that catches it.
describe('golden: the triage agent walkthrough matches the docs', () => {
  const scenario = SCENARIOS.find((s) => s.id === 'triage-agent')!;
  const trace = simulate(scenario.tools, scenario.steps);

  it('step 1: read_issue labels the result untrusted/public', () => {
    expect(trace[0].contextAfter).toEqual({ integrity: 'untrusted', confidentiality: 'public' });
    expect(trace[0].decision).toBe('ran');
  });

  it('step 2: read_file always runs (source tools are never blocked), result is trusted/private, context becomes untrusted/private', () => {
    expect(trace[1].decision).toBe('ran');
    expect(trace[1].contextAfter).toEqual({ integrity: 'untrusted', confidentiality: 'private' });
  });

  it('step 3: post_comment is refused on confidentiality — "context is private, sink only accepts public"', () => {
    expect(trace[2].decision).toBe('blocked-confidentiality');
  });

  it('step 4: write_file is refused on integrity — "untrusted content is in scope and the sink declined to accept it"', () => {
    expect(trace[3].decision).toBe('blocked-integrity');
  });

  it('the doc’s point holds: one policy fence catches both the injection (integrity) and the exfiltration (confidentiality) attempt', () => {
    const reasons = trace.slice(2).map((t) => t.decision);
    expect(reasons).toContain('blocked-confidentiality');
    expect(reasons).toContain('blocked-integrity');
  });
});

describe('the still-untrusted scenario: taint does not decay on its own', () => {
  const scenario = SCENARIOS.find((s) => s.id === 'still-untrusted')!;

  it('two unrelated trusted reads in between do not clear the untrusted flag set at step 1', () => {
    const trace = simulate(scenario.tools, scenario.steps);
    expect(trace[0].contextAfter.integrity).toBe('untrusted');
    expect(trace[1].contextAfter.integrity).toBe('untrusted'); // read_config is trusted but combines, doesn't replace
    expect(trace[3].contextAfter.integrity).toBe('untrusted');
  });

  it('step 5 (an unrelated privileged write) is blocked purely by step 1’s taint, four steps later', () => {
    const trace = simulate(scenario.tools, scenario.steps);
    expect(trace[4].decision).toBe('blocked-integrity');
  });

  it('the hypothetical drop toggle, applied right after step 1, lets step 5 through', () => {
    const trace = simulate(scenario.tools, scenario.steps, { dropAfterStepId: scenario.dropToggleAfterStepId });
    expect(trace[4].decision).toBe('ran');
  });
});

describe('simulate: general engine behavior', () => {
  it('throws on an unknown tool name rather than silently skipping the step', () => {
    expect(() => simulate([], [{ id: 'x', tool: 'nope', narrative: 'n/a' }])).toThrow('Unknown tool: nope');
  });

  it('a sink with neither acceptsUntrusted nor maxAllowedConfidentiality declared is never blocked', () => {
    const trace = simulate(
      [
        { name: 'src', kind: 'source', description: 'd' },
        { name: 'open_sink', kind: 'sink', description: 'd' },
      ],
      [
        { id: '1', tool: 'src', resultLabel: { integrity: 'untrusted', confidentiality: 'user_identity' }, narrative: 'n' },
        { id: '2', tool: 'open_sink', narrative: 'n' },
      ],
    );
    expect(trace[1].decision).toBe('ran');
  });
});
