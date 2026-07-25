// Data model for a multi-agent orchestration trace and its analysis.
//
// A trace is a flat, time-ordered event log produced by an orchestration
// framework (a supervisor delegating to sub-agents, agents calling tools,
// returning results). The inspector reasons ONLY about what the trace
// explicitly records — it never infers intent or meaning.

export interface Agent {
  /** Unique agent id, e.g. "supervisor", "researcher". */
  id: string;
  /** Optional human role label, e.g. "orchestrator", "writer". */
  role?: string;
  /** Declared toolset. If present, tool calls outside it are flagged. */
  tools?: string[];
}

export type EventType =
  | "delegate" // from -> to: hand a task to another agent
  | "return" // from -> to: hand a result back
  | "tool_call" // agent invokes a tool
  | "observation" // agent records a tool result / fact (may `produces` artifacts)
  | "message" // free-form agent-to-agent message
  | "final"; // agent (usually supervisor) emits the consolidated answer

export interface TraceEvent {
  /** Logical timestep. Integer, used to order the run. */
  t: number;
  type: EventType;
  /** Source agent (delegate / return / message). */
  from?: string;
  /** Target agent (delegate / return / message). */
  to?: string;
  /** Acting agent (tool_call / observation / final). */
  agent?: string;
  /** Task id this event belongs to (delegate / return / tool_call...). */
  task?: string;
  /** Tool name (tool_call). */
  tool?: string;
  /** Tool arguments (tool_call). Compared by canonical value for dedupe. */
  args?: unknown;
  /** Free text (message). */
  message?: string;
  /** Free text (observation / final). */
  content?: string;
  /** Artifact ids the delegated task needs to succeed (delegate). */
  requires?: string[];
  /** Artifact ids actually passed along in this handoff (delegate / return). */
  handoff?: string[];
  /** Artifact ids produced here (observation / return). */
  produces?: string[];
}

export interface Trace {
  title?: string;
  agents: Agent[];
  events: TraceEvent[];
}

export type Severity = "critical" | "warning" | "info";

export interface Issue {
  /** Stable machine code, e.g. "dropped_handoff". */
  code: string;
  title: string;
  severity: Severity;
  /** Human-readable, specific explanation. */
  detail: string;
  /** Agent ids involved. */
  agents: string[];
  /** Indices into the (sorted) events array. */
  events: number[];
  /** Task id, when the issue is task-scoped. */
  task?: string;
}

export interface AnalysisStats {
  agents: number;
  events: number;
  tasks: number;
  handoffs: number;
  toolCalls: number;
  critical: number;
  warning: number;
  info: number;
}

export interface AnalysisResult {
  /** Events sorted by t (stable), as analyzed. */
  events: TraceEvent[];
  issues: Issue[];
  /** 0-100 coordination-health score. */
  score: number;
  stats: AnalysisStats;
}

export interface ParseResult {
  trace?: Trace;
  errors: string[];
}
