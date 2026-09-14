import type { DetectResult, Env, Match, Registry } from './types';
import { LEGACY_KNOWN_AGENTS, LEGACY_TOOL_AGENTS } from './registry';

/**
 * Port of `_env_vars_match` — huggingface_hub/utils/_detect_agent.py:109-124 @ 129bbb5.
 *
 *   for var, pattern in env_vars.items():
 *       value = os.environ.get(var)
 *       if not value: continue          # unset OR empty string → no match
 *       if pattern == "*": return True
 *       if value == pattern: return True
 *   return False
 *
 * Note what is NOT here: the `<prefix>*` pattern the registry schema documents.
 * The client's own test (`test_prefix_pattern_is_ignored`) says it is
 * "intentionally not implemented yet", so `"foo*"` only matches the literal
 * value `foo*`. We return which patterns were of that shape so the app can show
 * the drift instead of hiding it.
 */
export function envVarsMatch(
  env: Env,
  envVars: Record<string, string>,
): { hit: { variable: string; pattern: string; value: string } | null; ignored: { variable: string; pattern: string }[] } {
  const ignored: { variable: string; pattern: string }[] = [];
  for (const [variable, pattern] of Object.entries(envVars)) {
    if (isPrefixPattern(pattern)) ignored.push({ variable, pattern });
    const value = env[variable];
    if (!value) continue;
    if (pattern === '*') return { hit: { variable, pattern, value }, ignored };
    if (value === pattern) return { hit: { variable, pattern, value }, ignored };
  }
  return { hit: null, ignored };
}

/** A registry pattern of the shape `<prefix>*` (not the bare `*`). */
export function isPrefixPattern(pattern: string): boolean {
  return pattern.length > 1 && pattern.endsWith('*');
}

/**
 * Port of `detect_agent` — _detect_agent.py:73-101 @ 129bbb5.
 *
 * Harnesses are walked in registry order. For each one: its env var patterns,
 * then the standard vars compared (case-sensitively, stripped) to the harness
 * id. First match wins. After the loop, a set standard var whose lowercased
 * value is not a known id yields "unknown".
 */
export function detectAgent(env: Env, registry: Registry): DetectResult {
  const standardVars = registry.standardEnvVars ?? [];
  const harnesses = registry.harnesses ?? [];
  const ignoredPatterns: DetectResult['ignoredPatterns'] = [];
  const alsoMatched: DetectResult['alsoMatched'] = [];
  let winner: Match | null = null;

  for (let priority = 0; priority < harnesses.length; priority++) {
    const h = harnesses[priority];
    if (h.envVars) {
      const { hit, ignored } = envVarsMatch(env, h.envVars);
      for (const ig of ignored) ignoredPatterns.push({ id: h.id, ...ig });
      if (hit) {
        if (winner === null) {
          winner = { kind: 'envVar', id: h.id, variable: hit.variable, pattern: hit.pattern, value: hit.value, priority };
        } else {
          alsoMatched.push({ id: h.id, variable: hit.variable });
        }
        continue;
      }
    }
    if (winner !== null) continue;
    for (const v of standardVars) {
      const val = (env[v] ?? '').trim();
      if (val === h.id) {
        winner = { kind: 'standardVar', id: h.id, variable: v, value: val, priority };
        break;
      }
    }
  }

  if (winner !== null) {
    const w: Match = winner;
    return { id: w.id, match: w, ignoredPatterns, alsoMatched };
  }

  // No harness matched but a standard var is set => unrecognized agent.
  const lowercased = new Set(harnesses.map((h) => h.id.toLowerCase()));
  for (const v of standardVars) {
    const value = (env[v] ?? '').trim().toLowerCase();
    if (value) {
      if (lowercased.has(value)) {
        return { id: value, match: { kind: 'standardVar', id: value, variable: v, value }, ignoredPatterns, alsoMatched };
      }
      return { id: 'unknown', match: { kind: 'standardUnknown', id: 'unknown', variable: v, value }, ignoredPatterns, alsoMatched };
    }
  }
  return { id: null, match: null, ignoredPatterns, alsoMatched };
}

/**
 * The pre-registry detector — _detect_agent.py @ 90a9805 (2026-04-20), shipped
 * from v1.10 to v1.18 (v1.9.0 had the same shape minus the Pi entry). Two
 * differences from today's algorithm that matter:
 *   1. Standard vars were checked FIRST, so `AGENT=devin` beat any tool var.
 *   2. The list was compiled into the wheel — auditing the wheel told you the
 *      whole story, which is no longer true.
 */
export function detectLegacy(env: Env): DetectResult {
  for (const v of ['AI_AGENT', 'AGENT']) {
    const name = (env[v] ?? '').trim().toLowerCase();
    if (name) {
      const id = LEGACY_KNOWN_AGENTS.has(name) ? name : 'unknown';
      return {
        id,
        match: { kind: id === 'unknown' ? 'standardUnknown' : 'standardVar', id, variable: v, value: name },
        ignoredPatterns: [],
        alsoMatched: [],
      };
    }
  }
  const alsoMatched: DetectResult['alsoMatched'] = [];
  let winner: Match | null = null;
  for (let priority = 0; priority < LEGACY_TOOL_AGENTS.length; priority++) {
    const t = LEGACY_TOOL_AGENTS[priority];
    const variable = t.vars.find((x) => !!env[x]);
    if (!variable) continue;
    if (winner === null) winner = { kind: 'envVar', id: t.id, variable, pattern: '*', value: env[variable], priority };
    else alsoMatched.push({ id: t.id, variable });
  }
  if (winner !== null) {
    const w: Match = winner;
    return { id: w.id, match: w, ignoredPatterns: [], alsoMatched };
  }
  return { id: null, match: null, ignoredPatterns: [], alsoMatched };
}

/** Which detector a given client version runs. Tags/dates from the huggingface_hub git history. */
export type DetectorEra = 'none' | 'legacy' | 'registry';
export function eraForVersion(version: string): DetectorEra {
  const m = /^(\d+)\.(\d+)/.exec(version.trim());
  if (!m) return 'registry';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (major < 1) return 'none'; // 0.x never had agent detection
  if (major === 1 && minor < 9) return 'none'; // detection landed in v1.9.0 (2026-04-03)
  if (major === 1 && minor < 19) return 'legacy'; // dynamic registry landed in v1.19.0 (2026-06-11)
  return 'registry';
}
