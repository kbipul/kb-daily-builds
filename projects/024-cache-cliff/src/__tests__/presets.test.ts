import { describe, expect, it } from 'vitest';
import { KNOWN_INVALIDATORS, PRESETS } from '../engine/presets';
import { MODELS } from '../engine/pricing';
import { diagnose, optimize, relocate, rollup, totalTokens, validateStack } from '../engine/cache';

const fable = MODELS.find((m) => m.id === 'fable-5-1')!;

const byName = (n: string) => PRESETS.find((p) => p.name.startsWith(n))!;

describe('shipped presets', () => {
  it('are all structurally valid', () => {
    for (const p of PRESETS) expect(validateStack(p)).toEqual([]);
  });

  it('have unique names and non-empty stacks', () => {
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(p.blocks.length).toBeGreaterThan(2);
  });

  it('ship at least six named invalidators, each with an explanation', () => {
    expect(KNOWN_INVALIDATORS.length).toBeGreaterThanOrEqual(6);
    for (const k of KNOWN_INVALIDATORS) expect(k.detail.length).toBeGreaterThan(20);
  });
});

/**
 * These lock the numbers the README quotes. If the pricing table or the engine
 * changes, the claims in the write-up fail with them rather than quietly
 * becoming false.
 */
describe('README claims', () => {
  const coding = byName('Coding agent');

  it('the twelve-token timestamp strands 32,300 tokens', () => {
    const cliff = diagnose(coding, fable, '5m').find((d) => d.kind === 'cliff');
    expect(cliff?.blockId).toBe('now');
    expect(cliff?.strandedTokens).toBe(32_300);
  });

  it('caching this stack as configured costs MORE than not caching it', () => {
    const none = rollup(coding, fable, '5m', true).perMonth;
    const now = rollup(coding, fable, '5m').perMonth;
    expect(now).toBeGreaterThan(none);
    expect(now / none).toBeGreaterThan(1.2);
  });

  it('and reordering it beats both', () => {
    const none = rollup(coding, fable, '5m', true).perMonth;
    const now = rollup(coding, fable, '5m').perMonth;
    const fixed = rollup(optimize(coding), fable, '5m').perMonth;
    expect(fixed).toBeLessThan(none);
    expect(now - fixed).toBeGreaterThan(5_000);
  });

  it('moving the twelve tokens cuts the bill more than 70%', () => {
    const now = rollup(coding, fable, '5m').perMonth;
    const { stack: moved, moved: moves } = relocate(coding);
    expect(moves.map((m) => m.tokens)).toEqual([12]);
    const after = rollup(moved, fable, '5m').perMonth;
    expect((now - after) / now).toBeGreaterThan(0.7);
  });

  it('the RAG preset gets more than 60% cheaper with markers alone, and 80% with the move', () => {
    const rag = byName('Enterprise RAG');
    const now = rollup(rag, fable, '5m').perMonth;
    const reordered = rollup(optimize(rag), fable, '5m').perMonth;
    const moved = rollup(relocate(rag).stack, fable, '5m').perMonth;
    expect((now - reordered) / now).toBeGreaterThan(0.6);
    expect((now - moved) / now).toBeGreaterThan(0.8);
  });

  it('the RAG fix starts with a forty-token personalisation line', () => {
    const { moved } = relocate(byName('Enterprise RAG'));
    expect(moved[0].tokens).toBe(40);
    expect(moved[0].volatility).toBe('per-session');
  });

  it('the clean preset is already optimal and raises no warnings', () => {
    const clean = byName('Clean stack');
    expect(relocate(clean).moved).toEqual([]);
    expect(rollup(optimize(clean), fable, '5m').perMonth).toBeCloseTo(
      rollup(clean, fable, '5m').perMonth,
      8,
    );
    const ds = diagnose(clean, fable, '5m');
    expect(ds.some((d) => d.severity === 'critical' || d.severity === 'warning')).toBe(false);
  });

  it('reordering never changes what is actually sent to the model', () => {
    for (const p of PRESETS) {
      expect(totalTokens(optimize(p))).toBe(totalTokens(p));
      expect(new Set(optimize(p).blocks.map((b) => b.id))).toEqual(new Set(p.blocks.map((b) => b.id)));
    }
  });
});
