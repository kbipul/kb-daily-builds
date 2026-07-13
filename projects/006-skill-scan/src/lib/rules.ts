/**
 * The rule engine — pure functions, no DOM, fully unit-testable.
 *
 * A "skill" file is markdown (usually with YAML frontmatter) that gets loaded
 * into an AI agent's context. That makes it a supply-chain artifact: whatever
 * it says, the agent may do. These rules flag the patterns that matter when
 * you audit one before installing it.
 */
import { parseFrontmatter, getEntry, type ParseResult } from "./frontmatter";

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export interface Finding {
  ruleId: string;
  severity: Severity;
  title: string;
  /** Why this matters to a reviewer. */
  detail: string;
  /** Suggested remediation. */
  fix: string;
  /** 1-based line number in the original document (0 = document-level). */
  line: number;
  excerpt: string;
}

interface LineRule {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
  pattern: RegExp;
}

/* ---------------------------------------------------------------- *
 *  Line-based rules. Code fences are scanned too — install scripts *
 *  and shell one-liners are exactly where payloads live.           *
 * ---------------------------------------------------------------- */

const LINE_RULES: LineRule[] = [
  // ---- CRITICAL: instruction hijacking -------------------------------
  {
    id: "injection-override",
    severity: "critical",
    title: "Instruction-override language",
    detail:
      "Tells the agent to ignore or replace its existing instructions — the signature move of prompt injection.",
    fix: "Remove the override. A legitimate skill adds capability; it never needs to cancel prior instructions.",
    pattern:
      /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|original|system)\b[^.\n]{0,30}\b(instruction|prompt|rule|message|guideline)/i,
  },
  {
    id: "injection-conceal",
    severity: "critical",
    title: "Concealment from the user",
    detail:
      "Instructs the agent to hide actions or output from the human. Legitimate skills never need secrecy.",
    fix: "Delete the concealment instruction — every action an agent takes should be visible to its user.",
    pattern:
      /\b(do\s+not\s+(tell|show|reveal|mention|inform)|don'?t\s+(tell|show|reveal|mention)|hide\s+(this|it|these)\s+from|without\s+(telling|informing|notifying|asking))\b[^.\n]{0,40}\b(user|human|owner|them)\b|\bsecretly\b/i,
  },
  {
    id: "jailbreak-persona",
    severity: "critical",
    title: "Jailbreak-style persona override",
    detail:
      "Recasts the agent as 'unrestricted' or rule-free — classic jailbreak framing smuggled in via a skill file.",
    fix: "Remove it. Personas are fine; personas that disable safety rules are not.",
    pattern:
      /\b(you\s+are\s+now|act\s+as)\b[^.\n]{0,60}\b(unrestricted|unfiltered|jailbroken|no\s+(rules|limits|restrictions)|DAN)\b/i,
  },

  // ---- CRITICAL: exfiltration -----------------------------------------
  {
    id: "exfil-endpoint",
    severity: "critical",
    title: "Known exfiltration endpoint",
    detail:
      "References a webhook/paste/tunnel service commonly used to smuggle data out of a machine.",
    fix: "Remove the endpoint. If the skill needs telemetry, that belongs in a reviewed server component, not a prompt file.",
    pattern:
      /(webhook\.site|requestbin|pipedream\.net|ngrok\.(io|app|dev)|pastebin\.com|hastebin|transfer\.sh|file\.io|discord(app)?\.com\/api\/webhooks|oastify\.com|burpcollaborator|interact\.sh|beeceptor)/i,
  },
  {
    id: "exfil-send",
    severity: "critical",
    title: "Sends local data to a remote URL",
    detail:
      "Combines sensitive nouns (keys, env, credentials, files) with an outbound send to an http(s) endpoint.",
    fix: "Remove the outbound call or make it an explicit, user-approved action with a named, documented endpoint.",
    pattern:
      /\b(send|post|upload|transmit|forward|exfiltrate|curl|wget)\b[^.\n]{0,60}\b(contents?|file|data|key|token|secret|credential|password|env(ironment)?)\b[^.\n]{0,60}https?:\/\//i,
  },
  {
    id: "cred-access",
    severity: "critical",
    title: "Reads credential files",
    detail:
      "Actively reads SSH keys, cloud credentials, tokens or env files — the crown jewels of a developer machine.",
    fix: "Skills must never touch credential stores. Remove the access; pass secrets via documented env vars if truly needed.",
    pattern:
      /\b(cat|read|open|copy|cp|type|less|head|tail|source|load|print|show|grep)\b[^\n]{0,50}(~\/\.ssh|id_rsa|id_ed25519|\.aws\/credentials|\.netrc|\.npmrc|\.git-credentials|\.kube\/config|\.env\b|\.pgpass)/i,
  },
  {
    id: "destructive-cmd",
    severity: "critical",
    title: "Destructive command",
    detail: "Contains a command that can irreversibly destroy data or the system.",
    fix: "Remove it. No skill needs recursive force-deletes, disk formatting or force-pushes.",
    pattern:
      /(rm\s+-rf?\s+[~\/]|mkfs\.|dd\s+if=|:\(\)\s*\{\s*:\|:|chmod\s+(-R\s+)?777\s+\/|git\s+push\s+[^\n]{0,20}--force|DROP\s+TABLE|format\s+c:)/i,
  },
  {
    id: "private-key-block",
    severity: "critical",
    title: "Embedded private key",
    detail: "Contains what looks like a PEM private-key block.",
    fix: "Remove the key immediately and rotate it — it must be considered compromised.",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },

  // ---- HIGH: dangerous execution patterns ------------------------------
  {
    id: "pipe-to-shell",
    severity: "high",
    title: "Pipes a download straight into a shell",
    detail:
      "curl|bash-style installs execute unreviewed remote code with your permissions — a classic supply-chain vector.",
    fix: "Download first, inspect, then run. Or install from a pinned, checksummed package.",
    pattern:
      /((curl|wget)[^|\n]{0,120}\|\s*(sudo\s+)?(ba|z|fi|da)?sh\b)|((iwr|invoke-webrequest)[^|\n]{0,120}\|\s*iex)/i,
  },
  {
    id: "powershell-encoded",
    severity: "high",
    title: "Encoded PowerShell command",
    detail: "-EncodedCommand hides what actually runs — a favourite of malware droppers.",
    fix: "Replace with the plain-text command so reviewers can read it.",
    pattern: /powershell[^\n]{0,40}-enc(odedcommand)?\b|\bInvoke-Expression\b|\biex\s*\(/i,
  },
  {
    id: "eval-exec",
    severity: "high",
    title: "Dynamic code evaluation",
    detail: "eval()/exec() on constructed strings makes behaviour impossible to audit statically.",
    fix: "Replace dynamic evaluation with explicit, reviewable code paths.",
    pattern: /\b(eval|exec)\s*\(/,
  },
  {
    id: "base64-blob",
    severity: "high",
    title: "Large base64 blob",
    detail: "A long opaque payload the reviewer cannot read is a red flag in a plain-text skill file.",
    fix: "Ship content in cleartext, or reference a versioned file in the repo instead.",
    pattern: /[A-Za-z0-9+/]{80,}={0,2}/,
  },
  {
    id: "zero-width-chars",
    severity: "high",
    title: "Invisible zero-width characters",
    detail:
      "Zero-width characters can hide instructions from human reviewers while remaining visible to the model.",
    fix: "Strip all zero-width/invisible characters from the file.",
    pattern: /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/,
  },
  {
    id: "auto-approve",
    severity: "high",
    title: "Disables permission prompts",
    detail: "Requests skipping confirmation prompts, removing the human from the loop for risky actions.",
    fix: "Let the agent's normal permission flow stand; never pre-approve everything.",
    pattern: /(dangerously-skip-permissions|--dangerously|auto[-\s]?approve\s+(all|everything)|bypass\s+permissions?)/i,
  },
  {
    id: "cred-mention",
    severity: "high",
    title: "References credential material",
    detail: "Mentions API keys, tokens or secrets in an instruction context — check what it wants them for.",
    fix: "If the skill needs a key, document a single env var and never echo or store it elsewhere.",
    pattern: /\b(api[-_\s]?key|access[-_\s]?token|client[-_\s]?secret|printenv|process\.env|env\s*\|\s*grep)\b/i,
  },

  // ---- MEDIUM ----------------------------------------------------------
  {
    id: "urgency-pressure",
    severity: "medium",
    title: "Urgency / compliance pressure",
    detail:
      "ALL-CAPS urgency and 'must comply' phrasing are social-engineering tells aimed at the model, not the reader.",
    fix: "State behaviour plainly; a skill never needs to shout at the model.",
    pattern:
      /\b(URGENT|IMMEDIATELY|CRITICAL:|MUST\s+comply|failure\s+to\s+comply|you\s+must\s+obey|non-?negotiable)\b/,
  },
  {
    id: "global-install",
    severity: "medium",
    title: "Global package install",
    detail: "npm -g / system-wide installs change the whole machine, not just the project.",
    fix: "Prefer project-local installs or npx with a pinned version.",
    pattern: /\bnpm\s+i(nstall)?\s+(-g|--global)\b|\bpip\s+install\s+[^\n]{0,60}--break-system-packages/i,
  },
  {
    id: "sudo-usage",
    severity: "medium",
    title: "Elevated privileges (sudo)",
    detail: "Root access inside an agent-driven workflow amplifies every other risk in this file.",
    fix: "Drop sudo; if elevation is unavoidable, isolate it in a documented manual step.",
    pattern: /\bsudo\s+\w/,
  },
  {
    id: "unpinned-remote",
    severity: "medium",
    title: "Unpinned remote execution",
    detail:
      "Installing or running a package at @latest (or straight from a URL) executes whatever the registry serves tomorrow — today's review says nothing about tomorrow's code.",
    fix: "Pin an exact version (and ideally a checksum).",
    pattern:
      /\b(npx|npm\s+i(nstall)?|pnpm\s+(add|dlx)|yarn\s+(add|dlx)|bunx?|pip\s+install|uvx?)\b[^\n]{0,60}@latest\b|\bnpx\s+https?:\/\//i,
  },
  {
    id: "raw-network-call",
    severity: "medium",
    title: "Outbound network call",
    detail: "The skill instructs the agent to hit an external endpoint — verify the destination is one you trust.",
    fix: "Document why the call is needed and restrict it to a named, trusted host.",
    pattern: /\b(curl|wget|fetch|httpie|http\s+(get|post))\b\s+[^\n]{0,10}https?:\/\//i,
  },

  // ---- LOW: quality lints ----------------------------------------------
  {
    id: "unfilled-placeholder",
    severity: "low",
    title: "Unfilled template placeholder",
    detail: "Left-over {{PLACEHOLDER}} text means the file shipped half-finished.",
    fix: "Fill or remove the placeholder.",
    pattern: /\{\{[A-Z][A-Z0-9_\- ]*\}\}/,
  },
  {
    id: "todo-marker",
    severity: "low",
    title: "TODO/FIXME marker",
    detail: "Unfinished sections in an installed skill become unfinished agent behaviour.",
    fix: "Resolve the TODO before publishing the skill.",
    pattern: /\b(TODO|FIXME|XXX)\b/,
  },
];

/* ---------------------------------------------------------------- *
 *  Document-level rules (frontmatter, structure, hidden content).  *
 * ---------------------------------------------------------------- */

function documentFindings(text: string, fm: ParseResult): Finding[] {
  const out: Finding[] = [];

  // Hidden instructions inside HTML comments (may span multiple lines).
  const commentRe = /<!--([\s\S]{0,400}?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = commentRe.exec(text)) !== null) {
    if (/(instruction|ignore|system prompt|secret|do not tell|hidden)/i.test(m[1])) {
      out.push({
        ruleId: "hidden-comment",
        severity: "high",
        title: "Instructions hidden in an HTML comment",
        detail:
          "HTML comments are invisible in rendered markdown but fully visible to the model — a hiding spot for injected instructions.",
        fix: "Delete the comment or move its content into the visible body.",
        line: text.slice(0, m.index).split("\n").length,
        excerpt: trimExcerpt(m[0].replace(/\n/g, " ")),
      });
    }
  }

  if (!fm.present) {
    out.push(mkDoc("no-frontmatter", "low", "No frontmatter block",
      "Without name/description metadata the agent can't decide when to trigger the skill.",
      "Add a --- frontmatter block with at least name and description."));
    return out;
  }

  const name = getEntry(fm, "name");
  const desc = getEntry(fm, "description");
  if (!name) {
    out.push(mkDoc("missing-name", "low", "Missing 'name' in frontmatter",
      "Skills without a name are hard to reference, audit and revoke.",
      "Add a short kebab-case name."));
  }
  if (!desc) {
    out.push(mkDoc("missing-description", "low", "Missing 'description' in frontmatter",
      "The description is what the agent uses to decide when to load the skill.",
      "Add a description saying what the skill does and when to trigger it."));
  } else {
    const d = String(desc.value);
    if (d.length < 30) {
      out.push({
        ruleId: "short-description",
        severity: "low",
        title: "Description too thin",
        detail: "A vague description causes wrong-time triggering — a reliability and safety issue.",
        fix: "Describe what it does AND when it should trigger (aim for a sentence or two).",
        line: desc.line,
        excerpt: trimExcerpt(`description: ${d}`),
      });
    }
  }

  // Permission breadth.
  const tools = getEntry(fm, "allowed-tools", "allowedTools", "tools");
  if (tools) {
    const flat = Array.isArray(tools.value) ? tools.value.join(", ") : String(tools.value);
    const broad =
      /(^|[,\s])\*([,\s]|$)/.test(flat) ||
      /\bBash\s*\(\s*\*/.test(flat) ||
      /(^|,\s*)Bash(\s*(,|$))/.test(flat);
    if (broad) {
      out.push({
        ruleId: "broad-permissions",
        severity: "high",
        title: "Over-broad tool permissions",
        detail:
          `Grants unrestricted tools (${trimExcerpt(flat)}) — any flaw elsewhere in the file becomes exploitable with full power.`,
        fix: "Scope tools to the narrowest set, e.g. Bash(git status:*) instead of Bash or *.",
        line: tools.line,
        excerpt: trimExcerpt(`allowed-tools: ${flat}`),
      });
    }
  }

  return out;
}

function mkDoc(ruleId: string, severity: Severity, title: string, detail: string, fix: string): Finding {
  return { ruleId, severity, title, detail, fix, line: 0, excerpt: "" };
}

function trimExcerpt(s: string): string {
  const t = s.trim();
  return t.length > 120 ? t.slice(0, 117) + "…" : t;
}

/** Rank helper: lower index = more severe. */
export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

/**
 * Scan a skill document and return all findings, sorted by severity then line.
 */
export function scan(text: string): Finding[] {
  const fm = parseFrontmatter(text);
  const lines = text.split("\n");
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of LINE_RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          detail: rule.detail,
          fix: rule.fix,
          line: i + 1,
          excerpt: trimExcerpt(line) || "(invisible characters)",
        });
      }
    }
  }

  findings.push(...documentFindings(text, fm));

  // Noise control: if a line already has a critical finding, drop the
  // medium/low findings from that same line (the critical one tells the story).
  const criticalLines = new Set(
    findings.filter((f) => f.severity === "critical" && f.line > 0).map((f) => f.line)
  );
  const filtered = findings.filter(
    (f) =>
      f.severity === "critical" ||
      f.severity === "high" ||
      !criticalLines.has(f.line)
  );

  // De-duplicate identical rule hits on the same line.
  const seen = new Set<string>();
  const unique = filtered.filter((f) => {
    const k = `${f.ruleId}:${f.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return unique.sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.line - b.line
  );
}
