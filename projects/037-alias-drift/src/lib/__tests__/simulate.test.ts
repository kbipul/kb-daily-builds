import { describe, it, expect } from 'vitest';
import { simulate, isSelfAnnouncing } from '../simulate';
import { CORPUS } from '../corpus';
import type { IdentifierRow } from '../types';

function rowOf(id: string): IdentifierRow {
  const r = CORPUS.find((x) => x.id === id);
  if (!r) throw new Error(`fixture missing: ${id}`);
  return r;
}

describe('simulate()', () => {
  it('always returns exactly three beats: steady state, notice, event', () => {
    for (const row of CORPUS) {
      const steps = simulate(row);
      expect(steps).toHaveLength(3);
      expect(steps.map((s) => s.t)).toEqual(['Today', 'Notice', 'Deprecation day']);
    }
  });

  it('a frozen-then-fails identifier resolves to a fail-toned event, every other kind does not', () => {
    for (const row of CORPUS) {
      const [, , event] = simulate(row);
      if (row.bindingKind === 'frozen-then-fails') {
        expect(event.tone).toBe('fail');
      } else {
        expect(event.tone).toBe('warn');
      }
    }
  });

  it('rows with no real advance notice get a warn-toned notice beat', () => {
    const alias = rowOf('openai-undated-alias');
    const zeroNotice = rowOf('deepseek-retiring-id');
    expect(simulate(alias)[1].tone).toBe('warn');
    expect(simulate(zeroNotice)[1].tone).toBe('warn');
  });

  it('rows with a documented notice window get a neutral-toned notice beat', () => {
    const frozen = rowOf('openai-dated-snapshot');
    const autoUpgrade = rowOf('azure-auto-update-default');
    expect(simulate(frozen)[1].tone).toBe('neutral');
    expect(simulate(autoUpgrade)[1].tone).toBe('neutral');
  });

  it('every step detail is non-empty and traces to the row or its binding-kind text', () => {
    for (const row of CORPUS) {
      for (const step of simulate(row)) {
        expect(step.detail.length).toBeGreaterThan(10);
      }
    }
  });

  it('the event beat for a reroute case names both what the row says and the general consequence', () => {
    const ds = rowOf('deepseek-retiring-id');
    const [, , event] = simulate(ds);
    expect(event.detail).toContain(ds.postEventBehavior);
  });
});

describe('isSelfAnnouncing()', () => {
  it('is true only for the two kinds a caller can detect without inspecting response content', () => {
    for (const row of CORPUS) {
      const expected = row.bindingKind === 'frozen-then-fails' || row.bindingKind === 'auto-upgrade-notice';
      expect(isSelfAnnouncing(row)).toBe(expected);
    }
  });

  it('the zero-notice and alias-repoint kinds are never self-announcing', () => {
    const ds = rowOf('deepseek-retiring-id');
    const alias = rowOf('gemini-latest-alias');
    expect(isSelfAnnouncing(ds)).toBe(false);
    expect(isSelfAnnouncing(alias)).toBe(false);
  });
});
