import { describe, it, expect } from "vitest";
import { RuleModel, extractExpression, extractQuoted } from "../models/rule-model";
import type { ToolSpec } from "../types";

const specs: ToolSpec[] = [
  { name: "calculator", description: "", parameters: { expression: { type: "string", description: "" } } },
  { name: "word_count", description: "", parameters: { text: { type: "string", description: "" } } },
  { name: "search", description: "", parameters: { query: { type: "string", description: "" } } },
];

describe("extractors", () => {
  it("pulls an arithmetic expression", () => {
    expect(extractExpression("what is (12 + 8) * 3 please")).toBe("(12 + 8) * 3");
    expect(extractExpression("no math here")).toBeNull();
    expect(extractExpression("just 42 alone")).toBeNull();
  });
  it("pulls a quoted phrase", () => {
    expect(extractQuoted("count words in 'agent tool loop'")).toBe("agent tool loop");
    expect(extractQuoted("nothing quoted")).toBeNull();
  });
});

describe("RuleModel", () => {
  it("plans a calculator call first, then finalizes", () => {
    const m = new RuleModel();
    const first = m.decide([{ role: "user", content: "what is 2 + 2?" }], specs);
    expect(first).toMatchObject({ kind: "tool_call", tool: "calculator" });
    const second = m.decide(
      [
        { role: "user", content: "what is 2 + 2?" },
        { role: "tool", name: "calculator", content: "4" },
      ],
      specs,
    );
    expect(second.kind).toBe("final");
  });
  it("routes topic questions to search", () => {
    const m = new RuleModel();
    const d = m.decide([{ role: "user", content: "tell me about semantic kernel" }], specs);
    expect(d).toMatchObject({ kind: "tool_call", tool: "search" });
  });
  it("answers directly when no tool applies", () => {
    const m = new RuleModel();
    const d = m.decide([{ role: "user", content: "hello there" }], specs);
    expect(d.kind).toBe("final");
  });
});
