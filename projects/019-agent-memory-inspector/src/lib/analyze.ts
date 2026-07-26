import { DetectorOptions, DEFAULT_OPTIONS, runAllDetectors } from "./detectors";
import { normalize } from "./parse";
import { countBy, gradeFromFindings, scopeStats } from "./score";
import { MemoryRecord, NormalizedMemory, Report } from "./types";

export interface AnalyzeOutput {
  report: Report;
  normalized: NormalizedMemory[];
}

/** Full pipeline: normalize -> run detectors -> score. Pure and deterministic. */
export function analyze(records: MemoryRecord[], opts: Partial<DetectorOptions> = {}): AnalyzeOutput {
  const o: DetectorOptions = { ...DEFAULT_OPTIONS, ...opts };
  const normalized = normalize(records);
  const findings = runAllDetectors(normalized, o);
  const { bySeverity, byDetector } = countBy(findings);
  const report: Report = {
    now: o.now,
    total: normalized.length,
    findings,
    countsBySeverity: bySeverity,
    countsByDetector: byDetector,
    scopes: scopeStats(normalized, o.now),
    grade: gradeFromFindings(findings),
  };
  return { report, normalized };
}
