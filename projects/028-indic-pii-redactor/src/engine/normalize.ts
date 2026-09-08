/**
 * Indian documents are routinely typed in native scripts, and an Aadhaar
 * written as "२३४५ ६७८९ ०१२४" is invisible to `\d{12}`. Every Indic digit
 * block in Unicode is a contiguous run of ten code points, each a single
 * UTF-16 code unit — so mapping them to ASCII is strictly 1 char -> 1 char
 * and every offset in the normalised string still points at the same
 * character in the original. That property is what lets the scanner report
 * highlight ranges against the user's untouched text.
 */

interface DigitBlock {
  readonly name: string;
  readonly zero: number;
}

/** Zero code point of each Indic digit block ISO 15924 defines. */
export const DIGIT_BLOCKS: readonly DigitBlock[] = [
  { name: 'Devanagari', zero: 0x0966 },
  { name: 'Bengali', zero: 0x09e6 },
  { name: 'Gurmukhi', zero: 0x0a66 },
  { name: 'Gujarati', zero: 0x0ae6 },
  { name: 'Oriya', zero: 0x0b66 },
  { name: 'Tamil', zero: 0x0be6 },
  { name: 'Telugu', zero: 0x0c66 },
  { name: 'Kannada', zero: 0x0ce6 },
  { name: 'Malayalam', zero: 0x0d66 },
  // Also fold full-width ASCII digits, which arrive via copy-paste from PDFs.
  { name: 'Fullwidth', zero: 0xff10 },
];

export interface Normalized {
  /** Same length as the input; Indic digits replaced by ASCII 0-9. */
  text: string;
  /** True when at least one character was rewritten. */
  changed: boolean;
}

/**
 * Fold every supported native digit to ASCII, preserving length and offsets.
 * Non-digit characters (including the Devanagari letters around them) are
 * left completely untouched.
 */
export function normalizeDigits(input: string): Normalized {
  let changed = false;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    let mapped = input[i];
    if (code > 0x0965) {
      for (const block of DIGIT_BLOCKS) {
        if (code >= block.zero && code <= block.zero + 9) {
          mapped = String.fromCharCode(48 + (code - block.zero));
          changed = true;
          break;
        }
      }
    }
    out += mapped;
  }
  return { text: out, changed };
}

/** True if the slice contains any digit that is not ASCII 0-9. */
export function hasNativeDigits(slice: string): boolean {
  return normalizeDigits(slice).changed;
}

/** Strip the separators humans put inside identifiers: spaces and hyphens. */
export function stripSeparators(value: string): string {
  return value.replace(/[\s-]/g, '');
}
