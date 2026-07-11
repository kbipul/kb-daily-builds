import { describe, it, expect } from "vitest";
import {
  dot,
  norm,
  normalize,
  cosine,
  similarityMatrix,
  meanVector,
  pca2d,
  fitToBox,
} from "../vec";

describe("dot & norm", () => {
  it("computes the dot product over the shared length", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it("norm is the Euclidean length", () => {
    expect(norm([3, 4])).toBe(5);
  });
});

describe("normalize", () => {
  it("returns a unit vector", () => {
    const u = normalize([3, 4]);
    expect(norm(u)).toBeCloseTo(1, 10);
    expect(u).toEqual([0.6, 0.8]);
  });
  it("leaves a zero vector untouched", () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
});

describe("cosine", () => {
  it("is 1 for identical direction, -1 for opposite, 0 for orthogonal", () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1, 10);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });
  it("is 0 when a vector has no magnitude", () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it("stays within [-1, 1] despite float drift", () => {
    const v = [0.1, 0.2, 0.3];
    expect(cosine(v, v)).toBeLessThanOrEqual(1);
    expect(cosine(v, v)).toBeGreaterThanOrEqual(-1);
  });
});

describe("similarityMatrix", () => {
  it("is symmetric with a unit diagonal", () => {
    const m = similarityMatrix([
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(m[0][0]).toBeCloseTo(1, 10);
    expect(m[1][1]).toBeCloseTo(1, 10);
    expect(m[0][1]).toBeCloseTo(m[1][0], 10);
    expect(m[0][2]).toBeCloseTo(Math.SQRT1_2, 6);
  });
});

describe("meanVector", () => {
  it("averages element-wise", () => {
    expect(meanVector([[0, 0], [2, 4], [4, 8]])).toEqual([2, 4]);
  });
  it("is empty for no input", () => {
    expect(meanVector([])).toEqual([]);
  });
});

describe("pca2d", () => {
  it("degenerate cases collapse to the origin", () => {
    expect(pca2d([])).toEqual([]);
    expect(pca2d([[1, 2, 3]])).toEqual([[0, 0]]);
  });

  it("puts the dominant spread on the first component", () => {
    // Points spread widely along dim 0, barely along dim 1.
    const pts = [
      [-10, 0.1],
      [-3, -0.1],
      [4, 0.05],
      [11, -0.05],
    ];
    const proj = pca2d(pts);
    // pc1 coordinate should preserve the original left-to-right ordering
    // (up to a global sign flip), so its magnitude spread dominates.
    const xs = proj.map((p) => p[0]);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const ys = proj.map((p) => p[1]);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    expect(spreadX).toBeGreaterThan(spreadY * 5);
  });

  it("keeps clustered inputs close in the projection", () => {
    const proj = pca2d([
      [10, 10, 10],
      [10.1, 9.9, 10.05],
      [-10, -10, -10],
    ]);
    const d01 = Math.hypot(proj[0][0] - proj[1][0], proj[0][1] - proj[1][1]);
    const d02 = Math.hypot(proj[0][0] - proj[2][0], proj[0][1] - proj[2][1]);
    expect(d01).toBeLessThan(d02);
  });
});

describe("fitToBox", () => {
  it("maps points into the padded box and flips Y", () => {
    const out = fitToBox(
      [
        [0, 0],
        [1, 1],
      ],
      100,
      10,
    );
    // x: min->pad, max->size-pad
    expect(out[0][0]).toBeCloseTo(10, 6);
    expect(out[1][0]).toBeCloseTo(90, 6);
    // y flipped: min y -> bottom (size-pad), max y -> top (pad)
    expect(out[0][1]).toBeCloseTo(90, 6);
    expect(out[1][1]).toBeCloseTo(10, 6);
  });
  it("handles a single point without dividing by zero", () => {
    const out = fitToBox([[5, 5]], 100, 10);
    expect(out[0].every((n) => Number.isFinite(n))).toBe(true);
  });
});
