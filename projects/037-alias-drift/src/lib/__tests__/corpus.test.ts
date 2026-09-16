import { describe, it, expect } from 'vitest';
import { CORPUS, BINDING_KINDS } from '../corpus';
import type { BindingKind } from '../types';

describe('corpus integrity', () => {
  it('has unique ids', () => {
    const ids = CORPUS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every row cites a real https source', () => {
    for (const row of CORPUS) {
      expect(row.sourceUrl.startsWith('https://')).toBe(true);
      expect(row.sourceLabel.length).toBeGreaterThan(0);
    }
  });

  it('every row maps to a known binding kind', () => {
    const known = new Set(Object.keys(BINDING_KINDS));
    for (const row of CORPUS) {
      expect(known.has(row.bindingKind)).toBe(true);
    }
  });

  it('every row states what happens at the event and what notice looks like', () => {
    for (const row of CORPUS) {
      expect(row.postEventBehavior.length).toBeGreaterThan(20);
      expect(row.notice.length).toBeGreaterThan(5);
    }
  });

  it('covers all four binding kinds at least once', () => {
    const seen = new Set(CORPUS.map((r) => r.bindingKind));
    const all: BindingKind[] = [
      'frozen-then-fails',
      'alias-repoint',
      'auto-upgrade-notice',
      'zero-notice-reroute',
    ];
    for (const k of all) expect(seen.has(k)).toBe(true);
  });

  it('risk scores in BINDING_KINDS are ordered exactly frozen < auto-upgrade < alias < zero-notice', () => {
    // This is the corpus's central, checkable claim: silence is riskier than
    // an outright failure, and an unannounced reroute is riskier than an
    // announced one. If a refactor quietly flips this ordering the whole
    // point of the project is gone, so it is pinned here rather than only
    // implied by the UI.
    expect(BINDING_KINDS['frozen-then-fails'].risk).toBeLessThan(
      BINDING_KINDS['auto-upgrade-notice'].risk,
    );
    expect(BINDING_KINDS['auto-upgrade-notice'].risk).toBeLessThan(
      BINDING_KINDS['alias-repoint'].risk,
    );
    expect(BINDING_KINDS['alias-repoint'].risk).toBeLessThan(
      BINDING_KINDS['zero-notice-reroute'].risk,
    );
  });

  it('DeepSeek row is the zero-notice case and documents the caveat that even its own notices are not stable', () => {
    const ds = CORPUS.find((r) => r.id === 'deepseek-retiring-id');
    expect(ds).toBeDefined();
    expect(ds!.bindingKind).toBe('zero-notice-reroute');
    expect(ds!.caveat && ds!.caveat.length).toBeGreaterThan(20);
  });

  it('each provider contributes at least one row', () => {
    const providers = new Set(CORPUS.map((r) => r.provider));
    expect(providers.size).toBeGreaterThanOrEqual(5);
  });

  it('at least one row per major provider shows a frozen identifier is available', () => {
    // The point is not "every provider is bad" — several offer a genuinely
    // frozen option. The tool would be dishonest if it buried that.
    const frozenProviders = new Set(
      CORPUS.filter((r) => r.bindingKind === 'frozen-then-fails').map((r) => r.provider),
    );
    expect(frozenProviders.has('OpenAI')).toBe(true);
    expect(frozenProviders.has('Anthropic')).toBe(true);
    expect(frozenProviders.has('Google Gemini')).toBe(true);
  });
});
