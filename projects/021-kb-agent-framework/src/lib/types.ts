/**
 * kb-agent-framework — core type surface.
 *
 * The whole framework is model-agnostic: an Agent is a loop that asks a `Model`
 * what to do next, runs the tool the model asked for, feeds the observation
 * back, and repeats until the model returns a final answer (or a step budget is
 * exhausted). Everything below is the typed contract that makes that loop safe.
 */

/** A single turn in the conversation the model sees. */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Present on `tool` messages: which tool produced this observation. */
  name?: string;
}

/** JSON-ish primitive types a tool parameter may declare. */
export type ParamType = "string" | "number" | "boolean";

/** One declared parameter of a tool. */
export interface ParamSpec {
  type: ParamType;
  description: string;
  /** Defaults to true. Missing required args fail validation before the tool runs. */
  required?: boolean;
}

/** The public, model-facing description of a tool (name + typed params). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, ParamSpec>;
}

/** Arguments passed to a tool after validation/coercion. */
export type ToolArgs = Record<string, string | number | boolean>;

/** A tool = its spec + an implementation. */
export interface Tool extends ToolSpec {
  run(args: ToolArgs): Promise<string> | string;
}

/**
 * What a Model returns each step: either call a tool, or finish.
 * `thought` is optional reasoning surfaced to the tracer (ReAct-style).
 */
export type ModelResponse =
  | { kind: "tool_call"; thought?: string; tool: string; args: ToolArgs }
  | { kind: "final"; thought?: string; answer: string };

/** The pluggable "brain". Real ones call an LLM; the demo/tests use a scripted one. */
export interface Model {
  readonly name: string;
  /** Given the running transcript + the tools available, decide the next move. */
  decide(messages: Message[], tools: ToolSpec[]): Promise<ModelResponse> | ModelResponse;
}

/** Structured events the Tracer emits — this is what the live demo renders. */
export type TraceEvent =
  | { type: "start"; task: string; at: number }
  | { type: "thought"; step: number; text: string; at: number }
  | { type: "tool_call"; step: number; tool: string; args: ToolArgs; at: number }
  | { type: "observation"; step: number; tool: string; output: string; at: number }
  | { type: "tool_error"; step: number; tool: string; error: string; at: number }
  | { type: "final"; step: number; answer: string; at: number }
  | { type: "halted"; step: number; reason: string; at: number };

/** The result of a full agent run. */
export interface AgentResult {
  answer: string | null;
  /** true if the loop stopped on the step budget / an unrecoverable error. */
  halted: boolean;
  haltReason?: string;
  steps: number;
  trace: TraceEvent[];
}
