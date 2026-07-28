import { describe, it, expect } from "vitest";
import { Tracer } from "../tracer";

describe("Tracer", () => {
  it("records events with injected timestamps", () => {
    const t = new Tracer(() => 123);
    t.emit({ type: "start", task: "x" });
    expect(t.all()).toEqual([{ type: "start", task: "x", at: 123 }]);
  });
  it("notifies subscribers and can unsubscribe", () => {
    const t = new Tracer(() => 0);
    const seen: string[] = [];
    const off = t.subscribe((e) => seen.push(e.type));
    t.emit({ type: "start", task: "a" });
    off();
    t.emit({ type: "final", step: 1, answer: "done" });
    expect(seen).toEqual(["start"]);
  });
});
