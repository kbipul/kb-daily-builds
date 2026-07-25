import { describe, it, expect } from "vitest";
import { parseTrace } from "../parse";

const ok = (trace: unknown) => JSON.stringify(trace);

describe("parseTrace — errors", () => {
  it("rejects empty input", () => {
    expect(parseTrace("   ").errors[0]).toMatch(/empty/i);
  });
  it("rejects invalid JSON", () => {
    expect(parseTrace("{nope").errors[0]).toMatch(/not valid json/i);
  });
  it("requires agents and events arrays", () => {
    const r = parseTrace(JSON.stringify({ foo: 1 }));
    expect(r.errors.join(" ")).toMatch(/agents/);
    expect(r.errors.join(" ")).toMatch(/events/);
  });
  it("rejects duplicate agent ids", () => {
    const r = parseTrace(
      ok({ agents: [{ id: "a" }, { id: "a" }], events: [{ t: 0, type: "final", agent: "a" }] })
    );
    expect(r.errors.join(" ")).toMatch(/duplicate/i);
  });
  it("rejects unknown agent references", () => {
    const r = parseTrace(
      ok({ agents: [{ id: "a" }], events: [{ t: 0, type: "delegate", from: "a", to: "ghost" }] })
    );
    expect(r.errors.join(" ")).toMatch(/unknown agent "ghost"/);
  });
  it("rejects invalid event type", () => {
    const r = parseTrace(
      ok({ agents: [{ id: "a" }], events: [{ t: 0, type: "wat", agent: "a" }] })
    );
    expect(r.errors.join(" ")).toMatch(/invalid "type"/);
  });
  it("rejects a non-numeric t", () => {
    const r = parseTrace(
      ok({ agents: [{ id: "a" }], events: [{ t: "x", type: "final", agent: "a" }] })
    );
    expect(r.errors.join(" ")).toMatch(/numeric "t"/);
  });
});

describe("parseTrace — success", () => {
  it("parses a minimal valid trace", () => {
    const r = parseTrace(
      ok({ agents: [{ id: "a" }], events: [{ t: 0, type: "final", agent: "a", content: "done" }] })
    );
    expect(r.errors).toEqual([]);
    expect(r.trace!.agents).toHaveLength(1);
    expect(r.trace!.events[0].content).toBe("done");
  });
  it("sorts events by t", () => {
    const r = parseTrace(
      ok({
        agents: [{ id: "a" }],
        events: [
          { t: 2, type: "final", agent: "a" },
          { t: 0, type: "tool_call", agent: "a", tool: "x" },
          { t: 1, type: "observation", agent: "a" },
        ],
      })
    );
    expect(r.trace!.events.map((e) => e.t)).toEqual([0, 1, 2]);
  });
  it("keeps typed optional fields", () => {
    const r = parseTrace(
      ok({
        agents: [{ id: "s", tools: ["delegate"] }, { id: "w" }],
        events: [
          { t: 0, type: "delegate", from: "s", to: "w", task: "T", requires: ["x"], handoff: ["x"] },
        ],
      })
    );
    const ev = r.trace!.events[0];
    expect(ev.requires).toEqual(["x"]);
    expect(ev.handoff).toEqual(["x"]);
    expect(r.trace!.agents[0].tools).toEqual(["delegate"]);
  });
  it("preserves the title", () => {
    const r = parseTrace(
      ok({ title: "Run 7", agents: [{ id: "a" }], events: [{ t: 0, type: "final", agent: "a" }] })
    );
    expect(r.trace!.title).toBe("Run 7");
  });
});
