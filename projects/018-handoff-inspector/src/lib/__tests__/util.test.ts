import { describe, it, expect } from "vitest";
import { canonical, findCycle, sortByTime } from "../util";

describe("canonical", () => {
  it("is key-order independent", () => {
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });
  it("is order independent deeply", () => {
    expect(canonical({ x: { p: 1, q: 2 }, y: [1, 2] })).toBe(
      canonical({ y: [1, 2], x: { q: 2, p: 1 } })
    );
  });
  it("distinguishes different values", () => {
    expect(canonical({ q: "a" })).not.toBe(canonical({ q: "b" }));
  });
  it("preserves array order (arrays are ordered)", () => {
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
  });
  it("handles null and primitives", () => {
    expect(canonical(null)).toBe("null");
    expect(canonical(42)).toBe("42");
  });
});

describe("findCycle", () => {
  it("returns null for a DAG", () => {
    expect(findCycle(["a", "b", "c"], [["a", "b"], ["b", "c"]])).toBeNull();
  });
  it("detects a two-node ping-pong", () => {
    const cycle = findCycle(["a", "b"], [["a", "b"], ["b", "a"]]);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThanOrEqual(3);
  });
  it("detects a three-node cycle", () => {
    const cycle = findCycle(
      ["a", "b", "c"],
      [["a", "b"], ["b", "c"], ["c", "a"]]
    );
    expect(cycle).not.toBeNull();
    expect(new Set(cycle!).size).toBe(3);
  });
  it("tolerates edges to unlisted nodes", () => {
    expect(findCycle(["a"], [["a", "b"], ["b", "a"]])).not.toBeNull();
  });
});

describe("sortByTime", () => {
  it("orders by t", () => {
    const out = sortByTime([{ t: 3 }, { t: 1 }, { t: 2 }]);
    expect(out.map((x) => x.t)).toEqual([1, 2, 3]);
  });
  it("is stable on ties", () => {
    const out = sortByTime([
      { t: 1, id: "a" },
      { t: 1, id: "b" },
      { t: 1, id: "c" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
