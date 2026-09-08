import { describe, it, expect } from 'vitest';
import { scan } from '../engine/scan';
import { redact, segment, maskFor } from '../engine/redact';
import { verhoeffAppend } from '../engine/verhoeff';
import type { Finding } from '../engine/types';

const AADHAAR = verhoeffAppend('23456789012');
const formatted = `${AADHAAR.slice(0, 4)} ${AADHAAR.slice(4, 8)} ${AADHAAR.slice(8)}`;

const finding: Finding = {
  detector: 'aadhaar', label: 'AADHAAR', start: 0, end: formatted.length,
  raw: formatted, normalized: AADHAAR, confidence: 'certain', reason: '', nativeDigits: false,
};

describe('maskFor', () => {
  it('labels', () => expect(maskFor(finding, 'label')).toBe('[AADHAAR]'));

  it('blocks at the original length', () => {
    expect(maskFor(finding, 'block')).toBe('█'.repeat(formatted.length));
  });

  it('keeps the last four characters and the separators', () => {
    const partial = maskFor(finding, 'partial');
    expect(partial.endsWith(AADHAAR.slice(-4))).toBe(true);
    expect(partial.length).toBe(formatted.length);
    expect(partial.slice(0, 4)).toBe('XXXX');
  });
});

describe('redact', () => {
  const text = `Aadhaar ${formatted} and PAN ABCPE1234F.`;

  it('removes every identifier from the output', () => {
    const out = redact(text, scan(text).findings, 'label');
    expect(out).toBe('Aadhaar [AADHAAR] and PAN [PAN].');
    expect(out).not.toContain(AADHAAR.slice(0, 4));
    expect(out).not.toContain('ABCPE1234F');
  });

  it('leaves surrounding text byte-identical', () => {
    const out = redact(text, scan(text).findings, 'label');
    expect(out.startsWith('Aadhaar ')).toBe(true);
    expect(out.endsWith('.')).toBe(true);
  });

  it('is stable when findings arrive out of order', () => {
    const findings = scan(text).findings;
    const forward = redact(text, findings, 'block');
    const backward = redact(text, [...findings].reverse(), 'block');
    expect(forward).toBe(backward);
  });

  it('redacts Devanagari identifiers too', () => {
    const native = 'आधार २३४५ ६७८९ ०१२४ समाप्त';
    const out = redact(native, scan(native).findings, 'label');
    expect(out).toBe('आधार [AADHAAR] समाप्त');
  });

  it('returns the input unchanged when nothing was found', () => {
    const clean = 'No identifiers in this sentence.';
    expect(redact(clean, scan(clean).findings, 'label')).toBe(clean);
  });
});

describe('segment', () => {
  const text = `Aadhaar ${formatted} end`;

  it('reconstructs the original text exactly', () => {
    const segs = segment(text, scan(text).findings);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('marks only the matched ranges', () => {
    const segs = segment(text, scan(text).findings);
    const matched = segs.filter((s) => s.finding);
    expect(matched).toHaveLength(1);
    expect(matched[0].text).toBe(formatted);
  });

  it('handles a match at position zero and at the very end', () => {
    const edge = `${formatted}`;
    const segs = segment(edge, scan(edge).findings);
    expect(segs).toHaveLength(1);
    expect(segs[0].finding?.detector).toBe('aadhaar');
  });
});
