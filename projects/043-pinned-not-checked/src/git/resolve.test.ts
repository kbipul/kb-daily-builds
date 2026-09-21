import { describe, expect, it } from 'vitest';
import { resolveRevision } from './resolve';
import { ATTACKER_COMMIT, BUMPED_PIN, REVIEWED_PIN, looksLikeCommitId } from './repo';

describe('resolveRevision', () => {
  it('prefers a ref over an object of the same name', () => {
    const r = resolveRevision(
      [{ name: BUMPED_PIN, target: ATTACKER_COMMIT }],
      [REVIEWED_PIN, BUMPED_PIN, ATTACKER_COMMIT],
      BUMPED_PIN,
    );
    expect(r.via).toBe('ref');
    expect(r.commit).toBe(ATTACKER_COMMIT);
  });

  it('flags the ambiguity and reports it the way git does', () => {
    const r = resolveRevision(
      [{ name: BUMPED_PIN, target: ATTACKER_COMMIT }],
      [BUMPED_PIN],
      BUMPED_PIN,
    );
    expect(r.ambiguous).toBe(true);
    expect(r.warning).toMatch(/refname .* is ambiguous/);
  });

  it('falls back to the commit object when no local ref matches', () => {
    const r = resolveRevision([{ name: 'main', target: REVIEWED_PIN }], [BUMPED_PIN], BUMPED_PIN);
    expect(r.via).toBe('object');
    expect(r.commit).toBe(BUMPED_PIN);
  });

  it('resolves nothing when the name is neither', () => {
    const r = resolveRevision([], [], BUMPED_PIN);
    expect(r.via).toBe('none');
    expect(r.commit).toBeNull();
  });

  it('does not warn when only one of the two kinds matches', () => {
    const asRef = resolveRevision([{ name: 'main', target: REVIEWED_PIN }], [], 'main');
    const asObj = resolveRevision([], [BUMPED_PIN], BUMPED_PIN);
    expect(asRef.warning).toBeNull();
    expect(asObj.warning).toBeNull();
  });
});

describe('looksLikeCommitId', () => {
  it('accepts a 40-hex name, which is what makes the branch trick possible', () => {
    expect(looksLikeCommitId(BUMPED_PIN)).toBe(true);
    expect(looksLikeCommitId(ATTACKER_COMMIT)).toBe(true);
  });

  it('rejects FETCH_HEAD, which is why no ref-name policy filters the Gemini variant', () => {
    expect(looksLikeCommitId('FETCH_HEAD')).toBe(false);
    expect(looksLikeCommitId('main')).toBe(false);
    expect(looksLikeCommitId(BUMPED_PIN.slice(0, 39))).toBe(false);
    expect(looksLikeCommitId(BUMPED_PIN.toUpperCase())).toBe(false);
  });
});
