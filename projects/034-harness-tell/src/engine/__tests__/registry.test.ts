import { describe, expect, it } from 'vitest';
import {
  LEGACY_KNOWN_AGENTS,
  SNAPSHOT_HARNESSES,
  SNAPSHOT_REGISTRY,
  VAR_NATURE,
  diffRegistries,
  parseRegistryJson,
  toWireJson,
  varNature,
} from '../registry';
import { parseEnv, redactSecrets, relevantVars } from '../parseEnv';
import { ENTRY_POINTS, HF_HUB_VERSIONS, eraForEntry } from '../entryPoints';
import { PRESETS } from '../presets';
import { detectAgent } from '../detect';

describe('registry snapshot integrity', () => {
  it('ids are unique and lowercase-hyphenated as the docs require', () => {
    const ids = SNAPSHOT_HARNESSES.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it('keeps the two ordering rules the registry file states in comments', () => {
    const idx = (id: string) => SNAPSHOT_HARNESSES.findIndex((h) => h.id === id);
    expect(idx('cowork')).toBeLessThan(idx('claude-code'));
    expect(idx('cursor-cli')).toBeLessThan(idx('cursor'));
    expect(idx('cursor')).toBe(SNAPSHOT_HARNESSES.length - 2); // only devin after it
  });
  it('only two entries use an exact-value pattern; everything else is "*"', () => {
    const exact: string[] = [];
    for (const h of SNAPSHOT_HARNESSES) for (const [k, p] of Object.entries(h.envVars ?? {})) if (p !== '*') exact.push(`${h.id}:${k}=${p}`);
    expect(exact.sort()).toEqual(['vtcode:VTCODE=1', 'warp:TERM_PROGRAM=WarpTerminal']);
  });
  it('the legacy list and the snapshot disagree on four ids', () => {
    const now = new Set(SNAPSHOT_HARNESSES.map((h) => h.id));
    const gone = [...LEGACY_KNOWN_AGENTS].filter((id) => !now.has(id)).sort();
    expect(gone).toEqual(['gemini', 'roo-code']); // renamed to gemini-cli; dropped
    const added = [...now].filter((id) => !LEGACY_KNOWN_AGENTS.has(id)).sort();
    expect(added).toEqual(['crush', 'gemini-cli', 'hermes-agent', 'hi', 'kilo-code', 'kiro', 'sandbase-harness', 'vtcode', 'warp', 'zed']);
  });
  it('every terminal-identity row we flag is backed by a stated reason', () => {
    for (const [k, v] of Object.entries(VAR_NATURE)) {
      expect(v.why.length, k).toBeGreaterThan(20);
    }
    expect(varNature('TERM_PROGRAM').nature).toBe('terminal');
    expect(varNature('CLAUDECODE').nature).toBe('agent');
  });
});

describe('parseRegistryJson — the wire format the Hub serves', () => {
  it('round-trips the snapshot through toWireJson and preserves order', () => {
    const { registry, error } = parseRegistryJson(toWireJson(SNAPSHOT_REGISTRY));
    expect(error).toBeNull();
    expect(registry!.harnesses.map((h) => h.id)).toEqual(SNAPSHOT_HARNESSES.map((h) => h.id));
    expect(registry!.standardEnvVars).toEqual(['AI_AGENT', 'AGENT']);
    expect(detectAgent({ TERM_PROGRAM: 'WarpTerminal' }, registry!).id).toBe('warp');
  });
  it('rejects junk with a message, never throws', () => {
    expect(parseRegistryJson('{').registry).toBeNull();
    expect(parseRegistryJson('[]').error).toBeTruthy();
    expect(parseRegistryJson('{"harnesses": {}}').error).toBeTruthy();
    expect(parseRegistryJson('{"harnesses": {"x": {"envVars": {"A": 1}}}}').registry?.harnesses[0].envVars).toBeUndefined();
  });
  it('a pasted registry that drops warp changes the verdict for a Warp shell', () => {
    const wire = JSON.parse(toWireJson(SNAPSHOT_REGISTRY));
    delete wire.harnesses.warp;
    const { registry } = parseRegistryJson(JSON.stringify(wire));
    expect(detectAgent({ TERM_PROGRAM: 'WarpTerminal' }, registry!).id).toBeNull();
    expect(diffRegistries(SNAPSHOT_REGISTRY, registry!)).toEqual({ added: [], removed: ['warp'], changedVars: [] });
  });
  it('diff reports added ids and changed env vars', () => {
    const wire = JSON.parse(toWireJson(SNAPSHOT_REGISTRY));
    wire.harnesses.newbot = { envVars: { NEWBOT: '*' } };
    wire.harnesses.zed = { envVars: { ZED_AGENT: '*' } };
    const { registry } = parseRegistryJson(JSON.stringify(wire));
    expect(diffRegistries(SNAPSHOT_REGISTRY, registry!)).toEqual({ added: ['newbot'], removed: [], changedVars: ['zed'] });
  });
});

describe('parseEnv', () => {
  it('accepts KEY=VALUE, export KEY=VALUE and bare names', () => {
    const { env, namesOnly, skipped } = parseEnv('TERM_PROGRAM=WarpTerminal\nexport CLAUDECODE="1"\nZED_TERM\n# comment\n\nnot a var!\n');
    expect(env).toEqual({ TERM_PROGRAM: 'WarpTerminal', CLAUDECODE: '1', ZED_TERM: '1' });
    expect(namesOnly).toBe(1);
    expect(skipped).toBe(1);
  });
  it('blanks values whose name looks like a credential', () => {
    expect(redactSecrets({ HF_TOKEN: 'hf_abc', COPILOT_GITHUB_TOKEN: 'ghu_x', HOME: '/h' })).toEqual({ HF_TOKEN: '••••', COPILOT_GITHUB_TOKEN: '••••', HOME: '/h' });
    // a redacted token is still non-empty, so a "*" pattern still matches — as it would for the real value
    expect(detectAgent(parseEnv('COPILOT_GITHUB_TOKEN=ghu_x').env, SNAPSHOT_REGISTRY).id).toBe('github-copilot');
  });
  it('relevantVars lists only what the detector can look at', () => {
    expect(relevantVars({ HOME: '/h', AGENT: 'x', CURSOR_TRACE_ID: 'y', PATH: '/bin' }, SNAPSHOT_REGISTRY).sort()).toEqual(['AGENT', 'CURSOR_TRACE_ID']);
  });
});

describe('entry points and presets', () => {
  it('every SDK entry with a direct requirement resolves to the detection era except whisperx', () => {
    for (const e of ENTRY_POINTS) {
      if (e.id === 'whisperx') expect(eraForEntry(e)).toBe('none');
      else expect(eraForEntry(e), e.id).toBe('registry');
    }
  });
  it('requirement strings are verbatim PyPI Requires-Dist or null', () => {
    for (const e of ENTRY_POINTS) if (e.requires) expect(e.requires).toMatch(/^huggingface[-_]hub/);
  });
  it('version pins cover all three eras', () => {
    expect(new Set(HF_HUB_VERSIONS.map((v) => v.era))).toEqual(new Set(['none', 'legacy', 'registry']));
  });
  it('every preset labelled human that mentions a terminal is detected as an agent — the point of the build', () => {
    const humans = PRESETS.filter((p) => p.who === 'human');
    const tagged = humans.filter((p) => detectAgent(p.env, SNAPSHOT_REGISTRY).id !== null).map((p) => p.id).sort();
    expect(tagged).toEqual(['cursor-human', 'replit-human', 'warp', 'zed-human']);
    expect(detectAgent(PRESETS.find((p) => p.id === 'terminal')!.env, SNAPSHOT_REGISTRY).id).toBeNull();
  });
  it('every agent preset is detected, and preset ids are unique', () => {
    for (const p of PRESETS.filter((x) => x.who === 'agent')) expect(detectAgent(p.env, SNAPSHOT_REGISTRY).id, p.id).not.toBeNull();
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });
  it('presets never carry a real-looking secret value', () => {
    for (const p of PRESETS) for (const [k, v] of Object.entries(p.env)) if (/TOKEN|KEY|SECRET/i.test(k)) expect(v, `${p.id}:${k}`).toMatch(/synthetic|redacted/);
  });
});
