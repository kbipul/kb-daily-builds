/**
 * A deliberately small shell parser. It is NOT a shell — it does just enough
 * to answer one question honestly: after the shell finishes expanding this
 * line, which paths does the command actually receive?
 *
 * That question matters because the famous disasters (Steam's `rm -rf
 * "$STEAMROOT/"*`, Bumblebee's `rm -rf /usr $LIB/...`) are not bugs in `rm`.
 * They are bugs in expansion. So expansion is modelled first-class here.
 */

export interface ParsedCommand {
  /** Program name, e.g. `rm`. */
  name: string;
  /** Short flags without dashes (`-rf` → `["r","f"]`) plus long flags (`--force`). */
  flags: string[];
  /** Non-flag arguments, already brace/variable-expanded. */
  args: string[];
  /**
   * Every expanded token after the program name, untouched. `find` and friends
   * use single-dash long options (`-name`, `-delete`), which the short-flag
   * splitter would shred into characters — those simulators read this instead.
   */
  rawArgs: string[];
  /** The reconstructed, expanded command line. */
  text: string;
  /** Variables referenced that had no value — the classic catastrophe. */
  unsetVars: string[];
  /** True when the command was run under sudo. */
  sudo: boolean;
}

export interface ParseResult {
  commands: ParsedCommand[];
  expanded: string;
  expansionChanged: boolean;
  unsetVars: string[];
  /** True when a pipe feeds a shell — `curl … | sh`. */
  pipedToShell: boolean;
}

/** The variables our fictional agent's environment happens to have set. */
export const DEFAULT_ENV: Record<string, string> = {
  HOME: "/home/dev",
  PWD: "/home/dev/checkout",
  USER: "dev",
  TMPDIR: "/tmp",
};

/** Split a line into words, honouring single/double quotes. */
export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && quote !== "'" && i + 1 < line.length) {
      current += line[++i];
      started = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      started = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = "";
      started = false;
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);
  return tokens;
}

/**
 * Substitute `$VAR` / `${VAR}`. An unset variable expands to the empty string —
 * silently, exactly as a real shell does without `set -u`. That silence is the
 * entire bug class this tool exists to make visible.
 */
export function substitute(
  token: string,
  env: Record<string, string>,
): { value: string; unset: string[] } {
  const unset: string[] = [];
  const value = token.replace(/\$\{(\w+)\}|\$(\w+)/g, (_m, braced, bare) => {
    const name = braced ?? bare;
    const found = env[name];
    if (found === undefined) {
      unset.push(name);
      return "";
    }
    return found;
  });
  return { value, unset };
}

/** Split on `;`, `&&`, `||` — each becomes its own command to simulate. */
function splitChain(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    const two = line.slice(i, i + 2);
    if (two === "&&" || two === "||") {
      parts.push(current);
      current = "";
      i++;
      continue;
    }
    if (ch === ";") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function parse(line: string, env: Record<string, string> = DEFAULT_ENV): ParseResult {
  const commands: ParsedCommand[] = [];
  const allUnset: string[] = [];
  let pipedToShell = false;

  for (const segment of splitChain(line)) {
    // Detect `… | sh` before we throw the pipe away.
    const pipeParts = segment.split("|").map((s) => s.trim());
    if (pipeParts.length > 1) {
      const sink = tokenize(pipeParts[pipeParts.length - 1])[0] ?? "";
      if (["sh", "bash", "zsh", "python", "python3", "node"].includes(sink)) pipedToShell = true;
    }

    for (const piece of pipeParts) {
      const rawTokens = tokenize(piece);
      if (rawTokens.length === 0) continue;

      const expandedTokens: string[] = [];
      for (const token of rawTokens) {
        const { value, unset } = substitute(token, env);
        allUnset.push(...unset);
        expandedTokens.push(value);
      }

      let cursor = 0;
      let sudo = false;
      // Skip sudo and any `VAR=value` prefixes.
      while (cursor < expandedTokens.length) {
        if (expandedTokens[cursor] === "sudo") {
          sudo = true;
          cursor++;
        } else if (/^\w+=/.test(expandedTokens[cursor])) cursor++;
        else break;
      }

      const name = expandedTokens[cursor];
      if (!name) continue;

      const flags: string[] = [];
      const args: string[] = [];
      for (const token of expandedTokens.slice(cursor + 1)) {
        if (token.startsWith("--")) flags.push(token);
        else if (token.startsWith("-") && token.length > 1) flags.push(...token.slice(1).split(""));
        else if (token !== "") args.push(token);
      }

      commands.push({
        name,
        flags,
        args,
        rawArgs: expandedTokens.slice(cursor + 1),
        text: expandedTokens.slice(cursor).join(" "),
        unsetVars: [...new Set(rawTokens.flatMap((t) => substitute(t, env).unset))],
        sudo,
      });
    }
  }

  const expanded = commands.map((c) => (c.sudo ? `sudo ${c.text}` : c.text)).join(" && ");
  return {
    commands,
    expanded,
    expansionChanged: expanded !== line.trim(),
    unsetVars: [...new Set(allUnset)],
    pipedToShell,
  };
}
