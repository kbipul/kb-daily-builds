import { describe, expect, it } from 'vitest';
import { HOSTS, applyHostPolicy, getHost } from './host';
import { BUMPED_PIN, fetchHeadBranchRepo, shaBranchRepo } from './repo';

describe('applyHostPolicy', () => {
  it('strips the commit-shaped branch on GitHub and repoints the default', () => {
    const { repo, rejected } = applyHostPolicy(shaBranchRepo(BUMPED_PIN), getHost('github'));
    expect(rejected).toEqual([BUMPED_PIN]);
    expect(repo.branches.map((b) => b.name)).toEqual(['main']);
    expect(repo.defaultBranch).toBe('main');
  });

  it.each(['bitbucket', 'self-hosted'] as const)('keeps it on %s', (id) => {
    const { repo, rejected } = applyHostPolicy(shaBranchRepo(BUMPED_PIN), getHost(id));
    expect(rejected).toEqual([]);
    expect(repo.defaultBranch).toBe(BUMPED_PIN);
  });

  it('leaves the FETCH_HEAD branch alone on every host, GitHub included', () => {
    for (const host of HOSTS) {
      const { repo, rejected } = applyHostPolicy(fetchHeadBranchRepo(), host);
      expect(rejected).toEqual([]);
      expect(repo.defaultBranch).toBe('FETCH_HEAD');
    }
  });
});
