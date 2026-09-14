/**
 * Shared types for the Harness Tell engine.
 *
 * The engine is a port of two code paths in `huggingface_hub` (Python) as they
 * stand at commit 129bbb5 (2026-09-11, the `main` that shipped as v1.31.0 on
 * 2026-09-10):
 *   - src/huggingface_hub/utils/_detect_agent.py   (detect_agent, _env_vars_match, _load_registry)
 *   - src/huggingface_hub/utils/_headers.py        (_http_user_agent, _deduplicate_user_agent)
 * plus the legacy hardcoded detector from commit 90a9805 (2026-04-20) so the
 * two eras can be compared side by side.
 */

/** Env var value pattern, as documented in `agent-harnesses.ts` and `_env_vars_match`. */
export type Pattern = string; // "*" | "<exact value>" | "<prefix>*" (registry-only, see detect.ts)

export interface HarnessEntry {
  id: string;
  prettyLabel?: string;
  repoUrl?: string;
  docsUrl?: string;
  description?: string;
  /** Any entry matching is enough. Absent = only detectable via the standard vars. */
  envVars?: Record<string, Pattern>;
}

/**
 * The registry, as the Python client consumes it. Order of `harnesses` is the
 * detection priority — first match wins — so it is kept as an array here rather
 * than an object, which is how the wire format (a JSON object) also preserves it.
 */
export interface Registry {
  standardEnvVars: string[];
  harnesses: HarnessEntry[];
  /** Where this registry came from — shown to the visitor, never inferred. */
  source: string;
}

export type Env = Record<string, string>;

export type MatchKind = 'envVar' | 'standardVar' | 'standardUnknown';

export interface Match {
  kind: MatchKind;
  id: string; // harness id that was returned ("unknown" for standardUnknown)
  variable: string;
  pattern?: Pattern; // for envVar matches
  value: string;
  /** Index of the harness in registry order (envVar / standardVar matches). */
  priority?: number;
}

export interface DetectResult {
  id: string | null;
  match: Match | null;
  /**
   * Registry-declared patterns that the shipped Python client cannot evaluate
   * (`<prefix>*`). Recorded so the drift is visible, never silently dropped.
   */
  ignoredPatterns: { id: string; variable: string; pattern: Pattern }[];
  /** Other harnesses whose env vars ALSO matched but lost on priority. */
  alsoMatched: { id: string; variable: string }[];
}

/** What the visitor's process does — decides which code path calls the detector. */
export type EntryKind = 'sdk' | 'cli' | 'hf-env';

export interface KillSwitches {
  /** HF_HUB_DISABLE_TELEMETRY / DISABLE_TELEMETRY / DO_NOT_TRACK */
  disableTelemetry: boolean;
  /** HF_HUB_OFFLINE / TRANSFORMERS_OFFLINE */
  offline: boolean;
  /** HF_HUB_USER_AGENT_ORIGIN (appended as `origin/<value>`) */
  origin: string;
  /** NO_COLOR (only affects the CLI colour path) */
  noColor: boolean;
}

export type CacheState = 'none' | 'fresh' | 'stale';

export interface RuntimeFacts {
  hfHubVersion: string; // e.g. "1.31.0"
  pythonVersion: string; // e.g. "3.12.4"
  torchVersion: string | null; // null = torch not importable
  libraryName: string | null; // e.g. "transformers"
  libraryVersion: string | null;
  cache: CacheState;
  /** Whether a GET to the Hub can succeed (false = proxy blocks huggingface.co, etc.). */
  hubReachable: boolean;
}

export type RegistrySource = 'cache-fresh' | 'fetched' | 'cache-stale' | 'empty';

export interface RegistryResolution {
  source: RegistrySource;
  /** True when the client performs a GET {ENDPOINT}/api/agent-harnesses. */
  fetchAttempted: boolean;
  fetchSucceeded: boolean;
  /** True when the resolved registry is the empty one → detection reports no agent. */
  detectionDisabled: boolean;
}

export interface Step {
  n: number;
  kind: 'registry' | 'request' | 'effect' | 'blocked' | 'note';
  title: string;
  detail: string;
  /** Source citation: file:line at the pinned commit. */
  cite?: string;
  userAgent?: string;
}

export interface Simulation {
  entry: EntryKind;
  detectorCalled: boolean;
  registry: RegistryResolution;
  detect: DetectResult;
  userAgent: string | null; // null when no request leaves the process
  steps: Step[];
  /** Effects beyond the header (CLI mode, colours, `hf env` line). */
  effects: { id: string; on: boolean; label: string; cite: string }[];
}
