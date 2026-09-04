import { describe, expect, it } from 'vitest';
import {
  diagnose,
  hitDepth,
  optimize,
  requestCost,
  rollup,
  stableThrough,
  totalTokens,
  uncachedRequestCost,
  validateStack,
} from '../engine/cache';
import { MODELS, deadCacheSurcharge, missPenalty, writeRate } from '../engine/pricing';
import type { Block, PromptStack } from '../engine/types';
import { PRESETS } from '../engine/presets';

const fable = MODELS.find((m) => m.id === 'fable-5-1')!;
const fable5 = MODELS.find((m) => m.id === 'fable-5')!;

const b = (id: string, tokens: number, volatility: Block['volatility'], zone: Block['zone']): Block => ({
  id,
  label: id,
  tokens,
  volatility,
  zone,
});

const stack = (blocks: Block[], breakpoints: number[]): PromptStack => ({
  name: 't',
  blocks,
  breakpoints,
  outputTokens: 0,
  turnsPerSession: 1,
  sessionsPerDay: 1,
});

describe('stableThrough', () => {
  it('walks the unbroken stable run from the top', () => {
    const s = [b('a', 10, 'static', 'system'), b('b', 10, 'per-session', 'context'), b('c', 10, 'static', 'context')];
    expect(stableThrough(s, 'cold')).toBe(0);
    expect(stableThrough(s, 'warm')).toBe(2);
  });

  it('returns -1 when the very first block already changes', () => {
    expect(stableThrough([b('a', 10, 'per-turn', 'tools')], 'warm')).toBe(-1);
  });

  it('stops at the first break even if stable blocks follow', () => {
    const s = [b('a', 10, 'static', 'system'), b('b', 1, 'per-turn', 'system'), b('c', 9999, 'static', 'context')];
    expect(stableThrough(s, 'warm')).toBe(0);
  });

  it('handles an empty stack', () => {
    expect(stableThrough([], 'warm')).toBe(-1);
  });
});

describe('hitDepth', () => {
  it('picks the deepest breakpoint inside the stable run', () => {
    const s = stack(
      [b('a', 10, 'static', 'system'), b('b', 10, 'static', 'context'), b('c', 10, 'per-turn', 'turn')],
      [0, 1],
    );
    expect(hitDepth(s, 'warm')).toBe(1);
  });

  it('is -1 when every breakpoint sits past the cliff', () => {
    const s = stack([b('a', 10, 'per-turn', 'system'), b('b', 10, 'static', 'context')], [1]);
    expect(hitDepth(s, 'warm')).toBe(-1);
  });

  it('distinguishes cold from warm', () => {
    const s = stack(
      [b('a', 10, 'static', 'system'), b('b', 10, 'per-session', 'context')],
      [0, 1],
    );
    expect(hitDepth(s, 'cold')).toBe(0);
    expect(hitDepth(s, 'warm')).toBe(1);
  });

  it('ignores breakpoints pointing past the end of the stack', () => {
    const s = stack([b('a', 10, 'static', 'system')], [0, 7]);
    expect(hitDepth(s, 'warm')).toBe(0);
  });
});

describe('requestCost', () => {
  it('splits tokens into hit, write and plain buckets', () => {
    const s = stack(
      [b('a', 1000, 'static', 'system'), b('c', 500, 'per-turn', 'history'), b('d', 100, 'per-turn', 'turn')],
      [0, 1],
    );
    const r = requestCost(s, fable, 'warm', '5m');
    expect(r.hitTokens).toBe(1000);
    expect(r.writeTokens).toBe(500);
    expect(r.plainTokens).toBe(100);
  });

  it('the three buckets always sum to the whole prompt', () => {
    for (const preset of PRESETS) {
      for (const horizon of ['cold', 'warm'] as const) {
        const r = requestCost(preset, fable, horizon, '5m');
        expect(r.hitTokens + r.writeTokens + r.plainTokens).toBe(totalTokens(preset));
      }
    }
  });

  it('prices a hit at the cache-read rate', () => {
    const s = stack([b('a', 1_000_000, 'static', 'system')], [0]);
    expect(requestCost(s, fable, 'warm', '5m').inputCost).toBeCloseTo(0.25, 6);
  });

  it('prices a dead cache above doing nothing at all', () => {
    const dead = stack([b('a', 1_000_000, 'per-turn', 'system')], [0]);
    const cached = requestCost(dead, fable, 'warm', '5m').inputCost;
    const plain = uncachedRequestCost(dead, fable).inputCost;
    expect(cached).toBeGreaterThan(plain);
    expect(cached / plain).toBeCloseTo(deadCacheSurcharge(fable, '5m'), 6);
  });

  it('charges the 1h write rate when that TTL is chosen', () => {
    const s = stack([b('a', 1_000_000, 'per-turn', 'system')], [0]);
    expect(requestCost(s, fable, 'warm', '1h').inputCost).toBeCloseTo(20, 6);
  });

  it('with no breakpoints costs exactly the uncached price', () => {
    for (const preset of PRESETS) {
      const bare = { ...preset, breakpoints: [] };
      expect(requestCost(bare, fable, 'warm', '5m').total).toBeCloseTo(
        uncachedRequestCost(bare, fable).total,
        10,
      );
    }
  });
});

describe('the Fable 5.1 asymmetry', () => {
  it('makes a miss 50x a hit, where the old rule made it 12.5x', () => {
    expect(missPenalty(fable, '5m')).toBe(50);
    expect(missPenalty(fable5, '5m')).toBe(12.5);
  });

  it('leaves the dead-cache surcharge unchanged at 25%', () => {
    expect(deadCacheSurcharge(fable, '5m')).toBeCloseTo(1.25, 10);
    expect(deadCacheSurcharge(fable5, '5m')).toBeCloseTo(1.25, 10);
  });

  it('quadruples how many times over you overpay for a broken prefix', () => {
    // Twelve volatile tokens in front of a 100k static head. The absolute
    // waste barely moves between the two price lists, because a miss is billed
    // at the write rate and that did not change. What quadrupled is the RATIO:
    // the repaired stack got four times cheaper, so the same mistake is now
    // four times more embarrassing.
    const broken = stack(
      [b('head', 100_000, 'static', 'system'), b('now', 12, 'per-turn', 'system')],
      [1],
    );
    const fixed = optimize(broken);
    const ratio = (m: typeof fable) =>
      requestCost(broken, m, 'warm', '5m').inputCost / requestCost(fixed, m, 'warm', '5m').inputCost;
    expect(ratio(fable)).toBeGreaterThan(45);
    expect(ratio(fable5)).toBeLessThan(13);
    expect(ratio(fable) / ratio(fable5)).toBeCloseTo(4, 1);
  });

  it('makes a correct prefix pay for its write on the second request', () => {
    // Break-even reuse count N: N * input  >  write + (N - 1) * read.
    const n =
      (writeRate(fable, '5m') - fable.cacheRead) / (fable.input - fable.cacheRead);
    expect(n).toBeLessThan(2);
    expect(n).toBeGreaterThan(1);
  });
});

describe('optimize', () => {
  it('sinks a per-turn block to the bottom of its own zone', () => {
    const broken = stack(
      [
        b('sys', 1000, 'static', 'system'),
        b('now', 12, 'per-turn', 'system'),
        b('more', 500, 'static', 'system'),
      ],
      [1],
    );
    const fixed = optimize(broken);
    expect(fixed.blocks.map((x) => x.id)).toEqual(['sys', 'more', 'now']);
  });

  it('never moves a block across a zone boundary', () => {
    const s = stack(
      [b('t', 10, 'per-turn', 'tools'), b('sys', 10, 'static', 'system')],
      [],
    );
    const fixed = optimize(s);
    expect(fixed.blocks.map((x) => x.zone)).toEqual(['tools', 'system']);
  });

  it('is stable for blocks of equal volatility', () => {
    const s = stack(
      [b('one', 5, 'static', 'context'), b('two', 5, 'static', 'context'), b('three', 5, 'static', 'context')],
      [],
    );
    expect(optimize(s).blocks.map((x) => x.id)).toEqual(['one', 'two', 'three']);
  });

  it('places at most two breakpoints and both are readable', () => {
    for (const preset of PRESETS) {
      const fixed = optimize(preset);
      expect(fixed.breakpoints.length).toBeLessThanOrEqual(2);
      const warm = hitDepth(fixed, 'warm');
      if (fixed.breakpoints.length > 0) expect(warm).toBe(Math.max(...fixed.breakpoints));
    }
  });

  it('is idempotent', () => {
    for (const preset of PRESETS) {
      const once = optimize(preset);
      const twice = optimize(once);
      expect(twice.blocks.map((x) => x.id)).toEqual(once.blocks.map((x) => x.id));
      expect(twice.breakpoints).toEqual(once.breakpoints);
    }
  });

  it('never makes any preset more expensive', () => {
    for (const preset of PRESETS) {
      const before = rollup(preset, fable, '5m').perMonth;
      const after = rollup(optimize(preset), fable, '5m').perMonth;
      expect(after).toBeLessThanOrEqual(before + 1e-9);
    }
  });

  it('preserves the total token count', () => {
    for (const preset of PRESETS) {
      expect(totalTokens(optimize(preset))).toBe(totalTokens(preset));
    }
  });
});

describe('diagnose', () => {
  it('flags a breakpoint that can never be read back', () => {
    const s = stack([b('now', 10, 'per-turn', 'system'), b('big', 50_000, 'static', 'context')], [1]);
    expect(diagnose(s, fable, '5m').some((d) => d.kind === 'trapped-breakpoint')).toBe(true);
  });

  it('names the culprit and counts what it strands', () => {
    const s = stack(
      [b('sys', 1000, 'static', 'system'), b('now', 12, 'per-turn', 'system'), b('repo', 24_000, 'static', 'context')],
      [0],
    );
    const cliff = diagnose(s, fable, '5m').find((d) => d.kind === 'cliff');
    expect(cliff?.blockId).toBe('now');
    expect(cliff?.strandedTokens).toBe(24_000);
  });

  it('reports a stack with no markers at all', () => {
    const s = stack([b('a', 100, 'static', 'system')], []);
    expect(diagnose(s, fable, '5m')[0].kind).toBe('no-breakpoint');
  });

  it('rejects more markers than the API allows', () => {
    const blocks = Array.from({ length: 6 }, (_, i) => b(`x${i}`, 10, 'static', 'context'));
    const s = stack(blocks, [0, 1, 2, 3, 4]);
    expect(diagnose(s, fable, '5m').some((d) => d.kind === 'too-many-breakpoints')).toBe(true);
  });

  it('calls out a redundant marker of the same stability class', () => {
    const s = stack(
      [b('a', 10, 'static', 'system'), b('b', 10, 'static', 'context'), b('c', 10, 'per-turn', 'turn')],
      [0, 1],
    );
    expect(diagnose(s, fable, '5m').some((d) => d.kind === 'redundant-breakpoint')).toBe(true);
  });

  it('says so when a per-turn block sits in a zone reordering cannot rescue', () => {
    const s = stack(
      [b('tool', 10, 'per-turn', 'tools'), b('sys', 5000, 'static', 'system')],
      [],
    );
    expect(diagnose(s, fable, '5m').some((d) => d.kind === 'unfixable-early-volatility')).toBe(true);
  });

  it('gives every preset a clean bill once optimised, or explains why not', () => {
    for (const preset of PRESETS) {
      const ds = diagnose(optimize(preset), fable, '5m');
      expect(ds.some((d) => d.severity === 'critical')).toBe(false);
    }
  });

  it('sorts critical findings first', () => {
    const s = stack(
      [b('now', 10, 'per-turn', 'system'), b('big', 50_000, 'static', 'context')],
      [1],
    );
    expect(diagnose(s, fable, '5m')[0].severity).toBe('critical');
  });
});

describe('rollup', () => {
  it('charges turn 1 cold and the rest warm', () => {
    const s: PromptStack = {
      ...stack([b('a', 1_000_000, 'per-session', 'system')], [0]),
      turnsPerSession: 3,
      sessionsPerDay: 1,
    };
    const cold = requestCost(s, fable, 'cold', '5m').total;
    const warm = requestCost(s, fable, 'warm', '5m').total;
    expect(rollup(s, fable, '5m').perSession).toBeCloseTo(cold + 2 * warm, 10);
  });

  it('multiplies out to a 30-day month', () => {
    const s: PromptStack = { ...PRESETS[0], sessionsPerDay: 2 };
    const r = rollup(s, fable, '5m');
    expect(r.perMonth).toBeCloseTo(r.perDay * 30, 8);
    expect(r.perDay).toBeCloseTo(r.perSession * 2, 8);
  });

  it('treats a zero-turn session as one turn', () => {
    const s: PromptStack = { ...stack([b('a', 100, 'static', 'system')], [0]), turnsPerSession: 0 };
    expect(rollup(s, fable, '5m').perSession).toBeGreaterThan(0);
  });
});

describe('validateStack', () => {
  it('accepts every shipped preset', () => {
    for (const preset of PRESETS) expect(validateStack(preset)).toEqual([]);
  });

  it('rejects zones out of request order', () => {
    const s = stack([b('u', 10, 'static', 'turn'), b('sys', 10, 'static', 'system')], []);
    expect(validateStack(s).length).toBeGreaterThan(0);
  });

  it('rejects negative token counts', () => {
    expect(validateStack(stack([b('a', -1, 'static', 'system')], [])).length).toBe(1);
  });

  it('rejects a fifth breakpoint', () => {
    const blocks = Array.from({ length: 6 }, (_, i) => b(`x${i}`, 10, 'static', 'context'));
    expect(validateStack(stack(blocks, [0, 1, 2, 3, 4])).length).toBe(1);
  });
});
