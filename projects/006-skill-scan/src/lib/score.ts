import type { Finding, Severity } from "./rules";

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ScoreResult {
  score: number; // 0..100
  grade: Grade;
  verdict: string;
}

/** Deduction per finding, and a per-rule cap so one noisy rule can't zero the file alone. */
const WEIGHT: Record<Severity, number> = { critical: 30, high: 15, medium: 7, low: 3 };
const CAP_MULTIPLIER = 2;

export function scoreFindings(findings: Finding[]): ScoreResult {
  const byRule = new Map<string, number>();
  let deduction = 0;

  for (const f of findings) {
    const w = WEIGHT[f.severity];
    const used = byRule.get(f.ruleId) ?? 0;
    const allowed = Math.max(0, w * CAP_MULTIPLIER - used);
    const applied = Math.min(w, allowed);
    byRule.set(f.ruleId, used + applied);
    deduction += applied;
  }

  const score = Math.max(0, 100 - deduction);
  const hasCritical = findings.some((f) => f.severity === "critical");
  const grade = toGrade(score, hasCritical);

  return { score, grade, verdict: verdictFor(score, hasCritical) };
}

function toGrade(score: number, hasCritical: boolean): Grade {
  if (hasCritical) return score >= 50 ? "D" : "F"; // criticals cap the grade
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function verdictFor(score: number, hasCritical: boolean): string {
  if (hasCritical)
    return "Do not install. Contains patterns consistent with prompt injection or data exfiltration.";
  if (score >= 90) return "Looks clean. A quick human read-through is still good practice.";
  if (score >= 75) return "Mostly fine — review the flagged lines before installing.";
  if (score >= 60) return "Install only after fixing the flagged issues.";
  return "High risk — this file needs a full manual review before it goes anywhere near an agent.";
}
