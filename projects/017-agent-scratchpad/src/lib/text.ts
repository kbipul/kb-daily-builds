// Small deterministic text helpers used by the parser and analyzer.
// Kept dependency-free so the whole engine runs in the browser and in Vitest.

/** Lowercase alphanumeric word tokens. */
export function tokenize(s: string): string[] {
  const m = s.toLowerCase().match(/[a-z0-9]+/g);
  return m ? m : [];
}

/**
 * Normalize an action input so that trivially-different renderings of the
 * same call compare equal (whitespace, key order in flat JSON objects).
 * Falls back to a whitespace-collapsed string when it is not JSON.
 */
export function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(sortValue(parsed));
  } catch {
    return trimmed.replace(/\s+/g, " ");
  }
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortValue((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/**
 * Numbers that appear as their own token. A leading letter/digit means it is
 * part of an identifier ("v2", "utf8") and is ignored; a *trailing* unit letter
 * is fine ("27C", "63mm"), so temperatures and measurements are still caught.
 */
export function extractNumbers(s: string): string[] {
  const m = s.match(/(?<![A-Za-z0-9.])-?\d+(?:\.\d+)?(?!\.?\d)/g);
  return m ? m : [];
}

/** Substrings inside single, double, or backtick quotes. */
export function extractQuoted(s: string): string[] {
  const out: string[] = [];
  const re = /"([^"]{2,})"|'([^']{2,})'|`([^`]{2,})`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push((m[1] ?? m[2] ?? m[3]).trim());
  }
  return out;
}

/** Heuristic: does an observation read like a tool error? */
export function looksLikeError(observation: string): boolean {
  return /\b(error|exception|failed|failure|traceback|not found|404|500|timed? ?out|timeout|denied|refused|invalid|unauthori[sz]ed|no such)\b/i.test(
    observation
  );
}
