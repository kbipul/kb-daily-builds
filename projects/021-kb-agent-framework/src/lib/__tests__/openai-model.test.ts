import { describe, it, expect } from "vitest";
import { OpenAIModel, buildProtocolPrompt, parseEnvelope } from "../models/openai-model";
import type { ToolSpec } from "../types";

describe("openai-model helpers", () => {
  it("builds a protocol prompt listing tools", () => {
    const specs: ToolSpec[] = [
      { name: "calculator", description: "math", parameters: { expression: { type: "string", description: "" } } },
    ];
    const p = buildProtocolPrompt(specs);
    expect(p).toMatch(/calculator\(expression:string\)/);
    expect(p).toMatch(/single JSON object/);
  });
  it("parses a tool-call envelope", () => {
    const r = parseEnvelope('{"thought":"t","tool":"calculator","args":{"expression":"2+2"}}');
    expect(r).toMatchObject({ kind: "tool_call", tool: "calculator" });
  });
  it("parses a final envelope, ignoring surrounding prose", () => {
    const r = parseEnvelope('Sure! {"final":"the answer is 4"} hope that helps');
    expect(r).toMatchObject({ kind: "final", answer: "the answer is 4" });
  });
  it("falls back to treating unparseable output as a final answer", () => {
    const r = parseEnvelope("just plain text");
    expect(r).toEqual({ kind: "final", answer: "just plain text" });
  });
  it("requires an api key", () => {
    expect(() => new OpenAIModel({ apiKey: "", model: "x" })).toThrow(/apiKey/);
  });

  it("drives a full request with an injected fetch (no network)", async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"final":"42"}' } }] }),
        { status: 200 },
      )) as unknown as typeof fetch;
    const model = new OpenAIModel({ apiKey: "test", model: "gpt-x", fetchImpl: fakeFetch });
    const r = await model.decide([{ role: "user", content: "hi" }], []);
    expect(r).toMatchObject({ kind: "final", answer: "42" });
  });
});
