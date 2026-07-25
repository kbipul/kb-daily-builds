import { describe, it, expect } from "vitest";
import {
  analyze,
  detectDroppedHandoffs,
  detectDelegationLoops,
  detectContextLoss,
  detectDuplicatedWork,
  detectOutOfRoleTools,
  detectIdleAgents,
  detectNoFinalAnswer,
} from "../analyze";
import type { Trace, TraceEvent } from "../types";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("detectDroppedHandoffs", () => {
  it("flags a delegate with no matching return", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "s", to: "w", task: "T" },
    ];
    expect(codes(detectDroppedHandoffs(events))).toContain("dropped_handoff");
  });
  it("passes when the task is returned by the delegatee", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "s", to: "w", task: "T" },
      { t: 1, type: "return", from: "w", to: "s", task: "T" },
    ];
    expect(detectDroppedHandoffs(events)).toHaveLength(0);
  });
  it("does not accept a return from the wrong agent", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "s", to: "w", task: "T" },
      { t: 1, type: "return", from: "other", to: "s", task: "T" },
    ];
    expect(codes(detectDroppedHandoffs(events))).toContain("dropped_handoff");
  });
  it("flags a delegate without a task id as untracked", () => {
    const events: TraceEvent[] = [{ t: 0, type: "delegate", from: "s", to: "w" }];
    expect(codes(detectDroppedHandoffs(events))).toContain("untracked_delegation");
  });
});

describe("detectDelegationLoops", () => {
  it("detects a ping-pong on the same task", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "a", to: "b", task: "T" },
      { t: 1, type: "delegate", from: "b", to: "a", task: "T" },
    ];
    const issues = detectDelegationLoops(events);
    expect(codes(issues)).toContain("delegation_loop");
    expect(issues[0].task).toBe("T");
  });
  it("ignores a linear chain", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "a", to: "b", task: "T" },
      { t: 1, type: "delegate", from: "b", to: "c", task: "T" },
    ];
    expect(detectDelegationLoops(events)).toHaveLength(0);
  });
  it("does not conflate different tasks into a loop", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "a", to: "b", task: "T1" },
      { t: 1, type: "delegate", from: "b", to: "a", task: "T2" },
    ];
    expect(detectDelegationLoops(events)).toHaveLength(0);
  });
});

describe("detectContextLoss", () => {
  it("flags a required artifact that existed but was not passed", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "observation", agent: "r", produces: ["doc"] },
      { t: 1, type: "delegate", from: "s", to: "w", task: "T", requires: ["doc"] },
    ];
    expect(codes(detectContextLoss(events))).toContain("context_loss");
  });
  it("passes when the artifact is handed off", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "observation", agent: "r", produces: ["doc"] },
      { t: 1, type: "delegate", from: "s", to: "w", task: "T", requires: ["doc"], handoff: ["doc"] },
    ];
    expect(detectContextLoss(events)).toHaveLength(0);
  });
  it("flags a required artifact that never existed as missing", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "delegate", from: "s", to: "w", task: "T", requires: ["ghost"] },
    ];
    expect(codes(detectContextLoss(events))).toContain("missing_requirement");
  });
  it("does not flag when the receiver itself produced the artifact earlier", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "observation", agent: "w", produces: ["doc"] },
      { t: 1, type: "delegate", from: "s", to: "w", task: "T", requires: ["doc"] },
    ];
    // produced by the receiver (w) -> not a cross-agent loss; treated as missing (not yet passed)
    expect(codes(detectContextLoss(events))).not.toContain("context_loss");
  });
});

describe("detectDuplicatedWork", () => {
  it("flags identical tool + args", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "tool_call", agent: "a", tool: "search", args: { q: "x" } },
      { t: 1, type: "tool_call", agent: "b", tool: "search", args: { q: "x" } },
    ];
    const issues = detectDuplicatedWork(events);
    expect(codes(issues)).toContain("duplicated_work");
    expect(issues[0].events).toEqual([0, 1]);
  });
  it("is argument-order independent", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "tool_call", agent: "a", tool: "s", args: { a: 1, b: 2 } },
      { t: 1, type: "tool_call", agent: "b", tool: "s", args: { b: 2, a: 1 } },
    ];
    expect(codes(detectDuplicatedWork(events))).toContain("duplicated_work");
  });
  it("does not flag different args", () => {
    const events: TraceEvent[] = [
      { t: 0, type: "tool_call", agent: "a", tool: "s", args: { q: "x" } },
      { t: 1, type: "tool_call", agent: "b", tool: "s", args: { q: "y" } },
    ];
    expect(detectDuplicatedWork(events)).toHaveLength(0);
  });
});

describe("detectOutOfRoleTools", () => {
  const trace = (events: TraceEvent[]): Trace => ({
    agents: [{ id: "a", tools: ["search"] }, { id: "b" }],
    events,
  });
  it("flags a tool outside the declared set", () => {
    const issues = detectOutOfRoleTools(
      trace([{ t: 0, type: "tool_call", agent: "a", tool: "delete_db" }])
    );
    expect(codes(issues)).toContain("out_of_role_tool");
  });
  it("allows a declared tool", () => {
    expect(
      detectOutOfRoleTools(trace([{ t: 0, type: "tool_call", agent: "a", tool: "search" }]))
    ).toHaveLength(0);
  });
  it("makes no claim when the agent declares no toolset", () => {
    expect(
      detectOutOfRoleTools(trace([{ t: 0, type: "tool_call", agent: "b", tool: "anything" }]))
    ).toHaveLength(0);
  });
});

describe("detectIdleAgents", () => {
  it("flags a declared agent that never acts", () => {
    const trace: Trace = {
      agents: [{ id: "a" }, { id: "idle" }],
      events: [{ t: 0, type: "final", agent: "a" }],
    };
    expect(codes(detectIdleAgents(trace))).toContain("idle_agent");
  });
  it("does not flag agents that are addressed", () => {
    const trace: Trace = {
      agents: [{ id: "a" }, { id: "b" }],
      events: [{ t: 0, type: "delegate", from: "a", to: "b", task: "T" }],
    };
    expect(detectIdleAgents(trace)).toHaveLength(0);
  });
});

describe("detectNoFinalAnswer", () => {
  it("flags a run with no final event", () => {
    expect(
      codes(detectNoFinalAnswer([{ t: 0, type: "tool_call", agent: "a", tool: "x" }]))
    ).toContain("no_final_answer");
  });
  it("passes when a final exists", () => {
    expect(detectNoFinalAnswer([{ t: 0, type: "final", agent: "a" }])).toHaveLength(0);
  });
});

describe("analyze — scoring and stats", () => {
  it("scores a clean run 100 with no issues", () => {
    const trace: Trace = {
      agents: [{ id: "s" }, { id: "w" }],
      events: [
        { t: 0, type: "delegate", from: "s", to: "w", task: "T" },
        { t: 1, type: "return", from: "w", to: "s", task: "T" },
        { t: 2, type: "final", agent: "s" },
      ],
    };
    const r = analyze(trace);
    expect(r.issues).toHaveLength(0);
    expect(r.score).toBe(100);
    expect(r.stats.handoffs).toBe(2);
    expect(r.stats.tasks).toBe(1);
  });
  it("subtracts penalties and never goes below 0", () => {
    const trace: Trace = {
      agents: [{ id: "s" }, { id: "w" }],
      events: [
        { t: 0, type: "delegate", from: "s", to: "w", task: "A" },
        { t: 1, type: "delegate", from: "s", to: "w", task: "B" },
        { t: 2, type: "delegate", from: "s", to: "w", task: "C" },
        { t: 3, type: "delegate", from: "s", to: "w", task: "D" },
        { t: 4, type: "delegate", from: "s", to: "w", task: "E" },
        { t: 5, type: "delegate", from: "s", to: "w", task: "F" },
      ],
    };
    const r = analyze(trace);
    expect(r.score).toBe(0);
    expect(r.stats.critical).toBeGreaterThan(0);
  });
  it("orders issues by first involved event", () => {
    const trace: Trace = {
      agents: [{ id: "s" }, { id: "w" }],
      events: [
        { t: 0, type: "delegate", from: "s", to: "w", task: "T" },
        { t: 1, type: "return", from: "w", to: "s", task: "T" },
        { t: 2, type: "tool_call", agent: "w", tool: "x", args: { a: 1 } },
        { t: 3, type: "tool_call", agent: "w", tool: "x", args: { a: 1 } },
      ],
    };
    const r = analyze(trace);
    // no_final_answer + duplicated_work; duplicated first event (2) < no_final (3)
    expect(r.issues[0].code).toBe("duplicated_work");
  });
});
