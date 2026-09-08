import { describe, it, expect } from 'vitest';
import { SAMPLE_TEXT } from '../engine/sample';
import { scan } from '../engine/scan';
import { redact } from '../engine/redact';

/**
 * The sample text is the first thing anyone sees, so its claims are asserted
 * rather than assumed.
 */
describe('the shipped sample', () => {
  const result = scan(SAMPLE_TEXT);

  it('demonstrates all three confidence tiers', () => {
    expect(result.counts.certain).toBeGreaterThan(0);
    expect(result.counts.likely).toBeGreaterThan(0);
    expect(result.counts.possible).toBeGreaterThan(0);
  });

  it('finds the same Aadhaar written in Latin and in Devanagari digits', () => {
    const aadhaars = result.findings.filter((f) => f.detector === 'aadhaar');
    const native = aadhaars.filter((f) => f.nativeDigits);
    expect(native.length).toBeGreaterThan(0);
    expect(aadhaars.length).toBeGreaterThanOrEqual(2);
  });

  it('contains a checksum-valid number that is not personal data — the honest caveat', () => {
    // "invoice 412356789046" passes Verhoeff but is an invoice number. The UI
    // says a passing checksum proves the shape, not the meaning; this pins it.
    const invoice = result.findings.find((f) => f.normalized === '412356789046');
    expect(invoice).toBeDefined();
    expect(invoice!.confidence).toBe('certain');
  });

  it('covers the full detector spread', () => {
    for (const id of ['aadhaar', 'pan', 'gstin', 'ifsc', 'upi', 'email', 'mobile', 'pincode', 'vehicle']) {
      expect(result.byDetector[id as keyof typeof result.byDetector], id).toBeGreaterThan(0);
    }
  });

  it('leaves no raw identifier in the redacted output', () => {
    const out = redact(SAMPLE_TEXT, result.findings, 'label');
    expect(out).not.toContain('ABCPE1234F');
    expect(out).not.toContain('27ABCDE1234F1Z0');
    expect(out).not.toContain('HDFC0001234');
    expect(out).not.toContain('२३४५');
  });
});
