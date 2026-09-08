/**
 * Verhoeff checksum — the algorithm UIDAI uses for the 12th digit of an
 * Aadhaar number. It catches all single-digit errors and all adjacent
 * transpositions, which is exactly why a regex-only Aadhaar detector is so
 * noisy: `\d{12}` matches order numbers, timestamps and account IDs, while
 * a Verhoeff check rejects roughly 9 in 10 of them.
 *
 * Reference tables are the standard published D5 dihedral group tables
 * (Verhoeff, 1969) — implemented here from the table definitions, not copied
 * from a library.
 */

// Multiplication table for the dihedral group D5.
const D: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table, applied cyclically by position.
const P: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Multiplicative inverse in D5.
const INV: readonly number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function checksum(digits: string): number {
  let c = 0;
  const n = digits.length;
  for (let i = 0; i < n; i++) {
    const digit = digits.charCodeAt(n - 1 - i) - 48;
    if (digit < 0 || digit > 9) return -1;
    c = D[c][P[i % 8][digit]];
  }
  return c;
}

/** True when `digits` (any length, ASCII only) carries a valid trailing check digit. */
export function verhoeffValidate(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  return checksum(digits) === 0;
}

/**
 * Append the correct Verhoeff check digit to a body of digits.
 * Used by the test fixtures to mint SYNTHETIC valid numbers, so no real
 * person's Aadhaar is ever committed to this repository.
 */
export function verhoeffAppend(body: string): string {
  if (!/^\d+$/.test(body)) throw new Error('verhoeffAppend expects ASCII digits');
  return body + String(INV[checksum(body + '0')]);
}

/**
 * UIDAI never issues an Aadhaar starting with 0 or 1 — the first digit is
 * 2..9. Combined with Verhoeff this is the whole "certain" tier.
 */
export function isAadhaarShape(digits: string): boolean {
  return /^[2-9]\d{11}$/.test(digits);
}
