import { scan, type Finding, type Severity, SEVERITY_ORDER } from "./rules";
import { scoreFindings, type ScoreResult } from "./score";
import { estimateTokens } from "./tokens";
import { parseFrontmatter, getEntry } from "./frontmatter";

export interface Report extends ScoreResult {
  findings: Finding[];
  tokens: number;
  lineCount: number;
  skillName: string;
  counts: Record<Severity, number>;
}

export function analyze(text: string): Report {
  const findings = scan(text);
  const fm = parseFrontmatter(text);
  const name = getEntry(fm, "name");

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;

  return {
    ...scoreFindings(findings),
    findings,
    tokens: estimateTokens(text),
    lineCount: text ? text.split("\n").length : 0,
    skillName: name ? String(name.value) : "(unnamed skill)",
    counts,
  };
}

/** Render a report as shareable markdown. */
export function reportToMarkdown(r: Report): string {
  const lines: string[] = [
    `# SkillScan report — ${r.skillName}`,
    "",
    `**Grade ${r.grade} (${r.score}/100)** — ${r.verdict}`,
    "",
    `~${r.tokens} tokens · ${r.lineCount} lines · findings: ` +
      SEVERITY_ORDER.map((s) => `${r.counts[s]} ${s}`).join(", "),
    "",
  ];
  for (const sev of SEVERITY_ORDER) {
    const group = r.findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    lines.push(`## ${sev.toUpperCase()}`);
    for (const f of group) {
      lines.push(`- **${f.title}**${f.line ? ` (line ${f.line})` : ""} — ${f.detail}`);
      if (f.excerpt) lines.push(`  - \`${f.excerpt.replace(/`/g, "'")}\``);
      lines.push(`  - Fix: ${f.fix}`);
    }
    lines.push("");
  }
  lines.push("---", "Scanned client-side by SkillScan — https://kbipul.github.io/skill-scan/");
  return lines.join("\n");
}
