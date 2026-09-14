import type {
  DetectResult,
  EntryKind,
  Env,
  KillSwitches,
  Registry,
  RegistryResolution,
  RuntimeFacts,
  Simulation,
  Step,
} from './types';
import { detectAgent, detectLegacy, eraForVersion } from './detect';
import { buildUserAgent } from './userAgent';

export const HUB = 'https://huggingface.co';
export const REGISTRY_URL = `${HUB}/api/agent-harnesses`;
export const CACHE_PATH = '$HF_HOME/.agent_harnesses.json';

/**
 * Port of `_load_registry` — _detect_agent.py:143-163 @ 129bbb5.
 *
 *   1. cached file refreshed < 24h ago            → use it, no network
 *   2. else fetch from the Hub (skipped if HF_HUB_OFFLINE), persist it
 *   3. fetch failed → stale cache if any, else the empty registry (no detection)
 */
export function resolveRegistry(facts: Pick<RuntimeFacts, 'cache' | 'hubReachable'>, offline: boolean): RegistryResolution {
  if (facts.cache === 'fresh') {
    return { source: 'cache-fresh', fetchAttempted: false, fetchSucceeded: false, detectionDisabled: false };
  }
  if (!offline) {
    if (facts.hubReachable) {
      return { source: 'fetched', fetchAttempted: true, fetchSucceeded: true, detectionDisabled: false };
    }
    if (facts.cache === 'stale') {
      return { source: 'cache-stale', fetchAttempted: true, fetchSucceeded: false, detectionDisabled: false };
    }
    return { source: 'empty', fetchAttempted: true, fetchSucceeded: false, detectionDisabled: true };
  }
  if (facts.cache === 'stale') {
    return { source: 'cache-stale', fetchAttempted: false, fetchSucceeded: false, detectionDisabled: false };
  }
  return { source: 'empty', fetchAttempted: false, fetchSucceeded: false, detectionDisabled: true };
}

const NO_DETECT: DetectResult = { id: null, match: null, ignoredPatterns: [], alsoMatched: [] };
const EMPTY_REGISTRY: Registry = { standardEnvVars: [], harnesses: [], source: '_EMPTY_REGISTRY' };

export interface SimInput {
  entry: EntryKind;
  env: Env;
  registry: Registry;
  switches: KillSwitches;
  facts: RuntimeFacts;
  /** Repo the SDK/CLI is about to touch — only used to render the request line. */
  repoId?: string;
  filename?: string;
}

/**
 * Walk one process from start to its first Hub request and record, in order,
 * every place `huggingface_hub` reads the environment, touches the network, or
 * changes its own behaviour because of what it read.
 */
export function simulate(input: SimInput): Simulation {
  const { entry, env, switches, facts } = input;
  const era = eraForVersion(facts.hfHubVersion);
  const repoId = input.repoId ?? 'sentence-transformers/all-MiniLM-L6-v2';
  const filename = input.filename ?? 'config.json';
  const steps: Step[] = [];
  let n = 0;
  const push = (s: Omit<Step, 'n'>) => steps.push({ n: ++n, ...s });

  // ---- Who calls the detector, and when --------------------------------------
  // SDK path: only `_http_user_agent`, and only inside the telemetry block.
  // CLI path: `Output.__init__` → set_mode(auto) → is_agent(), unconditionally.
  // `hf env`: CLI startup, then dump_environment_info() → is_agent() again.
  const cliStartup = entry === 'cli' || entry === 'hf-env';
  const detectorCalled = era !== 'none' && (cliStartup || !switches.disableTelemetry);

  if (era === 'none') {
    push({
      kind: 'note',
      title: `huggingface_hub ${facts.hfHubVersion} predates agent detection`,
      detail: 'Detection landed in v1.9.0 (2026-04-03). Nothing in this client reads agent env vars or tags the header.',
      cite: 'git log — 6ab7274 "[CLI] Add agent detection helpers (#3991)"',
    });
  }

  if (cliStartup && era !== 'none') {
    push({
      kind: 'effect',
      title: 'CLI starts → Output.set_mode(auto) → is_agent()',
      detail: switches.disableTelemetry
        ? 'Runs regardless of HF_HUB_DISABLE_TELEMETRY: the flag gates the header, not the CLI mode decision.'
        : 'The CLI decides human-vs-agent output before any command runs.',
      cite: 'cli/_output.py:63-69',
    });
  } else if (entry === 'sdk' && era !== 'none' && switches.disableTelemetry) {
    push({
      kind: 'note',
      title: 'detect_agent() skipped',
      detail: 'In the SDK path the detector is only called inside `if not HF_HUB_DISABLE_TELEMETRY` — with the flag set, the environment is never read for agent markers and the registry is never resolved.',
      cite: '_headers.py:183-189',
    });
  } else if (entry === 'sdk' && era !== 'none') {
    push({
      kind: 'effect',
      title: 'build_hf_headers() → _http_user_agent() → detect_agent()',
      detail: 'Headers are built at the top of hf_hub_download(), before the cache is checked — a fully cached model still runs detection.',
      cite: 'file_download.py:1005, _headers.py:187',
    });
  }

  // ---- Registry resolution (registry era only) -----------------------------
  let registry: RegistryResolution = { source: 'cache-fresh', fetchAttempted: false, fetchSucceeded: false, detectionDisabled: false };
  let effective: Registry = input.registry;
  if (detectorCalled && era === 'registry') {
    registry = resolveRegistry(facts, switches.offline);
    if (registry.detectionDisabled) effective = EMPTY_REGISTRY;
    const where =
      registry.source === 'cache-fresh'
        ? `Cached copy at ${CACHE_PATH} is under 24h old — used as is, no network.`
        : registry.source === 'fetched'
          ? `Cache missing or ≥24h old → GET ${REGISTRY_URL} (3s timeout), written to ${CACHE_PATH}. This request happens before any model request, on a plain GET through the shared httpx client.`
          : registry.source === 'cache-stale'
            ? switches.offline
              ? `HF_HUB_OFFLINE is set → no fetch. The stale copy at ${CACHE_PATH} is used anyway: offline mode stops the refresh, not the detection.`
              : `GET ${REGISTRY_URL} failed (Hub unreachable) → the stale copy at ${CACHE_PATH} is used.`
            : switches.offline
              ? 'HF_HUB_OFFLINE is set and there is no cached copy → empty registry → no agent is ever detected.'
              : `GET ${REGISTRY_URL} failed and there is no cached copy → empty registry → no agent is ever detected. Note the fetch was still attempted.`;
    push({
      kind: registry.fetchAttempted ? 'registry' : 'note',
      title: registry.fetchAttempted
        ? registry.fetchSucceeded
          ? `GET /api/agent-harnesses → ${input.registry.harnesses.length} harnesses`
          : 'GET /api/agent-harnesses → failed'
        : `Registry from ${registry.source === 'cache-fresh' ? 'fresh cache' : registry.source === 'cache-stale' ? 'stale cache' : 'nowhere'}`,
      detail: where,
      cite: '_detect_agent.py:143-163, 189-204',
    });
  } else if (detectorCalled && era === 'legacy') {
    push({
      kind: 'note',
      title: 'Harness list compiled into the wheel',
      detail: `huggingface_hub ${facts.hfHubVersion} carries a hardcoded list (17 tool ids + devin). No registry fetch, no cache file — but also no way for the Hub to change what is detected without a new release.`,
      cite: '_detect_agent.py @ 90a9805',
    });
  }

  // ---- Detection --------------------------------------------------------------
  let detect: DetectResult = NO_DETECT;
  if (detectorCalled) {
    detect = era === 'legacy' ? detectLegacy(env) : detectAgent(env, effective);
    if (detect.match) {
      const m = detect.match;
      const total = era === 'legacy' ? 18 : effective.harnesses.length;
      const detail =
        m.kind === 'envVar'
          ? `${m.variable}=${quote(m.value)} matched pattern ${quote(m.pattern ?? '*')} for \`${m.id}\` (priority ${(m.priority ?? 0) + 1} of ${total}).` +
            (detect.alsoMatched.length
              ? ` Also matched, but later in the order: ${detect.alsoMatched.map((a) => `${a.id} via ${a.variable}`).join(', ')}.`
              : '')
          : m.kind === 'standardVar'
            ? `${m.variable}=${quote(m.value)} equals a known harness id → \`${m.id}\`.`
            : `${m.variable}=${quote(m.value)} is set but is not a known harness id → reported as \`unknown\`.`;
      push({ kind: 'effect', title: `Environment read → agent/${m.id}`, detail, cite: era === 'legacy' ? '_detect_agent.py @ 90a9805' : '_detect_agent.py:85-99' });
    } else {
      push({
        kind: 'note',
        title: 'Environment read → no agent',
        detail: registry.detectionDisabled
          ? 'The registry resolved to empty, so even a set AI_AGENT/AGENT var is ignored (standardEnvVars is empty too).'
          : 'No harness env var is set and no standard var is set.',
        cite: '_detect_agent.py:101',
      });
    }
    if (detect.ignoredPatterns.length) {
      push({
        kind: 'note',
        title: `${detect.ignoredPatterns.length} registry pattern(s) this client cannot evaluate`,
        detail:
          detect.ignoredPatterns.map((p) => `${p.id}: ${p.variable}=${quote(p.pattern)}`).join('; ') +
          ' — the registry schema documents `<prefix>*` fuzzy matching "resolved client-side"; the Python client\'s own test says it is "intentionally not implemented yet", so these only match the literal string.',
        cite: 'agent-harnesses.ts:32; tests/test_utils_detect_agent.py:79-82',
      });
    }
  }

  // ---- CLI side effects ------------------------------------------------------
  const detected = detect.id !== null;
  const effects: Simulation['effects'] = [];
  if (cliStartup && era !== 'none') {
    effects.push({
      id: 'cli-mode',
      on: detected,
      label: detected ? 'CLI output mode = agent: progress bars disabled, machine-readable output' : 'CLI output mode = human',
      cite: 'cli/_output.py:63-69',
    });
    effects.push({
      id: 'colour',
      on: detected || switches.noColor,
      label: detected || switches.noColor ? 'ANSI colours stripped' : 'ANSI colours on',
      cite: 'utils/_terminal.py:102',
    });
    if (detected) {
      push({
        kind: 'effect',
        title: 'CLI switches to agent mode',
        detail: 'disable_progress_bars() runs once at startup. `--format human` later re-renders the text but does not re-enable the bars (issue #4860).',
        cite: 'cli/_output.py:66-69',
      });
    }
  }
  if (entry === 'hf-env' && era !== 'none') {
    effects.push({
      id: 'hf-env-line',
      on: detected,
      label: `hf env prints "Run by AI agent ? ${detected ? 'Yes' : 'No'}"`,
      cite: 'utils/_runtime.py:414',
    });
    push({ kind: 'effect', title: `hf env → "Run by AI agent ? ${detected ? 'Yes' : 'No'}"`, detail: 'The one place the SDK tells you what it decided.', cite: 'utils/_runtime.py:414' });
  }

  // ---- The request that leaves the process ---------------------------------
  let userAgent: string | null = null;
  const wantsRequest = entry !== 'hf-env';
  if (wantsRequest) {
    const ua = buildUserAgent({
      // cli/download.py:173 passes library_name="huggingface-cli", library_version=__version__
      libraryName: entry === 'cli' ? 'huggingface-cli' : facts.libraryName,
      libraryVersion: entry === 'cli' ? facts.hfHubVersion : facts.libraryVersion,
      hfHubVersion: facts.hfHubVersion,
      pythonVersion: facts.pythonVersion,
      torchVersion: facts.torchVersion,
      disableTelemetry: switches.disableTelemetry,
      agentId: switches.disableTelemetry ? null : detect.id,
      origin: switches.origin || null,
    });
    const url = `${HUB}/${repoId}/resolve/main/${filename}`;
    if (switches.offline) {
      push({
        kind: 'blocked',
        title: `HEAD ${url} → OfflineModeIsEnabled`,
        detail: 'HF_HUB_OFFLINE makes every request through get_session() raise. Files come from the local cache or the call fails. The header below was built but never sent.',
        cite: 'constants.py:195-211',
        userAgent: ua,
      });
    } else if (!facts.hubReachable) {
      push({
        kind: 'blocked',
        title: `HEAD ${url} → connection error`,
        detail: 'The Hub is not reachable from this network. The header was built and the request was attempted.',
        userAgent: ua,
      });
    } else {
      userAgent = ua;
      push({
        kind: 'request',
        title: `HEAD ${url}`,
        detail: 'The metadata request hf_hub_download() makes before deciding whether to download. Every subsequent request in this process carries the same User-Agent.',
        cite: 'file_download.py:1625-1636',
        userAgent: ua,
      });
    }
  }
  effects.push({
    id: 'ua-agent',
    on: userAgent !== null && userAgent.includes('; agent/'),
    label: userAgent !== null && userAgent.includes('; agent/') ? 'User-Agent carries agent/<id>' : 'User-Agent carries no agent segment',
    cite: '_headers.py:187-189',
  });
  effects.push({
    id: 'registry-fetch',
    on: registry.fetchAttempted,
    label: registry.fetchAttempted ? 'A GET /api/agent-harnesses left the process' : 'No registry request left the process',
    cite: '_detect_agent.py:189-204',
  });

  return { entry, detectorCalled, registry, detect, userAgent, steps, effects };
}

function quote(s: string): string {
  return `'${s}'`;
}
