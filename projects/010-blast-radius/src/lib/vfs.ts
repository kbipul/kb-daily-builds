/**
 * A tiny read-only virtual filesystem with just enough POSIX semantics to make
 * a destructive command's blast radius honest: path resolution, glob matching
 * and recursive walks. Nothing here mutates — the simulator only ever *reads*
 * the tree and reports what a real run would have deleted.
 */
import type { VNode, Recovery } from "./types";

export interface ResolvedEntry {
  path: string;
  node: VNode;
}

/** Normalise a path: collapse `//`, resolve `.` and `..`, drop trailing `/`. */
export function normalize(path: string, cwd = "/home/dev/checkout"): string {
  const absolute = path.startsWith("/") ? path : `${cwd}/${path}`;
  const out: string[] = [];
  for (const part of absolute.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return "/" + out.join("/");
}

/** Depth-first lookup of a single absolute path. */
export function lookup(root: VNode, path: string): VNode | null {
  const parts = normalize(path).split("/").filter(Boolean);
  let node: VNode = root;
  for (const part of parts) {
    const next = node.children?.find((c) => c.name === part);
    if (!next) return null;
    node = next;
  }
  return node;
}

/**
 * Translate one glob segment into a regex. Supports `*`, `?` and `[...]`.
 * `*` deliberately does not cross `/` — that is what `**` is for, handled by
 * the caller in {@link expand}.
 */
function segmentToRegExp(segment: string): RegExp {
  let out = "^";
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "*") out += "[^/]*";
    else if (ch === "?") out += "[^/]";
    else if (ch === "[") {
      const close = segment.indexOf("]", i);
      if (close === -1) out += "\\[";
      else {
        out += "[" + segment.slice(i + 1, close).replace(/\\/g, "\\\\") + "]";
        i = close;
      }
    } else out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(out + "$");
}

/** Expand a brace group: `{a,b}c` → `ac`, `bc`. One level, which is all a shell command in the wild needs. */
export function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf("{");
  if (open === -1) return [pattern];
  const close = pattern.indexOf("}", open);
  if (close === -1) return [pattern];
  const before = pattern.slice(0, open);
  const after = pattern.slice(close + 1);
  const options = pattern.slice(open + 1, close).split(",");
  return options.flatMap((opt) => expandBraces(before + opt + after));
}

/**
 * Expand a (possibly globbed) path into the entries it actually matches.
 * A path with no glob metacharacters resolves to itself when it exists.
 */
export function expand(root: VNode, pattern: string, cwd?: string): ResolvedEntry[] {
  const results: ResolvedEntry[] = [];
  for (const braced of expandBraces(pattern)) {
    const abs = normalize(braced, cwd);
    const parts = abs.split("/").filter(Boolean);
    walk(root, "", parts, 0, results);
  }
  // De-duplicate: `{a,a}` or overlapping globs must not double-count bytes.
  const seen = new Set<string>();
  return results.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true)));
}

function walk(
  node: VNode,
  prefix: string,
  parts: string[],
  index: number,
  out: ResolvedEntry[],
): void {
  if (index === parts.length) {
    out.push({ path: prefix === "" ? "/" : prefix, node });
    return;
  }
  const part = parts[index];
  if (!node.children) return;

  if (part === "**") {
    // `**` matches zero or more directories.
    walk(node, prefix, parts, index + 1, out);
    for (const child of node.children) {
      if (child.type === "dir") walk(child, `${prefix}/${child.name}`, parts, index, out);
    }
    return;
  }

  const isGlob = /[*?[]/.test(part);
  if (!isGlob) {
    const child = node.children.find((c) => c.name === part);
    if (child) walk(child, `${prefix}/${child.name}`, parts, index + 1, out);
    return;
  }

  const re = segmentToRegExp(part);
  for (const child of node.children) {
    // A leading-dot entry is not matched by a bare `*`, exactly like a real shell.
    if (child.name.startsWith(".") && !part.startsWith(".")) continue;
    if (re.test(child.name)) walk(child, `${prefix}/${child.name}`, parts, index + 1, out);
  }
}

/**
 * Every entry at or beneath `entry`, inclusive — what `rm -r` would actually take.
 *
 * `regenerable` and `gitIgnored` are inherited downwards, because they are
 * properties of a subtree rather than of a single file: every file under
 * node_modules is regenerable precisely because node_modules is, and marking
 * only the top directory would report 40,000 individually doomed files.
 */
export function flatten(entry: ResolvedEntry, inherited: Partial<VNode> = {}): ResolvedEntry[] {
  const node: VNode = {
    ...entry.node,
    regenerable: entry.node.regenerable ?? inherited.regenerable,
    gitIgnored: entry.node.gitIgnored ?? inherited.gitIgnored,
  };
  const out: ResolvedEntry[] = [{ path: entry.path, node }];
  const passDown: Partial<VNode> = {
    regenerable: node.regenerable,
    gitIgnored: node.gitIgnored,
  };
  for (const child of entry.node.children ?? []) {
    out.push(...flatten({ path: `${entry.path}/${child.name}`, node: child }, passDown));
  }
  return out;
}

/** Bytes held by a node, counting children for directories. */
export function sizeOf(node: VNode): number {
  if (node.type === "file") return node.size ?? 0;
  return (node.children ?? []).reduce((sum, c) => sum + sizeOf(c), 0);
}

/** How this node comes back from the dead — the whole point of the tool. */
export function recoveryOf(node: VNode): { recovery: Recovery; reason: string } {
  if (node.secret) {
    return {
      recovery: "gone-secret",
      reason: "Holds credentials and is git-ignored — there is no copy. Rotate the keys.",
    };
  }
  if (node.regenerable) {
    return { recovery: "regenerable", reason: "Rebuildable from a lockfile or build step." };
  }
  if (node.gitTracked && node.modified) {
    return {
      recovery: "partial",
      reason: "Committed, but has uncommitted edits — `git checkout` restores the file and loses today's work.",
    };
  }
  if (node.gitTracked) {
    return { recovery: "committed", reason: "In the last commit — `git checkout` brings it back." };
  }
  return {
    recovery: "gone",
    reason: node.gitIgnored
      ? "Git-ignored, so git has never seen it. Nothing to restore from."
      : "Untracked — never committed, so no copy exists.",
  };
}
