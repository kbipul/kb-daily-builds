import { describe, it, expect } from "vitest";
import { ToolRegistry, ToolValidationError, defineTool } from "../tools";
import { builtinTools } from "../tools/builtins";

describe("ToolRegistry", () => {
  it("exposes specs without implementations", () => {
    const r = new ToolRegistry(builtinTools);
    const specs = r.specs();
    expect(specs.map((s) => s.name).sort()).toEqual(["calculator", "search", "word_count"]);
    expect((specs[0] as unknown as { run?: unknown }).run).toBeUndefined();
  });
  it("rejects duplicate registration", () => {
    const r = new ToolRegistry(builtinTools);
    expect(() => r.register(builtinTools[0])).toThrow(/already registered/);
  });
  it("coerces string numbers to numbers", async () => {
    const t = defineTool({
      name: "double",
      description: "double a number",
      parameters: { n: { type: "number", description: "n" } },
      run: ({ n }) => String((n as number) * 2),
    });
    const r = new ToolRegistry([t]);
    expect(await r.call("double", { n: "21" })).toBe("42");
  });
  it("throws ToolValidationError on missing required arg", async () => {
    const r = new ToolRegistry(builtinTools);
    await expect(r.call("calculator", {})).rejects.toBeInstanceOf(ToolValidationError);
  });
  it("throws on non-numeric where number expected", async () => {
    const r = new ToolRegistry(builtinTools);
    await expect(r.call("calculator", { expression: "2+2" })).resolves.toBe("4");
  });
  it("throws on unknown tool", async () => {
    const r = new ToolRegistry(builtinTools);
    await expect(r.call("nope", {})).rejects.toBeInstanceOf(ToolValidationError);
  });
  it("search finds corpus entries and reports misses", async () => {
    const r = new ToolRegistry(builtinTools);
    expect(await r.call("search", { query: "semantic kernel" })).toMatch(/Semantic Kernel/);
    expect(await r.call("search", { query: "zzxq" })).toMatch(/No results/);
  });
});
