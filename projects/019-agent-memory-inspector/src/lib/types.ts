// Core domain types for Agent Memory Inspector.
//
// A "memory store" is what a production agent carries between runs. Microsoft
// Foundry's Agent Service (hosted agents, GA July 2026) exposes exactly three
// memory scopes — procedural, user, session — each with a time-to-live. We
// model that shape so the inspector reasons about the real primitive.

export type Scope = "procedural" | "user" | "session";

export const SCOPES: Scope[] = ["procedural", "user", "session"];

/** A single stored memory, as the agent persisted it. */
export interface MemoryRecord {
  id: string;
  scope: Scope;
  content: string;
  /** ISO-8601 creation time. Optional — its absence is itself a finding. */
  createdAt?: string;
  /** Seconds-to-live from createdAt. Foundry-style TTL. */
  ttlSeconds?: number;
  /** Explicit expiry (ISO-8601). Takes precedence over ttlSeconds if both set. */
  expiresAt?: string;
  /** Where this memory came from (conversation id, tool, etc.). */
  source?: string;
  tags?: string[];
}

/** A record after normalization: expiry resolved to an absolute epoch (ms). */
export interface NormalizedMemory extends MemoryRecord {
  createdAtMs: number | null;
  expiresAtMs: number | null;
}

export type Severity = "high" | "medium" | "low";

export type DetectorId =
  | "expired"
  | "stale"
  | "scope-durable-in-session"
  | "scope-ephemeral-in-user"
  | "contradiction"
  | "pii"
  | "duplicate"
  | "missing-provenance"
  | "unbounded-growth";

export interface Finding {
  detector: DetectorId;
  severity: Severity;
  /** Memory ids this finding implicates (1+). */
  memoryIds: string[];
  /** Human-readable, cites the rule that fired. Never claims to understand meaning. */
  message: string;
}

export interface ParseResult {
  records: MemoryRecord[];
  /** Non-fatal problems (skipped rows, coerced fields). */
  errors: string[];
}

export interface ScopeStat {
  scope: Scope;
  count: number;
  /** Rough token estimate across the scope's contents. */
  tokens: number;
  expired: number;
}

export interface Grade {
  score: number; // 0..100
  letter: "A" | "B" | "C" | "D" | "F";
}

export interface Report {
  now: number; // epoch ms the analysis was run against
  total: number;
  findings: Finding[];
  countsBySeverity: Record<Severity, number>;
  countsByDetector: Record<DetectorId, number>;
  scopes: ScopeStat[];
  grade: Grade;
}

/** One memory in a retrieval-simulation result, with its health annotations. */
export interface RetrievalHit {
  id: string;
  score: number;
  memory: NormalizedMemory;
  /** Findings from the report that touch this memory (so we can flag poisoned recall). */
  flags: Finding[];
}

export interface RetrievalResult {
  query: string;
  hits: RetrievalHit[];
  /** Consequence-level warnings about what the agent would actually recall. */
  warnings: string[];
}
