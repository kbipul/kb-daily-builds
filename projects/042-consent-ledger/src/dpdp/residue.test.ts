import { describe, expect, it } from 'vitest';
import { RESIDUE, residueFor, unreachableStores, weakestReach } from './residue';
import { USES } from './uses';

describe('residue after withdrawal', () => {
  it('covers every store a pipeline stage can write to', () => {
    const written = new Set(USES.map((u) => u.store));
    for (const store of written) {
      expect(() => residueFor(store), store).not.toThrow();
    }
  });

  it('has no rows for stores the pipeline never reaches', () => {
    // 'processor-copy' is the one store no stage declares directly: it is
    // reached whenever an authorised stage has foreignProcessor set, which is
    // how s.8(7)(b) works — the fiduciary's duty follows the data out.
    const written = new Set<string>(USES.map((u) => u.store));
    written.add('processor-copy');
    for (const row of RESIDUE) expect(written.has(row.store), row.store).toBe(true);
  });

  it('a stage that leaves India is what puts a processor copy in scope', () => {
    expect(USES.some((u) => u.foreignProcessor)).toBe(true);
    expect(USES.some((u) => u.store === 'processor-copy')).toBe(false);
  });

  it('the transcript store is the case the drafting imagines', () => {
    expect(residueFor('transcript-store').reach).toBe('erased');
  });

  it('model weights have no delete', () => {
    const row = residueFor('model-weights');
    expect(row.reach).toBe('no-erase-primitive');
    expect(row.effect).toContain('Retraining');
  });

  it("the processor's copy is a contract fact, not a system fact", () => {
    const row = residueFor('processor-copy');
    expect(row.reach).toBe('contractual-only');
    expect(row.effect).toContain('8(7)(b)');
  });

  it('stores that need instrumentation say what the instrumentation is', () => {
    for (const row of RESIDUE) {
      if (row.reach === 'erasable-if-instrumented') {
        expect(row.precondition, row.store).toBeTruthy();
      }
    }
  });

  it('a pipeline is only as erasable as its worst store', () => {
    expect(weakestReach(['transcript-store'])).toBe('erased');
    expect(weakestReach(['transcript-store', 'vector-index'])).toBe('erasable-if-instrumented');
    expect(weakestReach(['transcript-store', 'model-weights'])).toBe('no-erase-primitive');
    expect(weakestReach(['model-weights', 'transcript-store'])).toBe('no-erase-primitive');
  });

  it('order does not change the weakest reach', () => {
    const stores = ['vector-index', 'processor-copy', 'transcript-store'] as const;
    expect(weakestReach([...stores])).toBe(weakestReach([...stores].reverse()));
  });

  it('an empty pipeline has nothing to erase', () => {
    expect(weakestReach([])).toBe('erased');
    expect(unreachableStores([])).toEqual([]);
  });

  it('flags only the stores a delete request cannot clear on its own', () => {
    const flagged = unreachableStores(['transcript-store', 'vector-index', 'model-weights', 'processor-copy']);
    expect(flagged.map((r) => r.store).sort()).toEqual(['model-weights', 'processor-copy']);
  });

  it('the full default-consent pipeline is already not fully erasable', () => {
    // Only 'deliver the assistant' is specified, and it still writes vectors.
    const stores = USES.filter((u) => u.requires === 'service-delivery').map((u) => u.store);
    expect(weakestReach(stores)).toBe('erasable-if-instrumented');
  });

  it('turning on training changes the answer to "no delete"', () => {
    const stores = USES.filter(
      (u) => u.requires === 'service-delivery' || u.requires === 'model-improvement',
    ).map((u) => u.store);
    expect(weakestReach(stores)).toBe('no-erase-primitive');
  });

  it('every row explains itself', () => {
    for (const row of RESIDUE) {
      expect(row.label.length, row.store).toBeGreaterThan(0);
      expect(row.effect.length, row.store).toBeGreaterThan(30);
    }
  });
});
