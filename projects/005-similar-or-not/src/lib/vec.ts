// Pure vector math for the embeddings playground. No React, no transformers —
// so every function here is covered by fast, deterministic unit tests. The
// embedding model lives behind embed.ts and only feeds numbers into these.

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

/** Unit-length copy of a vector; a zero vector is returned unchanged. */
export function normalize(a: Vec): Vec {
  const m = norm(a);
  if (m === 0) return a.slice();
  return a.map((x) => x / m);
}

/** Cosine similarity in [-1, 1]; 0 when either vector has no magnitude. */
export function cosine(a: Vec, b: Vec): number {
  const m = norm(a) * norm(b);
  if (m === 0) return 0;
  const c = dot(a, b) / m;
  // Guard against tiny floating-point overshoot past ±1.
  return Math.max(-1, Math.min(1, c));
}

/** Full N×N cosine-similarity matrix (symmetric, 1.0 on the diagonal). */
export function similarityMatrix(vectors: Vec[]): number[][] {
  const n = vectors.length;
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    out[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const c = cosine(vectors[i], vectors[j]);
      out[i][j] = c;
      out[j][i] = c;
    }
  }
  return out;
}

/** Element-wise mean vector of a non-empty list of equal-length vectors. */
export function meanVector(vectors: Vec[]): Vec {
  const n = vectors.length;
  if (n === 0) return [];
  const d = vectors[0].length;
  const out = new Array(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) out[i] += v[i];
  return out.map((x) => x / n);
}

function subtract(a: Vec, b: Vec): Vec {
  return a.map((x, i) => x - b[i]);
}

/**
 * Deterministic top eigenvector of the covariance of `centered` rows, via
 * power iteration. A fixed, non-degenerate seed keeps results reproducible
 * (important for tests and for a stable-looking map between renders).
 */
function topEigenvector(centered: Vec[], iters = 80): Vec {
  const d = centered[0]?.length ?? 0;
  // Seed: 1, 1/2, 1/3, … normalized — deterministic and not axis-aligned.
  let v = normalize(Array.from({ length: d }, (_, i) => 1 / (i + 1)));
  for (let it = 0; it < iters; it++) {
    const next = new Array(d).fill(0);
    for (const row of centered) {
      const p = dot(row, v); // scalar projection onto current estimate
      for (let i = 0; i < d; i++) next[i] += p * row[i];
    }
    const m = norm(next);
    if (m === 0) return v;
    v = next.map((x) => x / m);
  }
  return v;
}

/**
 * Project embeddings down to 2D with a tiny PCA (top-2 principal components).
 * Returns one [x, y] per input row. Fewer than 2 rows collapse to the origin.
 */
export function pca2d(vectors: Vec[]): Array<[number, number]> {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0]];

  const mean = meanVector(vectors);
  const centered = vectors.map((v) => subtract(v, mean));

  const pc1 = topEigenvector(centered);
  // Deflate: strip the pc1 component from every row, then find pc2.
  const deflated = centered.map((row) => {
    const p = dot(row, pc1);
    return row.map((x, i) => x - p * pc1[i]);
  });
  const pc2 = topEigenvector(deflated);

  return centered.map((row) => [dot(row, pc1), dot(row, pc2)]);
}

/** Scale a set of 2D points into a [pad, size-pad] box for plotting. */
export function fitToBox(
  points: Array<[number, number]>,
  size: number,
  pad: number,
): Array<[number, number]> {
  if (points.length === 0) return [];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const inner = size - 2 * pad;
  return points.map(([x, y]) => [
    pad + ((x - minX) / spanX) * inner,
    // Flip Y so larger values sit toward the top in screen coordinates.
    pad + (1 - (y - minY) / spanY) * inner,
  ]);
}
