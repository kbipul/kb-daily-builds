import type { HarnessEntry, Registry } from './types';

/**
 * Snapshot of the agent-harness registry.
 *
 * Source: huggingface/huggingface.js, packages/tasks/src/agent-harnesses.ts at
 * commit 3edf1ba (2026-09-11). The Hub serves this file's content at
 * `{ENDPOINT}/api/agent-harnesses`; the Python client fetches it at most once a
 * day. Insertion order is the detection priority and is preserved verbatim,
 * including the two ordering comments the file itself carries (cowork before
 * claude-code; cursor-cli then cursor kept at the bottom).
 *
 * This is a snapshot, not the live list. What the Hub serves today may differ —
 * paste today's JSON in the app to use it instead.
 */
export const SNAPSHOT_COMMIT = '3edf1ba';
export const SNAPSHOT_DATE = '2026-09-11';
export const SNAPSHOT_URL =
  'https://github.com/huggingface/huggingface.js/blob/3edf1ba36fe9f2db1e920bf86d7ae89fb5d369c2/packages/tasks/src/agent-harnesses.ts';

export const STANDARD_AGENT_ENV_VARS = ['AI_AGENT', 'AGENT'] as const;

const H = (
  id: string,
  prettyLabel: string,
  envVars?: Record<string, string>,
  extra: Partial<Pick<HarnessEntry, 'repoUrl' | 'docsUrl' | 'description'>> = {},
): HarnessEntry => ({ id, prettyLabel, envVars, ...extra });

export const SNAPSHOT_HARNESSES: HarnessEntry[] = [
  H('antigravity', 'Antigravity', { ANTIGRAVITY_AGENT: '*' }, { docsUrl: 'https://antigravity.google' }),
  H('augment-cli', 'Augment CLI', { AUGMENT_AGENT: '*' }, { repoUrl: 'https://github.com/augmentcode/auggie' }),
  H('cline', 'Cline', { CLINE_ACTIVE: '*' }, { repoUrl: 'https://github.com/cline/cline' }),
  // "must stay before `claude-code` so the more specific signal takes priority" — registry comment
  H('cowork', 'Cowork', { CLAUDE_CODE_IS_COWORK: '*' }, { docsUrl: 'https://claude.com/product/cowork' }),
  H('claude-code', 'Claude Code', { CLAUDECODE: '*', CLAUDE_CODE: '*' }, { repoUrl: 'https://github.com/anthropics/claude-code' }),
  H('codex', 'Codex', { CODEX_SANDBOX: '*', CODEX_CI: '*', CODEX_THREAD_ID: '*' }, { repoUrl: 'https://github.com/openai/codex' }),
  H('crush', 'Crush', { CRUSH: '*' }, { repoUrl: 'https://github.com/charmbracelet/crush' }),
  H('gemini-cli', 'Gemini CLI', { GEMINI_CLI: '*' }, { repoUrl: 'https://github.com/google-gemini/gemini-cli' }),
  H('github-copilot', 'GitHub Copilot', { COPILOT_MODEL: '*', COPILOT_ALLOW_ALL: '*', COPILOT_GITHUB_TOKEN: '*' }, { docsUrl: 'https://docs.github.com/copilot' }),
  H('goose', 'Goose', { GOOSE_TERMINAL: '*' }, { repoUrl: 'https://github.com/aaif-goose/goose' }),
  H('hermes-agent', 'Hermes Agent', { HERMES_SESSION_ID: '*' }, { repoUrl: 'https://github.com/NousResearch/hermes-agent' }),
  H('hi', 'hi', undefined, { repoUrl: 'https://github.com/PipeNetwork/hi' }),
  H('kilo-code', 'Kilo Code', { KILOCODE_FEATURE: '*' }, { repoUrl: 'https://github.com/Kilo-Org/kilocode' }),
  H('kiro', 'Kiro', { AGENT_CONTEXT_OUT: '*' }, { docsUrl: 'https://kiro.dev' }),
  H('openclaw', 'OpenClaw', { OPENCLAW_SHELL: '*' }, { repoUrl: 'https://github.com/openclaw/openclaw' }),
  H('sandbase-harness', 'SandBase Harness', undefined, { repoUrl: 'https://github.com/sandbaseai/sandbase-harness' }),
  H('opencode', 'opencode', { OPENCODE_CLIENT: '*' }, { repoUrl: 'https://github.com/anomalyco/opencode' }),
  H('pi', 'Pi', { PI_CODING_AGENT: '*' }, { repoUrl: 'https://github.com/earendil-works/pi' }),
  H('replit', 'Replit', { REPL_ID: '*' }, { docsUrl: 'https://replit.com' }),
  H('trae', 'Trae', { TRAE_AI_SHELL_ID: '*' }, { docsUrl: 'https://trae.ai' }),
  H('vtcode', 'VTCode', { VTCODE: '1' }, { repoUrl: 'https://github.com/vinhnx/VTCode' }),
  H('warp', 'Warp', { TERM_PROGRAM: 'WarpTerminal' }, { repoUrl: 'https://github.com/warpdotdev/Warp' }),
  H('zed', 'Zed', { ZED_TERM: '*' }, { repoUrl: 'https://github.com/zed-industries/zed' }),
  // "Kept near the bottom (and before `cursor`) … `cursor` must stay a low-priority fallback" — registry comment
  H('cursor-cli', 'Cursor CLI', { CURSOR_AGENT: '*' }, { docsUrl: 'https://cursor.com/docs/cli/overview' }),
  H('cursor', 'Cursor', { CURSOR_TRACE_ID: '*' }, { docsUrl: 'https://cursor.com' }),
  H('devin', 'Devin', undefined, { docsUrl: 'https://devin.ai' }),
];

export const SNAPSHOT_REGISTRY: Registry = {
  standardEnvVars: [...STANDARD_AGENT_ENV_VARS],
  harnesses: SNAPSHOT_HARNESSES,
  source: `agent-harnesses.ts @ ${SNAPSHOT_COMMIT} (${SNAPSHOT_DATE})`,
};

/**
 * The hardcoded list the client shipped BEFORE the registry existed —
 * `_detect_agent.py` at commit 90a9805 (2026-04-20), released in v1.10–v1.18.
 * Standard vars were checked first in that era (see detectLegacy).
 */
export const LEGACY_COMMIT = '90a9805';
export const LEGACY_TOOL_AGENTS: { vars: string[]; id: string }[] = [
  { vars: ['ANTIGRAVITY_AGENT'], id: 'antigravity' },
  { vars: ['AUGMENT_AGENT'], id: 'augment-cli' },
  { vars: ['CLINE_ACTIVE'], id: 'cline' },
  { vars: ['CLAUDE_CODE_IS_COWORK'], id: 'cowork' },
  { vars: ['CLAUDECODE', 'CLAUDE_CODE'], id: 'claude-code' },
  { vars: ['CODEX_SANDBOX', 'CODEX_CI', 'CODEX_THREAD_ID'], id: 'codex' },
  { vars: ['CURSOR_TRACE_ID'], id: 'cursor' },
  { vars: ['CURSOR_AGENT'], id: 'cursor-cli' },
  { vars: ['GEMINI_CLI'], id: 'gemini' },
  { vars: ['COPILOT_MODEL', 'COPILOT_ALLOW_ALL', 'COPILOT_GITHUB_TOKEN'], id: 'github-copilot' },
  { vars: ['GOOSE_TERMINAL'], id: 'goose' },
  { vars: ['OPENCLAW_SHELL'], id: 'openclaw' },
  { vars: ['OPENCODE_CLIENT'], id: 'opencode' },
  { vars: ['PI_CODING_AGENT'], id: 'pi' },
  { vars: ['REPL_ID'], id: 'replit' },
  { vars: ['ROO_ACTIVE'], id: 'roo-code' },
  { vars: ['TRAE_AI_SHELL_ID'], id: 'trae' },
];
export const LEGACY_KNOWN_AGENTS = new Set<string>(['devin', ...LEGACY_TOOL_AGENTS.map((t) => t.id)]);

/**
 * What kind of thing an env var actually identifies. This column is OUR
 * judgement, not the registry's: the registry has no such field. Evidence for
 * each "terminal/editor" row is a comment in the registry itself or issue
 * huggingface_hub#4860 (Warp). Everything else is treated as an agent marker.
 */
export type VarNature = 'agent' | 'terminal' | 'generic-name';
export const VAR_NATURE: Record<string, { nature: VarNature; why: string }> = {
  TERM_PROGRAM: {
    nature: 'terminal',
    why: 'Set by the terminal emulator for every shell, agent or not. Issue #4860: a human running `hf` in Warp is tagged agent/warp.',
  },
  ZED_TERM: {
    nature: 'terminal',
    why: 'Set by Zed for its integrated terminal — any command a human types there carries it.',
  },
  CURSOR_TRACE_ID: {
    nature: 'terminal',
    why: 'Registry comment: child processes of the Cursor editor\'s terminal inherit it, which is why `cursor` is kept last.',
  },
  REPL_ID: {
    nature: 'terminal',
    why: 'Present in every Replit workspace shell, not only when the Replit agent drives a command.',
  },
  AGENT: {
    nature: 'generic-name',
    why: 'A bare, generic name. Any unrelated script that exports AGENT=<something> is reported as agent/unknown.',
  },
  CRUSH: { nature: 'generic-name', why: 'A bare word as a variable name; any non-empty value matches.' },
  AGENT_CONTEXT_OUT: { nature: 'generic-name', why: 'Generic enough to collide with non-Kiro tooling; any non-empty value matches.' },
};

export function varNature(variable: string): { nature: VarNature; why: string } {
  return VAR_NATURE[variable] ?? { nature: 'agent', why: 'Set by the agent harness itself when it spawns a shell.' };
}

/**
 * Parse the wire format the Hub serves at /api/agent-harnesses (and that the
 * client caches at $HF_HOME/.agent_harnesses.json):
 *   { "standardEnvVars": [...], "harnesses": { "<id>": { "envVars": {...}, ... } } }
 * JSON object key order is preserved by JSON.parse for non-integer keys, which
 * is exactly what the Python client relies on (dict order).
 */
export function parseRegistryJson(text: string): { registry: Registry | null; error: string | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { registry: null, error: `Not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object') return { registry: null, error: 'Expected a JSON object.' };
  const obj = raw as Record<string, unknown>;
  const std = Array.isArray(obj.standardEnvVars) ? obj.standardEnvVars.filter((v) => typeof v === 'string') : [];
  const hs = obj.harnesses;
  if (!hs || typeof hs !== 'object' || Array.isArray(hs)) {
    return { registry: null, error: 'Expected "harnesses" to be an object keyed by harness id.' };
  }
  const harnesses: HarnessEntry[] = [];
  for (const [id, v] of Object.entries(hs as Record<string, unknown>)) {
    const info = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const ev = info.envVars;
    const envVars: Record<string, string> | undefined =
      ev && typeof ev === 'object' && !Array.isArray(ev)
        ? Object.fromEntries(Object.entries(ev as Record<string, unknown>).filter(([, p]) => typeof p === 'string') as [string, string][])
        : undefined;
    harnesses.push({
      id,
      prettyLabel: typeof info.prettyLabel === 'string' ? info.prettyLabel : id,
      envVars: envVars && Object.keys(envVars).length ? envVars : undefined,
      repoUrl: typeof info.repoUrl === 'string' ? info.repoUrl : undefined,
      docsUrl: typeof info.docsUrl === 'string' ? info.docsUrl : undefined,
      description: typeof info.description === 'string' ? info.description : undefined,
    });
  }
  if (harnesses.length === 0) return { registry: null, error: 'No harnesses found.' };
  return { registry: { standardEnvVars: std as string[], harnesses, source: 'pasted JSON' }, error: null };
}

/** Serialise a registry back to the wire format (used to show the visitor what the client caches). */
export function toWireJson(r: Registry): string {
  const harnesses: Record<string, { envVars?: Record<string, string> }> = {};
  for (const h of r.harnesses) harnesses[h.id] = h.envVars ? { envVars: h.envVars } : {};
  return JSON.stringify({ standardEnvVars: r.standardEnvVars, harnesses }, null, 2);
}

/** Diff two registries by harness id and env var — what changed since the snapshot. */
export function diffRegistries(base: Registry, next: Registry) {
  const baseIds = new Map(base.harnesses.map((h, i) => [h.id, { h, i }]));
  const nextIds = new Map(next.harnesses.map((h, i) => [h.id, { h, i }]));
  const added = next.harnesses.filter((h) => !baseIds.has(h.id)).map((h) => h.id);
  const removed = base.harnesses.filter((h) => !nextIds.has(h.id)).map((h) => h.id);
  const changedVars: string[] = [];
  for (const [id, { h }] of nextIds) {
    const b = baseIds.get(id);
    if (!b) continue;
    if (JSON.stringify(b.h.envVars ?? {}) !== JSON.stringify(h.envVars ?? {})) changedVars.push(id);
  }
  return { added, removed, changedVars };
}
