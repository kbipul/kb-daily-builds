/**
 * The simulator. Takes a parsed command, walks the virtual filesystem, and
 * reports what a real run would have destroyed — plus whether any of it comes
 * back.
 *
 * Design rule: never guess in the user's favour. An unrecognised command
 * reports `unknown` rather than "safe", because "the tool said nothing" must
 * never read as "the tool said yes".
 */
import type { Casualty, Finding, Severity, Simulation, VNode } from "./types";
import { maxSeverity } from "./types";
import { DEFAULT_ENV, parse, type ParsedCommand } from "./parse";
import { expand, flatten, normalize, recoveryOf, sizeOf } from "./vfs";

const PROJECT_ROOT = "/home/dev/checkout";

/** Paths where deletion stops being a mistake and becomes an incident. */
const SYSTEM_PATHS = ["/", "/usr", "/etc", "/bin", "/lib", "/var", "/boot", "/home", "/home/dev"];

export interface SimulateOptions {
  root: VNode;
  env?: Record<string, string>;
  cwd?: string;
}

export function simulate(input: string, options: SimulateOptions): Simulation {
  const { root, env = DEFAULT_ENV, cwd = PROJECT_ROOT } = options;
  const parsed = parse(input, env);

  const casualties: Casualty[] = [];
  const findings: Finding[] = [];
  let severity: Severity = "safe";
  let unknown = parsed.commands.length === 0;
  let rewrite: string | null = null;
  let rewriteNote: string | null = null;

  if (parsed.unsetVars.length > 0) {
    findings.push({
      id: "unset-var",
      severity: "catastrophic",
      title: `Unset variable: ${parsed.unsetVars.map((v) => "$" + v).join(", ")}`,
      detail:
        "The shell expands an unset variable to an empty string without warning. " +
        `\`${input.trim()}\` is not the command that runs — the expanded line below is. ` +
        "This is the exact mechanism behind the Steam client's `rm -rf \"$STEAMROOT/\"*` " +
        "wipe and Bumblebee's `rm -rf /usr $LIB/...`. Add `set -u` and the shell refuses instead.",
    });
    severity = "catastrophic";
  }

  if (parsed.pipedToShell) {
    findings.push({
      id: "pipe-to-shell",
      severity: "destructive",
      title: "Remote code piped straight into a shell",
      detail:
        "Whatever that URL returns executes immediately, with your permissions, unreviewed. " +
        "The server can serve different bytes to curl than to your browser. Download, read, then run.",
    });
    severity = maxSeverity(severity, "destructive");
  }

  for (const command of parsed.commands) {
    const result = simulateOne(command, root, cwd);
    casualties.push(...result.casualties);
    findings.push(...result.findings);
    severity = maxSeverity(severity, result.severity);
    if (result.rewrite && !rewrite) {
      rewrite = result.rewrite;
      rewriteNote = result.rewriteNote;
    }
    if (!result.recognised) unknown = true;
  }

  // De-duplicate casualties across a chained command line.
  const seen = new Set<string>();
  const unique = casualties.filter((c) => (seen.has(c.path) ? false : (seen.add(c.path), true)));

  const escapesRoot = unique.some((c) => !c.path.startsWith(PROJECT_ROOT));
  if (escapesRoot) {
    findings.push({
      id: "escapes-root",
      severity: "catastrophic",
      title: "Blast radius leaves the project directory",
      detail:
        "This command reaches outside the checkout it was supposed to be working in. " +
        "An agent scoped to a repo should never be able to touch paths above it.",
    });
    severity = "catastrophic";
  }

  const secrets = unique.filter((c) => c.recovery === "gone-secret");
  if (secrets.length > 0) {
    findings.push({
      id: "secrets",
      severity: "catastrophic",
      title: `${secrets.length} credential file${secrets.length > 1 ? "s" : ""} destroyed`,
      detail:
        "Secrets are git-ignored by definition, so git cannot restore them. " +
        "Anything that was only in these files is gone, and anything that leaked must be rotated.",
    });
    severity = "catastrophic";
  }

  const unrecoverable = unique.filter(
    (c) => c.type === "file" && (c.recovery === "gone" || c.recovery === "gone-secret"),
  );
  if (unrecoverable.length > 0 && severity === "safe") severity = "destructive";

  const bytesDestroyed = unique
    .filter((c) => c.type === "file")
    .reduce((sum, c) => sum + c.size, 0);

  return {
    input,
    expanded: parsed.expanded,
    expansionChanged: parsed.expansionChanged,
    severity,
    verdict: verdictFor(severity, unique, unknown),
    casualties: unique,
    findings,
    rewrite,
    rewriteNote,
    escapesRoot,
    bytesDestroyed,
    unknown,
  };
}

interface OneResult {
  casualties: Casualty[];
  findings: Finding[];
  severity: Severity;
  rewrite: string | null;
  rewriteNote: string | null;
  recognised: boolean;
}

function empty(recognised: boolean): OneResult {
  return { casualties: [], findings: [], severity: "safe", rewrite: null, rewriteNote: null, recognised };
}

function simulateOne(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  switch (command.name) {
    case "rm":
      return simulateRm(command, root, cwd);
    case "git":
      return simulateGit(command, root, cwd);
    case "mv":
      return simulateMv(command, root, cwd);
    case "find":
      return simulateFind(command, root, cwd);
    case "dd":
      return simulateDd(command);
    case "chmod":
    case "chown":
      return simulateOwnership(command);
    case "docker":
      return simulateDocker(command);
    case "kubectl":
      return simulateKubectl(command);
    case "truncate":
      return simulateTruncate(command, root, cwd);
    // Read-only commands we recognise and can honestly call safe.
    case "ls":
    case "cat":
    case "grep":
    case "echo":
    case "pwd":
    case "head":
    case "tail":
    case "wc":
    case "curl":
    case "which":
    case "stat":
      return empty(true);
    default:
      return empty(false);
  }
}

/** Collect every entry a recursive delete of these paths would take. */
function collect(paths: string[], root: VNode, cwd: string): Casualty[] {
  const casualties: Casualty[] = [];
  for (const path of paths) {
    for (const entry of expand(root, path, cwd)) {
      for (const victim of flatten(entry)) {
        const { recovery, reason } = recoveryOf(victim.node);
        casualties.push({
          path: victim.path,
          type: victim.node.type,
          size: sizeOf(victim.node),
          recovery,
          reason,
        });
      }
    }
  }
  return casualties;
}

function simulateRm(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  const recursive = command.flags.includes("r") || command.flags.includes("R") || command.flags.includes("--recursive");
  const force = command.flags.includes("f") || command.flags.includes("--force");
  const findings: Finding[] = [];
  let severity: Severity = "caution";

  // A system path is a category error, whether or not it matches our tree.
  for (const arg of command.args) {
    const target = normalize(arg, cwd);
    if (SYSTEM_PATHS.includes(target) && recursive) {
      findings.push({
        id: "system-path",
        severity: "catastrophic",
        title: `Recursive delete of a system path: ${target}`,
        detail:
          target === "/"
            ? "This is `rm -rf /`. On a real machine with --no-preserve-root, or via an expansion that produced `/`, this ends the machine."
            : `${target} is owned by the operating system, not by this project. Removing it recursively breaks the box.`,
      });
      severity = "catastrophic";
    }
  }

  if (!recursive) {
    // Without -r, `rm` refuses directories outright and never descends into
    // them, so only the top-level files that matched actually die.
    const files: Casualty[] = [];
    for (const arg of command.args) {
      for (const entry of expand(root, arg, cwd)) {
        if (entry.node.type !== "file") continue;
        const { recovery, reason } = recoveryOf(entry.node);
        files.push({ path: entry.path, type: "file", size: sizeOf(entry.node), recovery, reason });
      }
    }
    const lethal = files.some((c) => c.recovery === "gone" || c.recovery === "gone-secret");
    return {
      casualties: files,
      findings,
      severity: files.length === 0 ? "safe" : lethal ? "destructive" : "caution",
      rewrite: null,
      rewriteNote: null,
      recognised: true,
    };
  }

  const casualties = collect(command.args, root, cwd);
  const anyUnrecoverable = casualties.some(
    (c) => c.type === "file" && (c.recovery === "gone" || c.recovery === "gone-secret"),
  );
  if (anyUnrecoverable) severity = maxSeverity(severity, "destructive");

  if (force && command.args.some((a) => /[*?]/.test(a))) {
    findings.push({
      id: "force-glob",
      severity: "destructive",
      title: "`-f` silences the only warning you would have got",
      detail:
        "With a glob, `rm -rf` deletes whatever the shell hands it and reports nothing. " +
        "Run the same glob through `ls` first and read the list.",
    });
    severity = maxSeverity(severity, "destructive");
  }

  const rewrite =
    casualties.length > 0
      ? `ls -d ${command.args.join(" ")}   # read this list first, then delete`
      : null;

  return {
    casualties,
    findings,
    severity: casualties.length === 0 ? "safe" : severity,
    rewrite,
    rewriteNote: rewrite
      ? "`rm` cannot be undone and there is no trash. Print the target list with `ls -d` and read it before deleting."
      : null,
    recognised: true,
  };
}

function simulateGit(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  const sub = command.args[0];

  if (sub === "clean") {
    const removesIgnored = command.flags.includes("x");
    const includesDirs = command.flags.includes("d");
    const dryRun = command.flags.includes("n") || command.flags.includes("--dry-run");
    if (dryRun) return empty(true);

    const all = flatten({ path: cwd, node: lookupOrEmpty(root, cwd) });
    const doomed = all.filter((e) => {
      if (e.node.type === "dir" && !includesDirs) return false;
      if (e.node.gitTracked) return false;
      if (e.node.gitIgnored && !removesIgnored) return false;
      return true;
    });

    const casualties: Casualty[] = doomed.map((e) => {
      const { recovery, reason } = recoveryOf(e.node);
      return { path: e.path, type: e.node.type, size: sizeOf(e.node), recovery, reason };
    });

    return {
      casualties,
      findings: [
        {
          id: "git-clean",
          severity: removesIgnored ? "catastrophic" : "destructive",
          title: removesIgnored
            ? "`git clean -x` deletes git-ignored files too"
            : "`git clean` deletes untracked files permanently",
          detail: removesIgnored
            ? "`-x` adds everything .gitignore hides: .env, local configs, caches. Git has never seen these files, so `git reflog` cannot help. This is the single most common way people lose their .env."
            : "Untracked means git holds no copy. Nothing here is in the reflog.",
        },
      ],
      severity: removesIgnored ? "catastrophic" : "destructive",
      rewrite: `git clean -${includesDirs ? "d" : ""}${removesIgnored ? "x" : ""}n   # -n prints the list without deleting`,
      rewriteNote:
        "`git clean` has a dry-run flag. `-n` prints exactly what would go, and costs one second.",
      recognised: true,
    };
  }

  if (sub === "reset" && command.flags.includes("--hard")) {
    const all = flatten({ path: cwd, node: lookupOrEmpty(root, cwd) });
    const modified = all.filter((e) => e.node.modified);
    const casualties: Casualty[] = modified.map((e) => ({
      path: e.path,
      type: e.node.type,
      size: sizeOf(e.node),
      recovery: "partial",
      reason: "Uncommitted edits are discarded; the last committed version survives.",
    }));
    return {
      casualties,
      findings: [
        {
          id: "reset-hard",
          severity: "destructive",
          title: "`git reset --hard` discards every uncommitted edit",
          detail:
            "Committed work is recoverable through `git reflog` for ~90 days. Work that was never committed was never in git, so it is simply gone.",
        },
      ],
      severity: casualties.length > 0 ? "destructive" : "caution",
      rewrite: "git stash --include-untracked   # same clean tree, fully reversible",
      rewriteNote:
        "`git stash` gets you the same clean working tree and gives it all back with `git stash pop`.",
      recognised: true,
    };
  }

  if (sub === "push" && (command.flags.includes("f") || command.flags.includes("--force"))) {
    return {
      casualties: [],
      findings: [
        {
          id: "force-push",
          severity: "destructive",
          title: "`git push --force` overwrites the remote branch",
          detail:
            "Commits your teammates already pulled stop existing upstream. `--force-with-lease` refuses if the remote moved since you last fetched — same intent, checks first.",
        },
      ],
      severity: "destructive",
      rewrite: "git push --force-with-lease",
      rewriteNote: "`--force-with-lease` does what you meant and refuses when someone else has pushed.",
      recognised: true,
    };
  }

  if (sub === "checkout" && command.args.includes(".")) {
    const all = flatten({ path: cwd, node: lookupOrEmpty(root, cwd) });
    const casualties: Casualty[] = all
      .filter((e) => e.node.modified)
      .map((e) => ({
        path: e.path,
        type: e.node.type,
        size: sizeOf(e.node),
        recovery: "partial",
        reason: "Working-tree edits reverted to the last commit.",
      }));
    return {
      casualties,
      findings: [
        {
          id: "checkout-dot",
          severity: "destructive",
          title: "`git checkout .` throws away working-tree edits",
          detail: "There is no undo and no reflog entry — these edits were never objects in git.",
        },
      ],
      severity: casualties.length > 0 ? "destructive" : "safe",
      rewrite: "git stash --include-untracked",
      rewriteNote: "Stash instead: identical result, and you can change your mind.",
      recognised: true,
    };
  }

  return empty(true);
}

function lookupOrEmpty(root: VNode, path: string): VNode {
  const parts = normalize(path).split("/").filter(Boolean);
  let node: VNode = root;
  for (const part of parts) {
    const next = node.children?.find((c) => c.name === part);
    if (!next) return { name: "", type: "dir", children: [] };
    node = next;
  }
  return node;
}

function simulateMv(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  if (command.args.length < 2) return empty(true);
  const destination = command.args[command.args.length - 1];
  const target = normalize(destination, cwd);
  if (target === "/dev/null") {
    const casualties = collect(command.args.slice(0, -1), root, cwd);
    return {
      casualties,
      findings: [
        {
          id: "mv-devnull",
          severity: "catastrophic",
          title: "Moving to /dev/null destroys the data",
          detail: "/dev/null is not a directory. Anything moved there is discarded by the kernel.",
        },
      ],
      severity: "catastrophic",
      rewrite: null,
      rewriteNote: null,
      recognised: true,
    };
  }
  // Overwriting an existing destination file is a quiet data loss.
  const existing = expand(root, destination, cwd).filter((e) => e.node.type === "file");
  const casualties: Casualty[] = existing.map((e) => {
    const { recovery, reason } = recoveryOf(e.node);
    return { path: e.path, type: "file", size: sizeOf(e.node), recovery, reason };
  });
  return {
    casualties,
    findings: casualties.length
      ? [
          {
            id: "mv-overwrite",
            severity: "caution",
            title: "Destination already exists and will be overwritten",
            detail: "`mv` clobbers the destination without asking. `mv -n` refuses instead.",
          },
        ]
      : [],
    severity: casualties.length ? "caution" : "safe",
    rewrite: casualties.length ? `mv -n ${command.args.join(" ")}` : null,
    rewriteNote: casualties.length ? "`-n` (no-clobber) makes `mv` refuse rather than overwrite." : null,
    recognised: true,
  };
}

function simulateFind(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  // `find` predicates are single-dash long words, so read the untouched tokens.
  const deletes = command.rawArgs.includes("-delete");
  const execRm = /-exec\s+rm\b/.test(command.text);
  if (!deletes && !execRm) return empty(true);

  const nameIndex = command.rawArgs.findIndex((a) => a === "-name");
  const pattern = nameIndex >= 0 ? command.rawArgs[nameIndex + 1] : "*";
  const base = command.rawArgs[0] && !command.rawArgs[0].startsWith("-") ? command.rawArgs[0] : ".";
  const casualties = collect([`${base}/**/${pattern}`, `${base}/${pattern}`], root, cwd);

  return {
    casualties,
    findings: [
      {
        id: "find-delete",
        severity: "destructive",
        title: "`find -delete` acts on every match, silently",
        detail:
          "`-delete` runs as the tree is walked; there is no confirmation and no list. Swap it for `-print` and read the output first.",
      },
    ],
    severity: casualties.length ? "destructive" : "safe",
    rewrite: command.text.replace("-delete", "-print").replace(/-exec\s+rm[^;]*;/, "-print"),
    rewriteNote: "`-print` shows you the same match set without touching it.",
    recognised: true,
  };
}

function simulateDd(command: ParsedCommand): OneResult {
  const of = command.args.find((a) => a.startsWith("of="));
  if (!of) return empty(true);
  const target = of.slice(3);
  const isDisk = /^\/dev\/(sd|nvme|disk|hd)/.test(target);
  return {
    casualties: [],
    findings: [
      {
        id: "dd",
        severity: isDisk ? "catastrophic" : "destructive",
        title: isDisk ? `dd writes raw blocks to ${target}` : `dd overwrites ${target}`,
        detail: isDisk
          ? "This writes over the partition table and filesystem of a whole device. There is no undelete — recovery means a forensics lab. Confirm the device with `lsblk` and understand that a wrong letter is unrecoverable."
          : "dd overwrites the target from byte zero with no confirmation.",
      },
    ],
    severity: isDisk ? "catastrophic" : "destructive",
    rewrite: null,
    rewriteNote: null,
    recognised: true,
  };
}

function simulateOwnership(command: ParsedCommand): OneResult {
  const recursive = command.flags.includes("R");
  const target = command.args[command.args.length - 1] ?? "";
  const normalized = normalize(target);
  const systemWide = SYSTEM_PATHS.includes(normalized);
  if (!recursive) return empty(true);
  return {
    casualties: [],
    findings: [
      {
        id: "chmod-recursive",
        severity: systemWide ? "catastrophic" : "caution",
        title: `Recursive ${command.name} on ${normalized}`,
        detail: systemWide
          ? "Recursively changing permissions or ownership on a system path breaks sudo, ssh and the package manager at once, and there is no record of the previous modes to restore."
          : "Permissions are not stored in git for most files, so the previous modes are not recoverable from the repo.",
      },
    ],
    severity: systemWide ? "catastrophic" : "caution",
    rewrite: null,
    rewriteNote: null,
    recognised: true,
  };
}

function simulateDocker(command: ParsedCommand): OneResult {
  const text = command.text;
  if (text.includes("system prune") && (command.flags.includes("a") || command.flags.includes("--all"))) {
    return {
      casualties: [],
      findings: [
        {
          id: "docker-prune",
          severity: "destructive",
          title: "`docker system prune -a` removes every unused image and volume",
          detail:
            "Anything not attached to a running container goes, including named volumes holding local database state. Images re-pull; volume data does not come back.",
        },
      ],
      severity: "destructive",
      rewrite: "docker system prune   # without -a, and without --volumes",
      rewriteNote: "Dropping `-a` keeps your images; omitting `--volumes` keeps local database state.",
      recognised: true,
    };
  }
  return empty(true);
}

function simulateKubectl(command: ParsedCommand): OneResult {
  if (command.args[0] !== "delete") return empty(true);
  const all = command.flags.includes("--all");
  return {
    casualties: [],
    findings: [
      {
        id: "kubectl-delete",
        severity: all ? "catastrophic" : "destructive",
        title: all ? "`kubectl delete --all` in the current namespace" : "kubectl delete",
        detail: all
          ? "Every resource of that type in the namespace goes. If the context is production, this is an outage — check `kubectl config current-context` first."
          : "Deleted resources come back only if they are in version control and something re-applies them.",
      },
    ],
    severity: all ? "catastrophic" : "destructive",
    rewrite: `${command.text} --dry-run=client`,
    rewriteNote: "`--dry-run=client` prints the target list without contacting the cluster.",
    recognised: true,
  };
}

function simulateTruncate(command: ParsedCommand, root: VNode, cwd: string): OneResult {
  const casualties = collect(
    command.args.filter((a) => !/^\d+$/.test(a)),
    root,
    cwd,
  ).filter((c) => c.type === "file");
  return {
    casualties,
    findings: casualties.length
      ? [
          {
            id: "truncate",
            severity: "destructive",
            title: "truncate empties the file in place",
            detail: "The inode survives, the contents do not. Nothing is moved to trash.",
          },
        ]
      : [],
    severity: casualties.length ? "destructive" : "safe",
    rewrite: null,
    rewriteNote: null,
    recognised: true,
  };
}

function verdictFor(severity: Severity, casualties: Casualty[], unknown: boolean): string {
  if (unknown && casualties.length === 0) {
    return "Not recognised — this simulator does not model this command. That is not the same as safe.";
  }
  const files = casualties.filter((c) => c.type === "file").length;
  const unrecoverable = casualties.filter(
    (c) => c.type === "file" && (c.recovery === "gone" || c.recovery === "gone-secret"),
  ).length;

  switch (severity) {
    case "catastrophic":
      return unrecoverable > 0
        ? `Catastrophic — ${files} files destroyed, ${unrecoverable} of them unrecoverable.`
        : "Catastrophic — this reaches past the project and breaks the machine.";
    case "destructive":
      return `Destructive — ${files} files destroyed, ${unrecoverable} unrecoverable.`;
    case "caution":
      return files > 0 ? `Caution — ${files} files affected, all recoverable.` : "Caution — check before running.";
    default:
      return "Safe — nothing on disk is destroyed.";
  }
}
