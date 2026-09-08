import { describe, it, expect } from 'vitest';
import { verhoeffValidate, verhoeffAppend, isAadhaarShape } from '../engine/verhoeff';

/**
 * Every fixture in this file is SYNTHETIC: an arbitrary 11-digit body with a
 * check digit computed by the implementation under test. No real Aadhaar
 * number is committed to this repository.
 */
const BODIES = ['23456789012', '98765432101', '41235678904', '77712345678'];

describe('verhoeff', () => {
  it('accepts numbers it has just signed', () => {
    for (const body of BODIES) {
      expect(verhoeffValidate(verhoeffAppend(body))).toBe(true);
    }
  });

  it('rejects every single-digit corruption', () => {
    for (const body of BODIES) {
      const signed = verhoeffAppend(body);
      for (let i = 0; i < signed.length; i++) {
        for (let d = 0; d <= 9; d++) {
          const replacement = String(d);
          if (signed[i] === replacement) continue;
          const corrupted = signed.slice(0, i) + replacement + signed.slice(i + 1);
          expect(verhoeffValidate(corrupted)).toBe(false);
        }
      }
    }
  });

  it('rejects every adjacent transposition', () => {
    for (const body of BODIES) {
      const signed = verhoeffAppend(body);
      for (let i = 0; i < signed.length - 1; i++) {
        if (signed[i] === signed[i + 1]) continue;
        const swapped =
          signed.slice(0, i) + signed[i + 1] + signed[i] + signed.slice(i + 2);
        expect(verhoeffValidate(swapped)).toBe(false);
      }
    }
  });

  it('rejects non-digit input rather than throwing', () => {
    expect(verhoeffValidate('12345678901X')).toBe(false);
    expect(verhoeffValidate('')).toBe(false);
    expect(verhoeffValidate('२३४५६७८९०१२४')).toBe(false);
  });

  it('refuses to sign non-digit input', () => {
    expect(() => verhoeffAppend('12A')).toThrow();
  });

  it('rejects most random 12-digit numbers — the reason the checksum earns its keep', () => {
    let accepted = 0;
    const total = 4000;
    let seed = 20260908;
    for (let i = 0; i < total; i++) {
      let n = '';
      for (let j = 0; j < 12; j++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        n += String(Math.floor(seed / 65536) % 10);
      }
      if (verhoeffValidate(n)) accepted++;
    }
    // A correct check digit is 1 value in 10, so ~10% should survive.
    expect(accepted / total).toBeLessThan(0.16);
    expect(accepted / total).toBeGreaterThan(0.04);
  });

  it('knows UIDAI never issues a number starting 0 or 1', () => {
    expect(isAadhaarShape('234567890124')).toBe(true);
    expect(isAadhaarShape('034567890124')).toBe(false);
    expect(isAadhaarShape('134567890124')).toBe(false);
    expect(isAadhaarShape('23456789012')).toBe(false);
  });
});
