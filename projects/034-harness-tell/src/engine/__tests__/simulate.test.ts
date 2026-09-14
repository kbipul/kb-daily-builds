import { describe, expect, it } from 'vitest';
import { resolveRegistry, simulate, type SimInput } from '../simulate';
import { SNAPSHOT_REGISTRY } from '../registry';
import type { KillSwitches, RuntimeFacts } from '../types';

const SW: KillSwitches = { disableTelemetry: false, offline: false, origin: '', noColor: false };
const FACTS: RuntimeFacts = {
  hfHubVersion: '1.31.0',
  pythonVersion: '3.12.4',
  torchVersion: '2.9.0',
  libraryName: 'transformers',
  libraryVersion: '5.17.0',
  cache: 'none',
  hubReachable: true,
};

const run = (over: Partial<SimInput> = {}, sw: Partial<KillSwitches> = {}, facts: Partial<RuntimeFacts> = {}) =>
  simulate({
    entry: 'sdk',
    env: { CLAUDECODE: '1' },
    registry: SNAPSHOT_REGISTRY,
    switches: { ...SW, ...sw },
    facts: { ...FACTS, ...facts },
    ...over,
  });

describe('resolveRegistry — _load_registry port', () => {
  it('fresh cache → no network', () => {
    expect(resolveRegistry({ cache: 'fresh', hubReachable: true }, false)).toMatchObject({ source: 'cache-fresh', fetchAttempted: false });
  });
  it('no/stale cache online → fetch', () => {
    expect(resolveRegistry({ cache: 'none', hubReachable: true }, false)).toMatchObject({ source: 'fetched', fetchAttempted: true, fetchSucceeded: true });
    expect(resolveRegistry({ cache: 'stale', hubReachable: true }, false)).toMatchObject({ source: 'fetched' });
  });
  it('offline → never fetches; stale cache still used; no cache → empty', () => {
    expect(resolveRegistry({ cache: 'stale', hubReachable: true }, true)).toMatchObject({ source: 'cache-stale', fetchAttempted: false, detectionDisabled: false });
    expect(resolveRegistry({ cache: 'none', hubReachable: true }, true)).toMatchObject({ source: 'empty', fetchAttempted: false, detectionDisabled: true });
  });
  it('Hub unreachable → fetch attempted, then stale cache or empty', () => {
    expect(resolveRegistry({ cache: 'stale', hubReachable: false }, false)).toMatchObject({ source: 'cache-stale', fetchAttempted: true, fetchSucceeded: false });
    expect(resolveRegistry({ cache: 'none', hubReachable: false }, false)).toMatchObject({ source: 'empty', fetchAttempted: true, detectionDisabled: true });
  });
});

describe('simulate — SDK path', () => {
  it('default: registry fetched, agent detected, header carries agent/claude-code', () => {
    const s = run();
    expect(s.detectorCalled).toBe(true);
    expect(s.registry.fetchAttempted).toBe(true);
    expect(s.detect.id).toBe('claude-code');
    expect(s.userAgent).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; torch/2.9.0; agent/claude-code');
    expect(s.steps.map((x) => x.kind)).toEqual(['effect', 'registry', 'effect', 'request']);
  });
  it('the registry GET precedes the model request in the timeline', () => {
    const s = run();
    const reg = s.steps.findIndex((x) => x.kind === 'registry');
    const req = s.steps.findIndex((x) => x.kind === 'request');
    expect(reg).toBeGreaterThan(-1);
    expect(reg).toBeLessThan(req);
  });
  it('HF_HUB_DISABLE_TELEMETRY: detector never called, no registry fetch, plain header', () => {
    const s = run({}, { disableTelemetry: true });
    expect(s.detectorCalled).toBe(false);
    expect(s.registry.fetchAttempted).toBe(false);
    expect(s.detect.id).toBeNull();
    expect(s.userAgent).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4');
    expect(s.effects.find((e) => e.id === 'ua-agent')?.on).toBe(false);
  });
  it('DO_NOT_TRACK-style opt-out keeps origin/', () => {
    const s = run({}, { disableTelemetry: true, origin: 'acme' });
    expect(s.userAgent).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; origin/acme');
  });
  it('HF_HUB_OFFLINE: env still read, stale cache still detects, but nothing leaves the process', () => {
    const s = run({}, { offline: true }, { cache: 'stale' });
    expect(s.detectorCalled).toBe(true);
    expect(s.detect.id).toBe('claude-code');
    expect(s.registry.fetchAttempted).toBe(false);
    expect(s.userAgent).toBeNull();
    const blocked = s.steps.find((x) => x.kind === 'blocked');
    expect(blocked?.userAgent).toContain('agent/claude-code');
    expect(s.effects.find((e) => e.id === 'registry-fetch')?.on).toBe(false);
  });
  it('HF_HUB_OFFLINE with no cache: detection is disabled outright', () => {
    const s = run({}, { offline: true }, { cache: 'none' });
    expect(s.registry.detectionDisabled).toBe(true);
    expect(s.detect.id).toBeNull();
  });
  it('a fresh cache means no registry request even on a cold process', () => {
    const s = run({}, {}, { cache: 'fresh' });
    expect(s.registry.fetchAttempted).toBe(false);
    expect(s.detect.id).toBe('claude-code');
  });
  it('Hub unreachable: fetch attempted, stale copy used, model request blocked', () => {
    const s = run({}, {}, { cache: 'stale', hubReachable: false });
    expect(s.registry).toMatchObject({ source: 'cache-stale', fetchAttempted: true });
    expect(s.detect.id).toBe('claude-code');
    expect(s.userAgent).toBeNull();
    expect(s.steps.some((x) => x.kind === 'blocked')).toBe(true);
  });
  it('a client pinned below 1.9 reads nothing and tags nothing', () => {
    const s = run({}, {}, { hfHubVersion: '0.36.0' });
    expect(s.detectorCalled).toBe(false);
    expect(s.userAgent).toBe('transformers/5.17.0; hf_hub/0.36.0; python/3.12.4; torch/2.9.0');
    expect(s.steps[0].kind).toBe('note');
  });
  it('a 1.10–1.18 client uses the compiled list: no fetch, standard vars first', () => {
    const s = run({ env: { AGENT: 'devin', CLAUDECODE: '1' } }, {}, { hfHubVersion: '1.10.0' });
    expect(s.registry.fetchAttempted).toBe(false);
    expect(s.detect.id).toBe('devin');
    const s2 = run({ env: { AGENT: 'devin', CLAUDECODE: '1' } });
    expect(s2.detect.id).toBe('claude-code');
  });
  it('a human in Warp gets agent/warp on the header', () => {
    const s = run({ env: { TERM_PROGRAM: 'WarpTerminal' } });
    expect(s.userAgent).toContain('agent/warp');
  });
});

describe('simulate — CLI path', () => {
  it('hf download: registry resolved at startup even with telemetry disabled', () => {
    const s = run({ entry: 'cli' }, { disableTelemetry: true });
    expect(s.detectorCalled).toBe(true);
    expect(s.registry.fetchAttempted).toBe(true);
    expect(s.detect.id).toBe('claude-code');
    // …but the header still loses the agent segment.
    expect(s.userAgent).toBe('huggingface-cli/1.31.0; hf_hub/1.31.0; python/3.12.4');
    expect(s.effects.find((e) => e.id === 'registry-fetch')?.on).toBe(true);
    expect(s.effects.find((e) => e.id === 'ua-agent')?.on).toBe(false);
  });
  it('detection flips the CLI into agent mode and strips colours', () => {
    const s = run({ entry: 'cli', env: { TERM_PROGRAM: 'WarpTerminal' } });
    expect(s.effects.find((e) => e.id === 'cli-mode')?.on).toBe(true);
    expect(s.effects.find((e) => e.id === 'colour')?.on).toBe(true);
    const h = run({ entry: 'cli', env: { TERM_PROGRAM: 'Apple_Terminal' } });
    expect(h.effects.find((e) => e.id === 'cli-mode')?.on).toBe(false);
    expect(h.effects.find((e) => e.id === 'colour')?.on).toBe(false);
  });
  it('NO_COLOR strips colours without implying an agent', () => {
    const s = run({ entry: 'cli', env: {} }, { noColor: true });
    expect(s.effects.find((e) => e.id === 'colour')?.on).toBe(true);
    expect(s.effects.find((e) => e.id === 'cli-mode')?.on).toBe(false);
  });
  it('hf env prints the decision and makes no model request', () => {
    const s = run({ entry: 'hf-env' });
    expect(s.userAgent).toBeNull();
    expect(s.effects.find((e) => e.id === 'hf-env-line')?.label).toContain('Yes');
    expect(s.steps.some((x) => x.kind === 'request')).toBe(false);
    const n = run({ entry: 'hf-env', env: {} });
    expect(n.effects.find((e) => e.id === 'hf-env-line')?.label).toContain('No');
  });
});

describe('simulate — every step is sourced', () => {
  it('registry, effect and request steps all cite a file:line', () => {
    for (const entry of ['sdk', 'cli', 'hf-env'] as const) {
      const s = run({ entry });
      for (const st of s.steps) {
        if (st.kind === 'registry' || st.kind === 'effect' || st.kind === 'request') expect(st.cite, `${entry}: ${st.title}`).toBeTruthy();
      }
    }
  });
});
