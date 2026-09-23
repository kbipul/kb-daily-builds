import type { Action } from './action';

/**
 * A small, deterministic content digest over the WHOLE action.
 *
 * FNV-1a, 32-bit, printed as 8 hex chars. Not a cryptographic hash and not
 * pretending to be one: the point being demonstrated is that a binding exists
 * and is re-checked at execution time, not that it resists collisions.
 */
export function digest(a: Action): string {
  const canonical = JSON.stringify([
    a.id,
    a.label,
    a.tool,
    Object.keys(a.args)
      .sort()
      .map((k) => [k, a.args[k]]),
    a.reversible,
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
