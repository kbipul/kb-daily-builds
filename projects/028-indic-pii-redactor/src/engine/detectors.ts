import type { Confidence, DetectorId, Finding } from './types';
import { isAadhaarShape, verhoeffValidate } from './verhoeff';
import { validateGstin, isValidStateCode } from './gstin';
import { hasNativeDigits, stripSeparators } from './normalize';
import {
  PAN_HOLDER_TYPES,
  UPI_HANDLES,
  VEHICLE_STATE_CODES,
  PIN_ZONES,
} from './reference';

export interface Detector {
  id: DetectorId;
  label: string;
  /** Higher wins when two matches overlap. */
  priority: number;
  /** One line shown in the UI legend. */
  blurb: string;
  pattern: RegExp;
  /**
   * Decide the tier for a candidate. Returning null rejects the match
   * outright (the shape was a coincidence, not a weak signal).
   */
  classify(normalized: string, raw: string): { confidence: Confidence; reason: string } | null;
}

export const DETECTORS: readonly Detector[] = [
  {
    id: 'gstin',
    label: 'GSTIN',
    priority: 9,
    blurb: '15-character GST identifier — state code + PAN + mod-36 check character.',
    pattern: /\b\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{3}\b/g,
    classify(normalized) {
      if (validateGstin(normalized)) {
        return { confidence: 'certain', reason: 'Mod-36 check character matches and state code is assigned.' };
      }
      if (isValidStateCode(normalized.slice(0, 2))) {
        return { confidence: 'possible', reason: 'GSTIN shape with a real state code, but the check character does not match.' };
      }
      return null;
    },
  },
  {
    id: 'aadhaar',
    label: 'AADHAAR',
    priority: 8,
    blurb: '12-digit UIDAI number, validated with the Verhoeff check digit.',
    pattern: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    classify(normalized) {
      const digits = stripSeparators(normalized);
      if (!isAadhaarShape(digits)) return null;
      if (verhoeffValidate(digits)) {
        return { confidence: 'certain', reason: 'Verhoeff check digit is valid and the number starts 2-9.' };
      }
      return {
        confidence: 'possible',
        reason: 'Right shape for an Aadhaar but the Verhoeff check digit fails — most 12-digit numbers do.',
      };
    },
  },
  {
    id: 'pan',
    label: 'PAN',
    priority: 7,
    blurb: 'Income-tax PAN — 5 letters, 4 digits, 1 letter, with a holder-type character.',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    classify(normalized) {
      const holder = normalized[3];
      if (holder in PAN_HOLDER_TYPES) {
        return {
          confidence: 'likely',
          reason: `4th character "${holder}" is a valid holder type (${PAN_HOLDER_TYPES[holder]}). PAN carries no checksum, so this is as far as structure goes.`,
        };
      }
      return {
        confidence: 'possible',
        reason: `PAN shape, but "${holder}" is not an assigned holder-type character.`,
      };
    },
  },
  {
    id: 'ifsc',
    label: 'IFSC',
    priority: 6,
    blurb: 'Bank branch code — 4 letters, a reserved 0, then 6 alphanumerics.',
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    classify() {
      return {
        confidence: 'likely',
        reason: 'Matches the RBI IFSC layout including the reserved zero in position 5.',
      };
    },
  },
  {
    id: 'vehicle',
    label: 'VEHICLE',
    priority: 5,
    blurb: 'Vehicle registration plate, checked against the RTO state prefixes.',
    pattern: /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b/g,
    classify(normalized) {
      const state = normalized.slice(0, 2);
      if (VEHICLE_STATE_CODES.includes(state)) {
        return { confidence: 'likely', reason: `"${state}" is an assigned RTO state code.` };
      }
      return null;
    },
  },
  {
    id: 'upi',
    label: 'UPI',
    priority: 5,
    blurb: 'UPI virtual payment address — distinguished from email by the PSP handle.',
    // The trailing lookahead is what keeps `ravi@example.co.in` out: a VPA
    // handle is a bare word, an email domain is dotted.
    pattern: /\b[a-zA-Z0-9][a-zA-Z0-9._-]{1,60}@[a-zA-Z][a-zA-Z0-9]{1,30}\b(?!\.[a-zA-Z])/g,
    classify(normalized) {
      const handle = normalized.split('@')[1]?.toLowerCase() ?? '';
      if (UPI_HANDLES.includes(handle)) {
        return { confidence: 'likely', reason: `"@${handle}" is a registered UPI PSP handle, so this is a payment address rather than an email.` };
      }
      return {
        confidence: 'possible',
        reason: `"@${handle}" is not in the known PSP handle list — it may be a newer handle, or not a VPA at all.`,
      };
    },
  },
  {
    id: 'email',
    label: 'EMAIL',
    priority: 4,
    blurb: 'Email address — a dotted domain, which is what separates it from a VPA.',
    pattern: /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,63}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})+\b/g,
    classify() {
      return { confidence: 'likely', reason: 'Local part plus a dotted domain.' };
    },
  },
  {
    id: 'epic',
    label: 'VOTER-ID',
    priority: 4,
    blurb: 'Voter EPIC number — 3 letters then 7 digits, no checksum exists.',
    pattern: /\b[A-Z]{3}\d{7}\b/g,
    classify() {
      return {
        confidence: 'possible',
        reason: 'EPIC numbers have no published checksum, so 3 letters + 7 digits is the entire signal.',
      };
    },
  },
  {
    id: 'mobile',
    label: 'MOBILE',
    priority: 3,
    blurb: 'Indian mobile number — 10 digits opening 6-9, with optional +91.',
    pattern: /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g,
    classify(normalized) {
      const digits = stripSeparators(normalized).replace(/^\+?91/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) return null;
      const explicit = /^\+?91/.test(stripSeparators(normalized));
      return {
        confidence: explicit ? 'likely' : 'possible',
        reason: explicit
          ? 'Carries an explicit +91 country code with a valid 6-9 opening digit.'
          : 'Ten digits opening 6-9. Without a country code this also matches plenty of order and account numbers.',
      };
    },
  },
  {
    id: 'pincode',
    label: 'PIN',
    priority: 1,
    blurb: 'Postal PIN code — six digits. Deliberately the noisiest detector here.',
    pattern: /\b[1-8]\d{5}\b/g,
    classify(normalized) {
      const zone = PIN_ZONES[normalized[0]];
      if (!zone) return null;
      return {
        confidence: 'possible',
        reason: `First digit maps to the ${zone} postal zone, but any six-digit number does that. Expect false positives.`,
      };
    },
  },
];

/**
 * Run one detector over the normalised text, mapping every hit back to
 * offsets in the ORIGINAL string (safe because normalisation is 1:1).
 */
export function runDetector(
  detector: Detector,
  normalizedText: string,
  originalText: string
): Finding[] {
  const found: Finding[] = [];
  const pattern = new RegExp(detector.pattern.source, detector.pattern.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalizedText)) !== null) {
    if (match[0].length === 0) {
      pattern.lastIndex++;
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    const verdict = detector.classify(match[0], originalText.slice(start, end));
    if (!verdict) continue;
    found.push({
      detector: detector.id,
      label: detector.label,
      start,
      end,
      raw: originalText.slice(start, end),
      normalized: stripSeparators(match[0]),
      confidence: verdict.confidence,
      reason: verdict.reason,
      nativeDigits: hasNativeDigits(originalText.slice(start, end)),
    });
  }
  return found;
}
