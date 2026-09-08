import { describe, it, expect } from 'vitest';
import { normalizeDigits, hasNativeDigits, stripSeparators, DIGIT_BLOCKS } from '../engine/normalize';

describe('normalizeDigits', () => {
  it('folds Devanagari digits to ASCII', () => {
    expect(normalizeDigits('२३४५ ६७८९ ०१२४').text).toBe('2345 6789 0124');
  });

  it('preserves length for every supported block — offsets must stay valid', () => {
    for (const block of DIGIT_BLOCKS) {
      const native = Array.from({ length: 10 }, (_, d) => String.fromCharCode(block.zero + d)).join('');
      const { text, changed } = normalizeDigits(native);
      expect(changed, block.name).toBe(true);
      expect(text, block.name).toBe('0123456789');
      expect(text.length, block.name).toBe(native.length);
    }
  });

  it('leaves surrounding Devanagari letters alone', () => {
    const input = 'आधार संख्या २३४५';
    const { text } = normalizeDigits(input);
    expect(text).toBe('आधार संख्या 2345');
    expect(text.length).toBe(input.length);
  });

  it('reports no change for plain ASCII', () => {
    expect(normalizeDigits('Aadhaar 2345 6789 0124').changed).toBe(false);
  });

  it('detects native digits inside a slice', () => {
    expect(hasNativeDigits('२३४५')).toBe(true);
    expect(hasNativeDigits('2345')).toBe(false);
  });

  it('strips the separators humans type inside identifiers', () => {
    expect(stripSeparators('2345 6789 0124')).toBe('234567890124');
    expect(stripSeparators('KA-05-MJ-2023')).toBe('KA05MJ2023');
  });
});
