import type { Tool, ToolArgs, ToolSpec } from "./types";

/** Thrown when a model asks for a tool with arguments that don't type-check. */
export class ToolValidationError extends Error {}

/**
 * Holds the tools an agent may use and validates every call before it runs.
 * This is the framework's safety boundary: a model can *ask* for anything, but
 * only registered tools with well-typed args ever execute.
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    for (const t of tools) this.register(t);
  }

  register(tool: Tool): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Model-facing specs (no implementations) — what gets shown to the model. */
  specs(): ToolSpec[] {
    return [...this.tools.values()].map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  /**
   * Validate + coerce raw args against a tool's declared parameters, then run
   * it. Coercion is deliberate: models often emit numbers as strings.
   */
  async call(name: string, rawArgs: ToolArgs): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolValidationError(`Unknown tool "${name}"`);

    const clean: ToolArgs = {};
    for (const [key, spec] of Object.entries(tool.parameters)) {
      const present = rawArgs[key] !== undefined && rawArgs[key] !== null;
      if (!present) {
        if (spec.required === false) continue;
        throw new ToolValidationError(`Tool "${name}" missing required arg "${key}"`);
      }
      clean[key] = coerce(name, key, rawArgs[key], spec.type);
    }
    return await tool.run(clean);
  }
}

function coerce(
  tool: string,
  key: string,
  value: unknown,
  type: "string" | "number" | "boolean",
): string | number | boolean {
  switch (type) {
    case "string":
      return String(value);
    case "number": {
      const n = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(n)) {
        throw new ToolValidationError(`Tool "${tool}" arg "${key}" must be a number, got "${value}"`);
      }
      return n;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      const s = String(value).trim().toLowerCase();
      if (s === "true" || s === "1") return true;
      if (s === "false" || s === "0") return false;
      throw new ToolValidationError(`Tool "${tool}" arg "${key}" must be a boolean, got "${value}"`);
    }
  }
}

/** Ergonomic helper for defining a typed tool inline. */
export function defineTool(tool: Tool): Tool {
  return tool;
}
