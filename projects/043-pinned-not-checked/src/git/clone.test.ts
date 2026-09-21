import { describe, expect, it } from 'vitest';
import { gitCheckout, gitClone, gitFetch, revParseHead } from './clone';
import { ATTACKER_COMMIT, BUMPED_PIN, benignRepo, fetchHeadBranchRepo, shaBranchRepo } from './repo';

describe('gitClone', () => {
  it('brings down only the default branch as a local branch', () => {
    const repo = shaBranchRepo(BUMPED_PIN);
    expect(repo.branches).toHaveLength(2);
    const c = gitClone(repo);
    expect(c.localBranches.map((b) => b.name)).toEqual([BUMPED_PIN]);
  });

  it('leaves a non-default commit-shaped branch out of the local refs', () => {
    const repo = { ...shaBranchRepo(BUMPED_PIN), defaultBranch: 'main' };
    const c = gitClone(repo);
    expect(c.localBranches.map((b) => b.name)).toEqual(['main']);
    const out = gitCheckout(c, BUMPED_PIN);
    expect(out.resolution.via).toBe('object');
    expect(revParseHead(out.clone)).toBe(BUMPED_PIN);
  });
});

describe('the FETCH_HEAD path', () => {
  it('reads .git/FETCH_HEAD when no ref by that name exists', () => {
    let c = gitClone(benignRepo());
    c = gitFetch(c, BUMPED_PIN);
    expect(c.fetchHeadFile).toBe(BUMPED_PIN);
    const out = gitCheckout(c, 'FETCH_HEAD');
    expect(out.readFetchHeadFile).toBe(true);
    expect(revParseHead(out.clone)).toBe(BUMPED_PIN);
  });

  it('discards the fetched commit when FETCH_HEAD is also a branch', () => {
    let c = gitClone(fetchHeadBranchRepo());
    c = gitFetch(c, BUMPED_PIN);
    expect(c.fetchHeadFile).toBe(BUMPED_PIN);
    const out = gitCheckout(c, 'FETCH_HEAD');
    expect(out.readFetchHeadFile).toBe(false);
    expect(out.resolution.via).toBe('ref');
    expect(revParseHead(out.clone)).toBe(ATTACKER_COMMIT);
  });

  it('fetches nothing for an object the remote does not have', () => {
    const c = gitFetch(gitClone(benignRepo()), 'd'.repeat(40));
    expect(c.fetchHeadFile).toBeNull();
  });
});
