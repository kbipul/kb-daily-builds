import { DetectorId, Finding, Grade, NormalizedMemory, ScopeStat, Scope, Severity } from "./types";
import { estimateTokens } from "./tokens";

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 15, medium: 7, low: 2 };
// No single detector class can sink the whole grade — bloat of one kind is
// capped so the score reflects breadth of problems, not one repeated issue.
const PER_DETECTOR_CAP = 30;

export function scopeStats(mem: NormalizedMemory[], now: number): ScopeStat[] {
  const scopes: Scope[] = ["procedural", "user", "session"];
  return scopes.map((scope) => {
    const inScope = mem.filter((m) => m.scope === scope);
    const tokens = inScope.reduce((acc, m) => acc + estimateTokens(m.content), 0);
    const expired = inScope.filter((m) => m.expiresAtMs !== null && now >= m.expiresAtMs).length;
    return { scope, count: inScope.length, tokens, expired };
  });
}

export function gradeFromFindings(findings: Finding[]): Grade {
  const perDetector = new Map<DetectorId, number>();
  for (const f of findings) {
    const cur = perDetector.get(f.detector) ?? 0;
    perDetector.set(f.detector, cur + SEVERITY_WEIGHT[f.severity]);
  }
  let deduction = 0;
  for (const d of perDetector.values()) deduction += Math.min(d, PER_DETECTOR_CAP);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  let letter: Grade["letter"];
  if (score >= 90) letter = "A";
  else if (score >= 80) letter = "B";
  else if (score >= 70) letter = "C";
  else if (score >= 60) letter = "D";
  else letter = "F";
  return { score, letter };
}

export function countBy(findings: Finding[]) {
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  const byDetector = {} as Record<DetectorId, number>;
  for (const f of findings) {
    bySeverity[f.severity]++;
    byDetector[f.detector] = (byDetector[f.detector] ?? 0) + 1;
  }
  return { bySeverity, byDetector };
}
