import { describe, expect, it } from 'vitest';
import { detectAgent, detectLegacy, envVarsMatch, eraForVersion, isPrefixPattern } from '../detect';
import { SNAPSHOT_REGISTRY, STANDARD_AGENT_ENV_VARS } from '../registry';
import type { Registry } from '../types';

// The same fixture huggingface_hub uses in tests/test_utils_detect_agent.py,
// so every assertion here has a Python twin.
const FAKE: Registry = {
  standardEnvVars: ['AI_AGENT', 'AGENT'],
  harnesses: [
    { id: 'cowork', envVars: { CLAUDE_CODE_IS_COWORK: '*' } },
    { id: 'claude-code', envVars: { CLAUDECODE: '*', CLAUDE_CODE: '*' } },
    { id: 'exact-match', envVars: { SOME_VAR: 'expected-value' } },
    { id: 'prefix-only', envVars: { PREFIX_VAR: 'foo*' } },
    { id: 'devin' },
  ],
  source: 'test',
};

describe('detectAgent — parity with test_utils_detect_agent.py', () => {
  it('test_no_agent', () => {
    expect(detectAgent({}, FAKE).id).toBeNull();
  });
  it('test_wildcard_match', () => {
    expect(detectAgent({ CLAUDECODE: '1' }, FAKE).id).toBe('claude-code');
  });
  it('exact match requires the exact value', () => {
    expect(detectAgent({ SOME_VAR: 'expected-value' }, FAKE).id).toBe('exact-match');
    expect(detectAgent({ SOME_VAR: 'other' }, FAKE).id).toBeNull();
  });
  it('test_prefix_pattern_is_ignored — "intentionally not implemented yet"', () => {
    const r = detectAgent({ PREFIX_VAR: 'foobar' }, FAKE);
    expect(r.id).toBeNull();
    expect(r.ignoredPatterns).toEqual([{ id: 'prefix-only', variable: 'PREFIX_VAR', pattern: 'foo*' }]);
  });
  it('a prefix pattern still matches its literal text (value == pattern)', () => {
    expect(detectAgent({ PREFIX_VAR: 'foo*' }, FAKE).id).toBe('prefix-only');
  });
  it('test_standard_var_known_harness — devin only via AGENT', () => {
    expect(detectAgent({ AGENT: 'devin' }, FAKE).id).toBe('devin');
    expect(detectAgent({ AGENT: 'devin' }, FAKE).match?.kind).toBe('standardVar');
  });
  it('standard var with an unknown value → "unknown"', () => {
    const r = detectAgent({ AI_AGENT: 'build-bot' }, FAKE);
    expect(r.id).toBe('unknown');
    expect(r.match?.kind).toBe('standardUnknown');
  });
  it('standard var is case-sensitive in the loop, case-insensitive after it', () => {
    // "Devin" != "devin" inside the loop; lowercased afterwards it is a known id.
    expect(detectAgent({ AGENT: 'Devin' }, FAKE).id).toBe('devin');
  });
  it('cowork wins over claude-code when both are set (registry order)', () => {
    const r = detectAgent({ CLAUDECODE: '1', CLAUDE_CODE_IS_COWORK: '1' }, FAKE);
    expect(r.id).toBe('cowork');
    expect(r.alsoMatched).toEqual([{ id: 'claude-code', variable: 'CLAUDECODE' }]);
  });
  it('an empty string never matches, even an exact pattern', () => {
    expect(envVarsMatch({ SOME_VAR: '' }, { SOME_VAR: '' }).hit).toBeNull();
    expect(envVarsMatch({ CLAUDECODE: '' }, { CLAUDECODE: '*' }).hit).toBeNull();
  });
  it('empty registry disables detection entirely, including standard vars', () => {
    const empty: Registry = { standardEnvVars: [], harnesses: [], source: 'empty' };
    expect(detectAgent({ AGENT: 'devin', CLAUDECODE: '1' }, empty).id).toBeNull();
  });
});

describe('isPrefixPattern', () => {
  it('distinguishes "*" from "<prefix>*"', () => {
    expect(isPrefixPattern('*')).toBe(false);
    expect(isPrefixPattern('foo*')).toBe(true);
    expect(isPrefixPattern('WarpTerminal')).toBe(false);
  });
});

describe('detectAgent — against the 2026-09-11 registry snapshot', () => {
  const R = SNAPSHOT_REGISTRY;
  it('the snapshot has 26 harnesses and the two standard vars', () => {
    expect(R.harnesses).toHaveLength(26);
    expect(R.standardEnvVars).toEqual([...STANDARD_AGENT_ENV_VARS]);
  });
  it('a human in Warp is agent/warp (issue #4860)', () => {
    const r = detectAgent({ TERM_PROGRAM: 'WarpTerminal' }, R);
    expect(r.id).toBe('warp');
    expect(r.match?.variable).toBe('TERM_PROGRAM');
  });
  it('Apple Terminal is not', () => {
    expect(detectAgent({ TERM_PROGRAM: 'Apple_Terminal' }, R).id).toBeNull();
  });
  it('a human in Zed, Replit or the Cursor terminal is an agent', () => {
    expect(detectAgent({ ZED_TERM: 'true' }, R).id).toBe('zed');
    expect(detectAgent({ REPL_ID: 'x' }, R).id).toBe('replit');
    expect(detectAgent({ CURSOR_TRACE_ID: 'x' }, R).id).toBe('cursor');
  });
  it('Claude Code inside Cursor → claude-code, because cursor is kept last', () => {
    const r = detectAgent({ CURSOR_TRACE_ID: 'x', CLAUDECODE: '1' }, R);
    expect(r.id).toBe('claude-code');
    expect(r.alsoMatched.map((a) => a.id)).toEqual(['cursor']);
  });
  it('Gemini CLI inside Warp → gemini-cli (agent marker outranks terminal identity here)', () => {
    expect(detectAgent({ TERM_PROGRAM: 'WarpTerminal', GEMINI_CLI: '1' }, R).id).toBe('gemini-cli');
  });
  it('but any harness listed AFTER warp loses to a Warp shell', () => {
    // zed, cursor-cli, cursor and devin come after warp in the snapshot.
    expect(detectAgent({ TERM_PROGRAM: 'WarpTerminal', CURSOR_AGENT: '1' }, R).id).toBe('warp');
    expect(detectAgent({ TERM_PROGRAM: 'WarpTerminal', ZED_TERM: 'true' }, R).id).toBe('warp');
  });
  it('VTCode needs the exact value 1', () => {
    expect(detectAgent({ VTCODE: '1' }, R).id).toBe('vtcode');
    expect(detectAgent({ VTCODE: 'true' }, R).id).toBeNull();
  });
  it('hi, sandbase-harness and devin are only reachable through AI_AGENT / AGENT', () => {
    for (const id of ['hi', 'sandbase-harness', 'devin']) {
      const h = R.harnesses.find((x) => x.id === id)!;
      expect(h.envVars).toBeUndefined();
      expect(detectAgent({ AGENT: id }, R).id).toBe(id);
    }
  });
  it('AGENT=devin loses to a CLAUDECODE marker in the registry era', () => {
    expect(detectAgent({ AGENT: 'devin', CLAUDECODE: '1' }, R).id).toBe('claude-code');
  });
  it('the snapshot declares no <prefix>* patterns today', () => {
    expect(detectAgent({}, R).ignoredPatterns).toEqual([]);
  });
});

describe('detectLegacy — the hardcoded era (v1.10–v1.18)', () => {
  it('standard vars are checked FIRST, so AGENT=devin beats CLAUDECODE', () => {
    expect(detectLegacy({ AGENT: 'devin', CLAUDECODE: '1' }).id).toBe('devin');
  });
  it('knows gemini (not gemini-cli) and roo-code, and does not know warp or zed', () => {
    expect(detectLegacy({ GEMINI_CLI: '1' }).id).toBe('gemini');
    expect(detectLegacy({ ROO_ACTIVE: '1' }).id).toBe('roo-code');
    expect(detectLegacy({ TERM_PROGRAM: 'WarpTerminal' }).id).toBeNull();
    expect(detectLegacy({ ZED_TERM: 'true' }).id).toBeNull();
  });
  it('cursor outranked cursor-cli in the old order', () => {
    expect(detectLegacy({ CURSOR_TRACE_ID: 'x', CURSOR_AGENT: '1' }).id).toBe('cursor');
  });
});

describe('eraForVersion', () => {
  it('maps releases to detector eras', () => {
    expect(eraForVersion('0.36.0')).toBe('none');
    expect(eraForVersion('1.8.1')).toBe('none');
    expect(eraForVersion('1.9.0')).toBe('legacy');
    expect(eraForVersion('1.18.2')).toBe('legacy');
    expect(eraForVersion('1.19.0')).toBe('registry');
    expect(eraForVersion('1.31.0')).toBe('registry');
  });
});
