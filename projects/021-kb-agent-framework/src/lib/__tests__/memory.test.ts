import { describe, it, expect } from "vitest";
import { Memory } from "../memory";

describe("Memory", () => {
  it("stores transcript in order", () => {
    const m = new Memory([{ role: "system", content: "sys" }]);
    m.add({ role: "user", content: "hi" });
    expect(m.transcript().map((x) => x.role)).toEqual(["system", "user"]);
  });
  it("caps transcript but keeps the system message", () => {
    const m = new Memory([{ role: "system", content: "sys" }]);
    for (let i = 0; i < 10; i++) m.add({ role: "user", content: `m${i}` });
    const t = m.transcript(3);
    expect(t[0].content).toBe("sys");
    expect(t[t.length - 1].content).toBe("m9");
    expect(t.length).toBeLessThanOrEqual(4);
  });
  it("scratchpad remembers and recalls", () => {
    const m = new Memory();
    m.remember("goal", "ship it");
    expect(m.recall("goal")).toBe("ship it");
    expect(m.keys()).toContain("goal");
    expect(m.recall("missing")).toBeUndefined();
  });
});
