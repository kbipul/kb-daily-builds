import { describe, it, expect } from 'vitest';
import { gstinCheckChar, validateGstin, isValidStateCode } from '../engine/gstin';

describe('gstin', () => {
  it('computes the published check character', () => {
    expect(gstinCheckChar('27ABCDE1234F1Z')).toBe('0');
    expect(gstinCheckChar('07QWERT5678K1Z')).toBe('6');
    expect(gstinCheckChar('29MNOPQ9012R2Z')).toBe('K');
  });

  it('validates a well-formed GSTIN end to end', () => {
    expect(validateGstin('27ABCDE1234F1Z0')).toBe(true);
    expect(validateGstin('07QWERT5678K1Z6')).toBe(true);
  });

  it('rejects a wrong check character', () => {
    expect(validateGstin('27ABCDE1234F1Z9')).toBe(false);
  });

  it('rejects an unassigned state code even when the checksum is right', () => {
    const bad = '99ABCDE1234F1Z';
    const withCheck = bad + gstinCheckChar(bad);
    // 99 is reserved for OIDAR, so it passes; 45 is not assigned at all.
    expect(validateGstin(withCheck)).toBe(true);
    const unassigned = '45ABCDE1234F1Z';
    expect(validateGstin(unassigned + gstinCheckChar(unassigned))).toBe(false);
  });

  it('knows the assigned state code range', () => {
    expect(isValidStateCode('01')).toBe(true);
    expect(isValidStateCode('38')).toBe(true);
    expect(isValidStateCode('39')).toBe(false);
    expect(isValidStateCode('00')).toBe(false);
    expect(isValidStateCode('99')).toBe(true);
    expect(isValidStateCode('7')).toBe(false);
  });

  it('rejects malformed shapes without throwing', () => {
    expect(validateGstin('')).toBe(false);
    expect(validateGstin('27ABCDE1234F1Z')).toBe(false);
    expect(gstinCheckChar('short')).toBeNull();
    expect(gstinCheckChar('27abcde1234f1z')).toBeNull();
  });
});
