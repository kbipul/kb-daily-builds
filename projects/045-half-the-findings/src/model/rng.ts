/** mulberry32: a tiny seeded PRNG so every run in the demo is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick `n` distinct members of `xs`, seeded. */
export function sample<T>(xs: readonly T[], n: number, next: () => number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  const take = Math.min(n, pool.length);
  for (let i = 0; i < take; i++) {
    out.push(...pool.splice(Math.floor(next() * pool.length), 1));
  }
  return out;
}
