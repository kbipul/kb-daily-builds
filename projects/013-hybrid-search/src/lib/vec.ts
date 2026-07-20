// Pure vector math for the semantic half. No React, no transformers here, so
// every function is covered by fast deterministic unit tests. The embedding
// model lives behind embed.ts and only feeds numbers into these.

export type Vec = number[];

export function dot(a: Vec, b: Vec): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: Vec): number {
  return Math.sqrt(dot(a, a));
}

/** Cosine similarity in [-1, 1]; 0 when either vector has no magnitude. */
export function cosine(a: Vec, b: Vec): number {
  const m = norm(a) * norm(b);
  if (m === 0) return 0;
  const c = dot(a, b) / m;
  return Math.max(-1, Math.min(1, c)); // guard tiny FP overshoot past ±1
}
