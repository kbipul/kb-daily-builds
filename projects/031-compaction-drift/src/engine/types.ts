/**
 * Compaction Drift — domain model.
 *
 * The subject is a long-running agent session whose context is managed by a
 * harness rather than by the application. The question this models is not
 * "does it fit" — that is a packing problem, solved at one instant — but
 * "is it still there", which is a survival problem resolved over many
 * compaction rounds.
 */

/** Who put a piece of information into the transcript. */
export type ItemRole = 'system' | 'user' | 'assistant' | 'tool_result' | 'subagent_report';

/**
 * What kind of thing the information is. This matters because a compaction
 * pass that optimises for task continuation treats these very differently:
 * it has to keep enough task state to carry on, and a one-clause exception
 * mentioned once early is the archetypal detail a summary drops.
 */
export type FactKind =
  | 'constraint'
  | 'exception'
  | 'correction'
  | 'scope'
  | 'task-state';

/** A single piece of information that later behaviour depends on. */
export interface Fact {
  id: string;
  label: string;
  kind: FactKind;
  /** Which role's message carried it. Some policies protect some roles. */
  role: ItemRole;
  /** 1-based turn at which it entered the transcript. */
  statedAtTurn: number;
  /** Turns at which the operator repeated it verbatim. */
  restatedAtTurns: number[];
  /**
   * Whether the fact was also written to durable storage outside the
   * transcript (a workspace file, AGENTS.md, a memory store). Published
   * guidance for long sessions is to externalise durable state early rather
   * than trust conversation history to hold it.
   */
  externalised: boolean;
}

/** An action whose correctness depends on one or more facts still being present. */
export interface GovernedAction {
  id: string;
  label: string;
  /** 1-based turn at which the agent takes it. */
  atTurn: number;
  /** Fact ids that must be in context for this action to be taken correctly. */
  governedBy: string[];
  /** Main thread, or a delegated subagent that keeps its own context. */
  executor: 'main' | 'subagent';
  /** What goes wrong when the governing fact is not present. */
  consequence: string;
}

/** A scenario the visitor can load and then edit through the levers. */
export interface SessionSpec {
  id: string;
  name: string;
  blurb: string;
  turns: number;
  /** Average tokens added to the transcript per turn. */
  tokensPerTurn: number;
  /** Size of the pinned system / developer instructions. */
  systemTokens: number;
  facts: Fact[];
  actions: GovernedAction[];
}

/**
 * A family of compaction behaviour. Every one is a documented technique in a
 * public agent harness or framework; see `source` / `url` in `policies.ts`.
 * None is a claim about the internals of any specific managed service, which
 * are not published.
 */
export type PolicyId =
  | 'none'
  | 'sliding-window'
  | 'recursive-summary'
  | 'pinned-prefix'
  | 'user-verbatim'
  | 'externalised';

export interface Policy {
  id: PolicyId;
  name: string;
  mechanism: string;
  source: string;
  url: string;
  /** If false, the session errors when the transcript exceeds the window. */
  compacts: boolean;
  /** Older material is summarised (lossy) rather than discarded (total loss). */
  summarises: boolean;
  keepsSystemVerbatim: boolean;
  keepsUserVerbatim: boolean;
  /** Facts written to durable storage are re-read after each compaction. */
  rehydratesExternalised: boolean;
}

/** How intact a fact is at a given turn. */
export type FactState = 'verbatim' | 'degraded' | 'lost' | 'not-yet-stated';

export interface FactTrace {
  factId: string;
  /** Fidelity in [0,1] at each turn; index 0 = turn 1. */
  fidelityByTurn: number[];
  stateByTurn: FactState[];
  /** First turn at which the fact fell below the actionable threshold. */
  lostAtTurn: number | null;
  compactionsSurvived: number;
}

export type ActionVerdict = 'governed' | 'weakly-governed' | 'ungoverned' | 'not-reached';

export interface FactStateAtAction {
  factId: string;
  state: FactState;
  fidelity: number;
  reason: string;
}

export interface ActionOutcome {
  actionId: string;
  verdict: ActionVerdict;
  factStates: FactStateAtAction[];
}

export interface Levers {
  policy: PolicyId;
  /** Model context window in tokens. */
  contextLimitTokens: number;
  turns: number;
  tokensPerTurn: number;
  /**
   * Delegate the subagent-executed actions. Each subagent keeps its own
   * context, so main-thread facts do not reach it unless forwarded.
   */
  delegateToSubagents: boolean;
  forwardConstraintsToSubagents: boolean;
  /** Re-state every governing fact every N turns. 0 = never. */
  restateEveryNTurns: number;
}

export interface SimulationResult {
  compactionTurns: number[];
  /** Non-null when the policy does not compact and the window overflows. */
  overflowTurn: number | null;
  traces: FactTrace[];
  outcomes: ActionOutcome[];
  /** Transcript size in tokens at each turn, after any compaction that turn. */
  contextTokensByTurn: number[];
  ungovernedActions: number;
  weaklyGovernedActions: number;
  reachedActions: number;
  /** Earliest turn at which any rule-like fact became lost. */
  firstLossTurn: number | null;
}
