/** Every identifier family the scanner knows about. */
export type DetectorId =
  | 'aadhaar'
  | 'pan'
  | 'gstin'
  | 'ifsc'
  | 'upi'
  | 'email'
  | 'mobile'
  | 'vehicle'
  | 'epic'
  | 'pincode';

/**
 * How much the engine actually knows — deliberately three tiers, not a
 * fake percentage.
 *
 * - `certain`  a mathematical check passed (Verhoeff, GSTIN mod-36). A random
 *              string of the right shape fails these ~90% of the time.
 * - `likely`   structure is constrained beyond "right number of characters"
 *              (PAN entity letter, IFSC reserved zero, known UPI handle).
 * - `possible` shape-only. High false-positive rate BY CONSTRUCTION — a
 *              6-digit PIN code is indistinguishable from an invoice number.
 */
export type Confidence = 'certain' | 'likely' | 'possible';

export interface Finding {
  detector: DetectorId;
  /** Human label used in the redaction placeholder, e.g. AADHAAR. */
  label: string;
  /** Offsets into the ORIGINAL input string (native-digit safe). */
  start: number;
  end: number;
  /** Exact original substring, including any native-script digits. */
  raw: string;
  /** ASCII-normalised, separator-stripped form used for validation. */
  normalized: string;
  confidence: Confidence;
  /** Why the engine landed on that tier — shown verbatim in the UI. */
  reason: string;
  /** True when the match contained non-ASCII (e.g. Devanagari) digits. */
  nativeDigits: boolean;
}

export type RedactionMode = 'label' | 'block' | 'partial';

export interface ScanOptions {
  /** Detectors to run. Defaults to all. */
  enabled?: DetectorId[];
  /** Drop `possible`-tier findings entirely. */
  minConfidence?: Confidence;
}

export interface ScanResult {
  findings: Finding[];
  counts: Record<Confidence, number>;
  byDetector: Partial<Record<DetectorId, number>>;
}

export const CONFIDENCE_RANK: Record<Confidence, number> = {
  possible: 0,
  likely: 1,
  certain: 2,
};
