import { describe, it, expect } from 'vitest';
import { scan, resolveOverlaps } from '../engine/scan';
import { verhoeffAppend } from '../engine/verhoeff';
import type { Finding } from '../engine/types';

const VALID_AADHAAR = verhoeffAppend('23456789012'); // synthetic
const formatted = `${VALID_AADHAAR.slice(0, 4)} ${VALID_AADHAAR.slice(4, 8)} ${VALID_AADHAAR.slice(8)}`;

function only(text: string, detector: string) {
  return scan(text).findings.filter((f) => f.detector === detector);
}

describe('scan — Aadhaar', () => {
  it('marks a checksum-valid Aadhaar as certain', () => {
    const [hit] = only(`Aadhaar ${formatted} on file`, 'aadhaar');
    expect(hit.confidence).toBe('certain');
    expect(hit.normalized).toBe(VALID_AADHAAR);
    expect(hit.raw).toBe(formatted);
  });

  it('demotes a checksum-failing 12-digit number to possible, not certain', () => {
    const broken = VALID_AADHAAR.slice(0, 11) + ((Number(VALID_AADHAAR[11]) + 1) % 10);
    const [hit] = only(`ref ${broken}`, 'aadhaar');
    expect(hit.confidence).toBe('possible');
    expect(hit.reason).toMatch(/Verhoeff/);
  });

  it('ignores 12-digit numbers that open with 0 or 1', () => {
    expect(only('id 012345678901', 'aadhaar')).toHaveLength(0);
  });

  it('finds an Aadhaar typed in Devanagari digits and flags it', () => {
    const devanagari = '२३४५ ६७८९ ०१२४';
    const [hit] = only(`आधार संख्या ${devanagari}`, 'aadhaar');
    expect(hit.confidence).toBe('certain');
    expect(hit.nativeDigits).toBe(true);
    expect(hit.raw).toBe(devanagari);
  });

  it('reports offsets into the original string, not the normalised one', () => {
    const text = `आधार २३४५ ६७८९ ०१२४ अंत`;
    const [hit] = only(text, 'aadhaar');
    expect(text.slice(hit.start, hit.end)).toBe('२३४५ ६७८९ ०१२४');
  });
});

describe('scan — other identifiers', () => {
  it('reads the PAN holder-type character', () => {
    const [individual] = only('PAN ABCPE1234F', 'pan');
    expect(individual.confidence).toBe('likely');
    expect(individual.reason).toMatch(/Individual/);

    const [odd] = only('PAN ABCXE1234F', 'pan');
    expect(odd.confidence).toBe('possible');
  });

  it('separates a UPI VPA from an email by its handle', () => {
    const upi = only('pay ravi.k@okhdfcbank now', 'upi');
    expect(upi[0].confidence).toBe('likely');
    expect(only('mail ravi.k@example.co.in', 'upi')).toHaveLength(0);
    expect(only('mail ravi.k@example.co.in', 'email')).toHaveLength(1);
  });

  it('drops a UPI-shaped string to possible on an unknown handle', () => {
    const [hit] = only('send to ravi@notarealpsp', 'upi');
    expect(hit.confidence).toBe('possible');
  });

  it('recognises an IFSC by its reserved zero', () => {
    expect(only('IFSC HDFC0001234', 'ifsc')[0].confidence).toBe('likely');
    expect(only('code HDFC1001234', 'ifsc')).toHaveLength(0);
  });

  it('promotes a mobile number when it carries +91', () => {
    expect(only('call +91 98765 43210', 'mobile')[0].confidence).toBe('likely');
    expect(only('call 9876543210', 'mobile')[0].confidence).toBe('possible');
  });

  it('rejects a 10-digit number that cannot be an Indian mobile', () => {
    expect(only('order 1234567890', 'mobile')).toHaveLength(0);
  });

  it('only accepts vehicle plates with a real RTO prefix', () => {
    expect(only('plate KA05MJ2023', 'vehicle')[0].confidence).toBe('likely');
    expect(only('plate ZZ05MJ2023', 'vehicle')).toHaveLength(0);
  });

  it('keeps PIN codes honestly in the possible tier', () => {
    const [hit] = only('pincode 560103', 'pincode');
    expect(hit.confidence).toBe('possible');
    expect(hit.reason).toMatch(/false positives/i);
  });

  it('validates a GSTIN through its check character', () => {
    expect(only('GSTIN 27ABCDE1234F1Z0', 'gstin')[0].confidence).toBe('certain');
    expect(only('GSTIN 27ABCDE1234F1Z9', 'gstin')[0].confidence).toBe('possible');
  });
});

describe('overlap resolution', () => {
  it('does not report the mobile number hiding inside an Aadhaar', () => {
    const result = scan(`Aadhaar ${formatted}`);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].detector).toBe('aadhaar');
  });

  it('prefers GSTIN over the PAN embedded in it', () => {
    const result = scan('GSTIN 27ABCDE1234F1Z0');
    expect(result.findings.map((f) => f.detector)).toEqual(['gstin']);
  });

  it('keeps non-overlapping findings and returns them in document order', () => {
    const result = scan('PAN ABCPE1234F and IFSC HDFC0001234');
    expect(result.findings.map((f) => f.detector)).toEqual(['pan', 'ifsc']);
    expect(result.findings[0].start).toBeLessThan(result.findings[1].start);
  });

  it('is deterministic regardless of input order', () => {
    const a: Finding = {
      detector: 'pincode', label: 'PIN', start: 0, end: 6, raw: '560103',
      normalized: '560103', confidence: 'possible', reason: '', nativeDigits: false,
    };
    const b: Finding = { ...a, detector: 'aadhaar', label: 'AADHAAR', end: 12, confidence: 'certain' };
    expect(resolveOverlaps([a, b]).map((f) => f.detector)).toEqual(['aadhaar']);
    expect(resolveOverlaps([b, a]).map((f) => f.detector)).toEqual(['aadhaar']);
  });
});

describe('scan options', () => {
  const text = `Aadhaar ${formatted}, PAN ABCPE1234F, pincode 560103`;

  it('counts findings by tier', () => {
    const r = scan(text);
    expect(r.counts.certain).toBe(1);
    expect(r.counts.likely).toBe(1);
    expect(r.counts.possible).toBe(1);
  });

  it('applies a confidence floor', () => {
    expect(scan(text, { minConfidence: 'likely' }).findings).toHaveLength(2);
    expect(scan(text, { minConfidence: 'certain' }).findings).toHaveLength(1);
  });

  it('respects the enabled-detector list', () => {
    const r = scan(text, { enabled: ['pan'] });
    expect(r.findings.map((f) => f.detector)).toEqual(['pan']);
  });

  it('returns nothing for text with no identifiers', () => {
    const r = scan('The quarterly review is on Thursday.');
    expect(r.findings).toHaveLength(0);
    expect(r.counts).toEqual({ certain: 0, likely: 0, possible: 0 });
  });

  it('handles empty input', () => {
    expect(scan('').findings).toHaveLength(0);
  });
});
