import type { Env, Registry } from './types';

/**
 * Parse pasted `env` output. Accepts:
 *   KEY=VALUE            (one per line, as `env` / `printenv` print it)
 *   export KEY=VALUE     (shell syntax)
 *   KEY                  (names only, as `env | cut -d= -f1` prints it)
 * Names-only lines are given the value "1" — enough for every `*` pattern.
 * Exact-value patterns (TERM_PROGRAM=WarpTerminal, VTCODE=1) need the value.
 *
 * Nothing pasted leaves the page. Even so, `redactSecrets` blanks values whose
 * NAME looks like a credential, so a screenshot of the panel is safe to share.
 */
export function parseEnv(text: string): { env: Env; lines: number; namesOnly: number; skipped: number } {
  const env: Env = {};
  let lines = 0;
  let namesOnly = 0;
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    lines++;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq === -1) {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(line)) {
        env[line] = '1';
        namesOnly++;
      } else skipped++;
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      skipped++;
      continue;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return { env: redactSecrets(env), lines, namesOnly, skipped };
}

const SECRET_NAME = /(TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|PRIVATE|CREDENTIAL|AUTH)/i;

export function redactSecrets(env: Env): Env {
  const out: Env = {};
  for (const [k, v] of Object.entries(env)) out[k] = SECRET_NAME.test(k) && v ? '••••' : v;
  return out;
}

/** The subset of an environment the detector can ever look at, given a registry. */
export function relevantVars(env: Env, registry: Registry): string[] {
  const watched = new Set<string>(registry.standardEnvVars);
  for (const h of registry.harnesses) for (const k of Object.keys(h.envVars ?? {})) watched.add(k);
  return Object.keys(env).filter((k) => watched.has(k));
}

export function envToText(env: Env): string {
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}
