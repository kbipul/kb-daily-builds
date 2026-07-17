/** Blast Radius — shared domain types. */

/** How a destroyed path can (or cannot) be brought back. */
export type Recovery =
  | "regenerable" // a build command rebuilds it byte-for-byte enough (node_modules, dist)
  | "committed" // in git history, unmodified — `git checkout` restores it
  | "partial" // in git history but with uncommitted edits — the edits are gone
  | "gone" // no copy exists anywhere
  | "gone-secret"; // gone AND it was a credential

export type Severity = "safe" | "caution" | "destructive" | "catastrophic";

export interface VNode {
  name: string;
  type: "file" | "dir";
  /** Size in bytes. Directories report the sum of their children. */
  size?: number;
  children?: VNode[];
  /** Present in the last git commit. */
  gitTracked?: boolean;
  /** Matched by .gitignore — git will never restore it. */
  gitIgnored?: boolean;
  /** A build step recreates it (node_modules, dist, .cache). */
  regenerable?: boolean;
  /** Working-tree edits not yet committed. */
  modified?: boolean;
  /** Holds credentials. */
  secret?: boolean;
}

/** A single filesystem entry the simulated command would remove or overwrite. */
export interface Casualty {
  path: string;
  type: "file" | "dir";
  size: number;
  recovery: Recovery;
  /** Why this recovery verdict — shown verbatim in the UI. */
  reason: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface Simulation {
  /** The command exactly as the user typed it. */
  input: string;
  /** The command after variable expansion — where the horror usually lives. */
  expanded: string;
  /** True when expansion changed the command's meaning. */
  expansionChanged: boolean;
  severity: Severity;
  /** One-line verdict for the headline. */
  verdict: string;
  casualties: Casualty[];
  findings: Finding[];
  /** A safer way to express the same intent, or null when the command is already safe. */
  rewrite: string | null;
  rewriteNote: string | null;
  /** Paths touched that live outside the project root. */
  escapesRoot: boolean;
  bytesDestroyed: number;
  /** True when the simulator did not recognise the command at all. */
  unknown: boolean;
}

export const SEVERITY_RANK: Record<Severity, number> = {
  safe: 0,
  caution: 1,
  destructive: 2,
  catastrophic: 3,
};

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}
