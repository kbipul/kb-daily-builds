import type { Message, Model, ModelResponse, ToolSpec, ToolArgs } from "../types";

/**
 * A deterministic, rule-based "model" — NOT an LLM, and it never pretends to be
 * one. Its whole job is to exercise the Agent runtime with reproducible traces
 * so tests are stable and the browser demo needs zero API keys. It plans tool
 * calls from the task text, then composes a final answer from the observations
 * the real tools returned.
 *
 * Swap it for `OpenAIModel` (see ./openai-model.ts) to drive the exact same
 * Agent with a real frontier model.
 */
export class RuleModel implements Model {
  readonly name = "rule-model (deterministic)";

  decide(messages: Message[], tools: ToolSpec[]): ModelResponse {
    const task = firstUserTask(messages);
    const available = new Set(tools.map((t) => t.name));
    const plan = this.plan(task, available);
    const done = observations(messages);

    if (done.length < plan.length) {
      const next = plan[done.length];
      return {
        kind: "tool_call",
        thought: next.thought,
        tool: next.tool,
        args: next.args,
      };
    }

    return { kind: "final", thought: "I have everything I need.", answer: compose(task, done) };
  }

  private plan(task: string, available: Set<string>): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const lower = task.toLowerCase();

    const expr = extractExpression(task);
    if (expr && available.has("calculator")) {
      steps.push({
        thought: `The task contains arithmetic (${expr}); I'll use the calculator.`,
        tool: "calculator",
        args: { expression: expr },
      });
    }

    const quoted = extractQuoted(task);
    if (quoted && (lower.includes("word") || lower.includes("count")) && available.has("word_count")) {
      steps.push({
        thought: `It asks about words in "${quoted}"; I'll count them.`,
        tool: "word_count",
        args: { text: quoted },
      });
    }

    const topic = extractTopic(lower);
    if (topic && available.has("search")) {
      steps.push({
        thought: `I should look up "${topic}" in the knowledge base.`,
        tool: "search",
        args: { query: topic },
      });
    }

    return steps;
  }
}

interface PlannedStep {
  thought: string;
  tool: string;
  args: ToolArgs;
}

function firstUserTask(messages: Message[]): string {
  return messages.find((m) => m.role === "user")?.content ?? "";
}

function observations(messages: Message[]): Message[] {
  return messages.filter((m) => m.role === "tool");
}

/** Pull a contiguous arithmetic expression out of the task, if any. */
export function extractExpression(task: string): string | null {
  // Grab every run of arithmetic characters, then take the longest run that
  // actually looks like an expression (an operator between two operands).
  const runs = task.match(/[0-9.+\-*/%^()\s]+/g);
  if (!runs) return null;
  const candidates = runs
    .map((r) => balanceParens(r.replace(/\s+/g, " ").trim()))
    .filter((c) => /[\d.)]\s*[-+*/%^]\s*[-+]?[\d.(]/.test(c))
    .sort((a, b) => b.length - a.length);
  return candidates[0] ?? null;
}

/** Drop unmatched parentheses and trailing operators so the run is evaluable. */
function balanceParens(s: string): string {
  let open = 0;
  let out = "";
  for (const ch of s) {
    if (ch === "(") { open++; out += ch; }
    else if (ch === ")") { if (open === 0) continue; open--; out += ch; }
    else out += ch;
  }
  // Close any still-open groups, then trim dangling operators/space at the edges.
  out += ")".repeat(open);
  return out.replace(/^[\s)*/%^]+/, "").replace(/[\s+\-*/%^(]+$/, "").trim();
}

/** Pull the first single- or double-quoted phrase. */
export function extractQuoted(task: string): string | null {
  const m = task.match(/["'“”]([^"'“”]{1,120})["'“”]/);
  return m ? m[1].trim() : null;
}

const TOPICS = ["azure ai foundry", "semantic kernel", "react pattern", "agent memory"];
function extractTopic(lower: string): string | null {
  for (const t of TOPICS) {
    const words = t.split(" ");
    if (words.every((w) => lower.includes(w))) return t;
  }
  if (lower.includes("foundry")) return "azure ai foundry";
  if (lower.includes("kernel")) return "semantic kernel";
  return null;
}

function compose(task: string, done: Message[]): string {
  if (done.length === 0) {
    return `I couldn't find a tool to help with that, but here's my best answer: ${task}`;
  }
  const parts = done.map((o) => `${o.name}: ${o.content.replace(/\n/g, " ")}`);
  return `Done. ${parts.join(" · ")}`;
}
