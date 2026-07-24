import { describe, it, expect } from "vitest";
import { parseTrace } from "../parse";

describe("parseTrace", () => {
  it("parses a single Thought/Action/Observation step", () => {
    const t = parseTrace(`Thought: need weather
Action: weather
Action Input: {"city":"Paris"}
Observation: 14C rain`);
    expect(t.steps).toHaveLength(1);
    expect(t.steps[0]).toMatchObject({
      index: 1,
      thought: "need weather",
      action: "weather",
      actionInput: '{"city":"Paris"}',
      observation: "14C rain",
      observationIsError: false,
    });
    expect(t.finalAnswer).toBeNull();
  });

  it("splits multiple steps on each Thought", () => {
    const t = parseTrace(`Thought: a
Action: search
Observation: r1
Thought: b
Action: weather
Observation: r2`);
    expect(t.steps.map((s) => s.index)).toEqual([1, 2]);
    expect(t.steps[1].action).toBe("weather");
  });

  it("captures the final answer and closes the last step", () => {
    const t = parseTrace(`Thought: done
Action: weather
Observation: 30C
Final Answer: it is 30C`);
    expect(t.steps).toHaveLength(1);
    expect(t.finalAnswer).toBe("it is 30C");
  });

  it("marks error observations", () => {
    const t = parseTrace(`Thought: x
Action: calculator
Action Input: (1+)/0
Observation: Error: invalid expression`);
    expect(t.steps[0].observationIsError).toBe(true);
  });

  it("supports multi-line observations", () => {
    const t = parseTrace(`Thought: x
Action: search
Observation: line one
line two
line three
Final Answer: ok`);
    expect(t.steps[0].observation).toBe("line one\nline two\nline three");
  });

  it("is case-insensitive on labels", () => {
    const t = parseTrace(`thought: x\naction: search\nOBSERVATION: y`);
    expect(t.steps[0].action).toBe("search");
    expect(t.steps[0].observation).toBe("y");
  });

  it("records an issue when an action has no observation", () => {
    const t = parseTrace(`Thought: x\nAction: search\nAction Input: q`);
    expect(t.parseIssues.join(" ")).toMatch(/no Observation/i);
  });

  it("reports an issue for input with no ReAct labels", () => {
    const t = parseTrace("just some prose without labels");
    expect(t.steps).toHaveLength(0);
    expect(t.parseIssues.length).toBeGreaterThan(0);
  });

  it("handles CRLF line endings", () => {
    const t = parseTrace("Thought: x\r\nAction: search\r\nObservation: y");
    expect(t.steps[0].observation).toBe("y");
  });

  it("collects a multi-line final answer", () => {
    const t = parseTrace(`Final Answer: line1
line2`);
    expect(t.finalAnswer).toBe("line1\nline2");
  });
});
