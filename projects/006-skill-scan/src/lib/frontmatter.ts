/**
 * Minimal, dependency-free frontmatter parser.
 *
 * Handles the flat YAML subset that agent skill files actually use:
 *   key: value
 *   key: [a, b, c]
 *   key:
 *     - a
 *     - b
 * Anything more exotic is kept as a raw string — good enough for auditing.
 */

export interface FmEntry {
  key: string;
  value: string | string[];
  /** 1-based line number of the key in the original document. */
  line: number;
}

export interface ParseResult {
  present: boolean;
  entries: FmEntry[];
  /** Body text (everything after the closing ---). */
  body: string;
  /** 1-based line number where the body starts in the original document. */
  bodyStartLine: number;
}

export function getEntry(fm: ParseResult, ...keys: string[]): FmEntry | undefined {
  const wanted = keys.map((k) => k.toLowerCase());
  return fm.entries.find((e) => wanted.includes(e.key.toLowerCase()));
}

export function parseFrontmatter(text: string): ParseResult {
  const lines = text.split("\n");
  const none: ParseResult = { present: false, entries: [], body: text, bodyStartLine: 1 };

  if (lines[0]?.trim() !== "---") return none;

  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) return none; // unterminated block — treat as body

  const entries: FmEntry[] = [];
  let current: FmEntry | null = null;
  let pendingList: string[] | null = null;

  for (let i = 1; i < close; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;

    const listItem = raw.match(/^\s+-\s+(.*)$/);
    if (listItem && current && pendingList) {
      pendingList.push(stripQuotes(listItem[1].trim()));
      current.value = pendingList;
      continue;
    }

    const kv = raw.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1];
    const rest = kv[2].trim();

    if (rest === "") {
      pendingList = [];
      current = { key, value: pendingList, line: i + 1 };
      entries.push(current);
    } else if (rest.startsWith("[") && rest.endsWith("]")) {
      const items = rest
        .slice(1, -1)
        .split(",")
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
      current = { key, value: items, line: i + 1 };
      pendingList = null;
      entries.push(current);
    } else {
      current = { key, value: stripQuotes(rest), line: i + 1 };
      pendingList = null;
      entries.push(current);
    }
  }

  return {
    present: true,
    entries,
    body: lines.slice(close + 1).join("\n"),
    bodyStartLine: close + 2,
  };
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}
