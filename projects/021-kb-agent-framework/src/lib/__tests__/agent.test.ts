import { describe, it, expect } from "vitest";
import { Agent } from "../agent";
import { ToolRegistry } from "../tools";
import { RuleModel } from "../models/rule-model";
import { builtinTools } from "../tools/builtins";
import type { Message, Model, ModelResponse, ToolSpec } from "../types";

function makeAgent(model: Model, maxSteps = 6) {
  let clock = 0;
  return new Agent({
    model,
    tools: new ToolRegistry(builtinTools),
    maxSteps,
    now: () => clock++,
  });
}

describe("Agent loop", () => {
  it("runs a single-tool task to a final answer", async () => {
    const r = await makeAgent(new RuleModel()).run("what is (5 + 5) * 2?");
    expect(r.halted).toBe(false);
    expect(r.trace.some((e) => e.type === "tool_call" && e.tool === "calculator")).toBe(true);
    expect(r.trace.some((e) => e.type === "observation" && e.output === "20")).toBe(true);
    expect(r.answer).toMatch(/20/);
  });

  it("chains two tools for a compound task", async () => {
    const r = await makeAgent(new RuleModel()).run(
      "What is 6 * 7, and how many words are in 'a b c'?",
    );
    const calls = r.trace.filter((e) => e.type === "tool_call").map((e: any) => e.tool);
    expect(calls).toEqual(["calculator", "word_count"]);
    expect(r.answer).toMatch(/42/);
  });

  it("halts on the step budget instead of looping forever", async () => {
    // A pathological model that never finalizes.
    const spinner: Model = {
      name: "spinner",
      decide: (): ModelResponse => ({ kind: "tool_call", tool: "calculator", args: { expression: "1+1" } }),
    };
    const r = await makeAgent(spinner, 3).run("spin");
    expect(r.halted).toBe(true);
    expect(r.steps).toBe(3);
    expect(r.haltReason).toMatch(/step budget/);
  });

  it("recovers from a tool error by feeding it back", async () => {
    // Model asks for a bad expression once, then finalizes.
    let called = 0;
    const model: Model = {
      name: "flaky",
      decide: (msgs: Message[], _tools: ToolSpec[]): ModelResponse => {
        if (called++ === 0) return { kind: "tool_call", tool: "calculator", args: { expression: "1/0" } };
        const err = msgs.find((m) => m.role === "tool")?.content ?? "";
        return { kind: "final", answer: `handled: ${err}` };
      },
    };
    const r = await makeAgent(model).run("divide by zero");
    expect(r.trace.some((e) => e.type === "tool_error")).toBe(true);
    expect(r.answer).toMatch(/division by zero/);
    expect(r.halted).toBe(false);
  });

  it("emits a start event and an ordered trace", async () => {
    const r = await makeAgent(new RuleModel()).run("what is 1 + 1?");
    expect(r.trace[0].type).toBe("start");
    const ats = r.trace.map((e) => e.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
  });
});
