import { DETECTORS, runDetector } from './detectors';
import { normalizeDigits } from './normalize';
import { CONFIDENCE_RANK } from './types';
import type { Confidence, DetectorId, Finding, ScanOptions, ScanResult } from './types';

/**
 * Two matches can cover the same characters — an Aadhaar contains a 10-digit
 * run that looks like a mobile number, a GSTIN contains a PAN. Rather than
 * reporting both, the higher-priority detector wins and swallows the range.
 * Where priority ties, the stronger confidence tier wins, then the longer span.
 */
export function resolveOverlaps(findings: Finding[]): Finding[] {
  const priority = new Map<DetectorId, number>(DETECTORS.map((d) => [d.id, d.priority]));
  const ranked = [...findings].sort((a, b) => {
    const pa = priority.get(a.detector) ?? 0;
    const pb = priority.get(b.detector) ?? 0;
    if (pa !== pb) return pb - pa;
    const ca = CONFIDENCE_RANK[a.confidence];
    const cb = CONFIDENCE_RANK[b.confidence];
    if (ca !== cb) return cb - ca;
    return b.end - b.start - (a.end - a.start);
  });

  const kept: Finding[] = [];
  for (const candidate of ranked) {
    const clashes = kept.some((k) => candidate.start < k.end && k.start < candidate.end);
    if (!clashes) kept.push(candidate);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** Scan text for Indian personal identifiers. Pure function, no I/O, no network. */
export function scan(text: string, options: ScanOptions = {}): ScanResult {
  const enabled = options.enabled ?? DETECTORS.map((d) => d.id);
  const floor = CONFIDENCE_RANK[options.minConfidence ?? 'possible'];
  const { text: normalized } = normalizeDigits(text);

  const raw: Finding[] = [];
  for (const detector of DETECTORS) {
    if (!enabled.includes(detector.id)) continue;
    raw.push(...runDetector(detector, normalized, text));
  }

  const findings = resolveOverlaps(raw).filter(
    (f) => CONFIDENCE_RANK[f.confidence] >= floor
  );

  const counts: Record<Confidence, number> = { certain: 0, likely: 0, possible: 0 };
  const byDetector: Partial<Record<DetectorId, number>> = {};
  for (const f of findings) {
    counts[f.confidence]++;
    byDetector[f.detector] = (byDetector[f.detector] ?? 0) + 1;
  }

  return { findings, counts, byDetector };
}
