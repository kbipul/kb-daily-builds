import { describe, expect, it } from 'vitest';
import { DISCLOSURE, QUOTES, quote } from './source';

describe('the quoted set', () => {
  it('never claims the hash was broken', () => {
    const crypto = /collision|preimage|forge[ds]?|sha-?1 is (broken|weak)|brute[- ]force/i;
    for (const q of QUOTES) {
      expect(q.text, q.id).not.toMatch(crypto);
    }
  });

  // First written as one assertion over the whole technical section, which
  // failed on 'one-missing-check'. The sentence the disclosure calls "the whole
  // bug" contains no resolution vocabulary at all — it is stated purely as a
  // missing verification. The resolution words only appear one level down, in
  // the two mechanism quotes. Two assertions, because those are two claims.
  it('states the bug itself as a missing verification, not a resolution quirk', () => {
    const verification = /never (verifies|checks)|missing check|landed there/i;
    for (const id of ['the-bug', 'one-missing-check']) {
      expect(quote(id).text, id).toMatch(verification);
    }
    expect(quote('one-missing-check').text).not.toMatch(/\bresolve|\bref\b|\bbranch\b/i);
  });

  it('keeps the resolution vocabulary in the mechanism quotes', () => {
    const resolution = /resolve|ref|branch|checkout|FETCH_HEAD|default/i;
    for (const id of ['ref-beats-object', 'default-branch-condition', 'gemini-variant', 'head-not-ref']) {
      expect(quote(id).text, id).toMatch(resolution);
    }
  });

  it('has unique ids and no empty text', () => {
    const ids = QUOTES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUOTES) expect(q.text.trim().length).toBeGreaterThan(20);
  });

  it('records the disclosure date and the gap back to the vendor report', () => {
    expect(DISCLOSURE.published).toBe('2026-09-17');
    expect(DISCLOSURE.foundMonth).toBe('May 2026');
    expect(DISCLOSURE.disclosedMonth).toBe('June 2026');
  });

  it('throws on an unknown id rather than returning a blank', () => {
    expect(() => quote('no-such-quote')).toThrow(/no quote/);
  });
});
