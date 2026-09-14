import { describe, expect, it } from 'vitest';
import { buildUserAgent, buildUserAgentSegments, dedupeSegments } from '../userAgent';

const base = {
  libraryName: 'transformers',
  libraryVersion: '5.17.0',
  hfHubVersion: '1.31.0',
  pythonVersion: '3.12.4',
  torchVersion: '2.9.0',
  disableTelemetry: false,
  agentId: 'claude-code',
};

describe('_http_user_agent port', () => {
  it('assembles segments in source order', () => {
    expect(buildUserAgent(base)).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; torch/2.9.0; agent/claude-code');
  });
  it('library unknown → "unknown/None"', () => {
    expect(buildUserAgent({ ...base, libraryName: null, libraryVersion: null })).toMatch(/^unknown\/None; hf_hub/);
  });
  it('HF_HUB_DISABLE_TELEMETRY drops torch AND agent, nothing else', () => {
    expect(buildUserAgent({ ...base, disableTelemetry: true })).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4');
  });
  it('no torch → no torch segment; no agent → no agent segment', () => {
    expect(buildUserAgent({ ...base, torchVersion: null, agentId: null })).toBe('transformers/5.17.0; hf_hub/1.31.0; python/3.12.4');
  });
  it('origin is appended last and survives the telemetry flag', () => {
    expect(buildUserAgent({ ...base, disableTelemetry: true, origin: 'acme-ci' })).toBe(
      'transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; origin/acme-ci',
    );
  });
  it('caller-supplied user_agent dict and str are appended before origin', () => {
    expect(buildUserAgent({ ...base, agentId: null, torchVersion: null, extra: { pipeline: 'fill-mask' }, origin: 'o' })).toBe(
      'transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; pipeline/fill-mask; origin/o',
    );
    expect(buildUserAgent({ ...base, agentId: null, torchVersion: null, extra: 'custom/1' })).toBe(
      'transformers/5.17.0; hf_hub/1.31.0; python/3.12.4; custom/1',
    );
  });
  it('_deduplicate_user_agent keeps the first of byte-identical segments only', () => {
    const segs = buildUserAgentSegments({ ...base, agentId: null, torchVersion: null, extra: 'hf_hub/1.31.0; python/3.11.0' });
    expect(segs.map((s) => s.text)).toEqual(['transformers/5.17.0', 'hf_hub/1.31.0', 'python/3.12.4', 'python/3.11.0']);
    expect(dedupeSegments([]).length).toBe(0);
  });
  it('every segment carries a citation and the removable ones name their switch', () => {
    const segs = buildUserAgentSegments(base);
    for (const s of segs) expect(s.cite).toMatch(/_headers\.py:\d+/);
    expect(segs.find((s) => s.key === 'agent')?.removedBy).toBe('HF_HUB_DISABLE_TELEMETRY');
    expect(segs.find((s) => s.key === 'torch')?.removedBy).toBe('HF_HUB_DISABLE_TELEMETRY');
    expect(segs.find((s) => s.key === 'hf_hub')?.removedBy).toBeUndefined();
  });
});
