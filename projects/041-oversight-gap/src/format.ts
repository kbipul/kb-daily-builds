/** Counts of actions are integers; a fractional action is a rounding artefact. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n);
  return r.toLocaleString('en-US');
}

export function pct(n: number, digits = 3): string {
  return `${(n * 100).toFixed(digits)}%`;
}
