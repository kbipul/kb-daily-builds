// Core data model for a ReAct agent trace and its loop-health analysis.

/** One tool the agent was told it may call. */
export interface ToolSpec {
  name: string;
  description?: string;
}

/** A single Thought -> Action -> Observation step of the ReAct loop. */
export interface Step {
  /** 1-based index in the trace. */
  index: number;
  thought: string;
  /** Tool name the agent chose to call, or null if the step had no action. */
  action: string | null;
  /** Raw action input text (JSON or plain), as the agent wrote it. */
  actionInput: string;
  /** Observation returned to the agent, or null if none was recorded. */
  observation: string | null;
  /** True when the observation looks like a tool error/failure. */
  observationIsError: boolean;
}

export interface ParsedTrace {
  steps: Step[];
  /** The agent's Final Answer, or null if the loop never produced one. */
  finalAnswer: string | null;
  /** Non-fatal parsing notes (e.g. an Action with no Observation). */
  parseIssues: string[];
}

export type Severity = "critical" | "warning" | "info";

export interface Finding {
  /** Stable machine code, e.g. "stuck-loop". */
  code: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Step indices this finding is anchored to (for the timeline UI). */
  steps: number[];
}

export interface HealthReport {
  findings: Finding[];
  /** 0-100; 100 = clean loop. */
  score: number;
  /** A..F derived from score. */
  grade: string;
  stepCount: number;
  finishedCleanly: boolean;
}
