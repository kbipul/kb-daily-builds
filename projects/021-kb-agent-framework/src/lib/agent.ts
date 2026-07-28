import { Memory } from "./memory";
import { ToolRegistry, ToolValidationError } from "./tools";
import { Tracer } from "./tracer";
import type { AgentResult, Message, Model } from "./types";

export interface AgentOptions {
  model: Model;
  tools: ToolRegistry;
  /** Prepended as the system message. A sensible default is provided. */
  systemPrompt?: string;
  /** Hard cap on reasoning steps — the loop guard. Default 8. */
  maxSteps?: number;
  /** Seed memory (e.g. prior conversation). */
  memory?: Memory;
  /** Injectable clock for deterministic traces in tests. */
  now?: () => number;
}

const DEFAULT_SYSTEM =
  "You are a helpful agent. Think step by step. Use a tool when it helps, " +
  "otherwise answer directly. Stop as soon as you can give a final answer.";

/**
 * The runtime. Owns the ReAct-style loop:
 *
 *   task ─▶ model.decide() ─▶ tool_call ─▶ registry.call() ─▶ observation ─┐
 *              ▲                                                            │
 *              └──────────────── feed observation back ◀────────────────────┘
 *                        (until `final` or maxSteps is hit)
 *
 * Every transition is emitted to the Tracer, so the same run drives tests,
 * a CLI, or the live browser demo without change.
 */
export class Agent {
  readonly tracer: Tracer;
  private readonly model: Model;
  private readonly tools: ToolRegistry;
  private readonly systemPrompt: string;
  private readonly maxSteps: number;
  private readonly memory: Memory;
  private readonly now: () => number;

  constructor(opts: AgentOptions) {
    this.model = opts.model;
    this.tools = opts.tools;
    this.systemPrompt = opts.systemPrompt ?? DEFAULT_SYSTEM;
    this.maxSteps = opts.maxSteps ?? 8;
    this.now = opts.now ?? (() => Date.now());
    this.tracer = new Tracer(this.now);
    this.memory =
      opts.memory ?? new Memory([{ role: "system", content: this.systemPrompt }]);
  }

  async run(task: string): Promise<AgentResult> {
    this.tracer.emit({ type: "start", task });
    this.memory.add({ role: "user", content: task });

    for (let step = 1; step <= this.maxSteps; step++) {
      const decision = await this.model.decide(this.memory.transcript(), this.tools.specs());

      if (decision.thought) {
        this.tracer.emit({ type: "thought", step, text: decision.thought });
      }

      if (decision.kind === "final") {
        this.memory.add({ role: "assistant", content: decision.answer });
        this.tracer.emit({ type: "final", step, answer: decision.answer });
        return { answer: decision.answer, halted: false, steps: step, trace: this.tracer.all() };
      }

      // decision.kind === "tool_call"
      this.tracer.emit({ type: "tool_call", step, tool: decision.tool, args: decision.args });
      const assistantNote = decision.thought ? `${decision.thought}\n` : "";
      this.memory.add({
        role: "assistant",
        content: `${assistantNote}[call ${decision.tool}(${JSON.stringify(decision.args)})]`,
      });

      let observation: string;
      try {
        observation = await this.tools.call(decision.tool, decision.args);
        this.tracer.emit({ type: "observation", step, tool: decision.tool, output: observation });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Validation / tool errors are recoverable: feed them back so the model
        // can correct course rather than crashing the whole run.
        observation = `ERROR: ${message}`;
        this.tracer.emit({ type: "tool_error", step, tool: decision.tool, error: message });
        if (!(err instanceof ToolValidationError) && !(err instanceof Error)) throw err;
      }

      this.memory.add({ role: "tool", name: decision.tool, content: observation });
    }

    const reason = `step budget of ${this.maxSteps} exhausted without a final answer`;
    this.tracer.emit({ type: "halted", step: this.maxSteps, reason });
    return {
      answer: null,
      halted: true,
      haltReason: reason,
      steps: this.maxSteps,
      trace: this.tracer.all(),
    };
  }

  /** Expose memory for inspection (e.g. a CLI dumping the transcript). */
  get transcript(): Message[] {
    return this.memory.transcript();
  }
}
