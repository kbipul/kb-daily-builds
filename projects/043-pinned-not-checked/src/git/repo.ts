/**
 * A deliberately small model of a plugin repository, enough to reproduce the
 * two Plugin4Shell resolution paths and nothing more.
 *
 * Source for every behaviour modelled here: Or Nevo, Dor Granat and Niv Hoffman,
 * "Plugin4Shell - Zero Click RCE Vulnerability found in top 4 most popular
 * coding agents, millions of agents affected", Air Security, 17 September 2026.
 * https://www.air.security/blog-posts/plugin4shell
 */

export type CommitId = string;

/** What lands in the working tree if this commit is checked out. */
export type Payload = 'reviewed' | 'attacker';

export interface Commit {
  id: CommitId;
  payload: Payload;
  note: string;
}

export interface Ref {
  name: string;
  target: CommitId;
}

export interface Repo {
  commits: Commit[];
  /** Branches as they exist on the server, before any host name policy runs. */
  branches: Ref[];
  /** Name of the branch a plain `git clone` will check out. */
  defaultBranch: string;
}

export const REVIEWED_PIN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const BUMPED_PIN = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
export const ATTACKER_COMMIT = 'c0ffee7c0ffee7c0ffee7c0ffee7c0ffee7c0ffe';

const HEX40 = /^[0-9a-f]{40}$/;

/** git's own check-ref-format accepts 40-hex names; this is the shape test. */
export function looksLikeCommitId(name: string): boolean {
  return HEX40.test(name);
}

export function findCommit(repo: Repo, id: CommitId): Commit | undefined {
  return repo.commits.find((c) => c.id === id);
}

export function findBranch(repo: Repo, name: string): Ref | undefined {
  return repo.branches.find((b) => b.name === name);
}

export function short(id: CommitId | null): string {
  if (!id) return '(none)';
  return looksLikeCommitId(id) ? `${id.slice(0, 7)}…` : id;
}

/**
 * Step 3 of the disclosed attack: the marketplace re-pins to a new,
 * still-benign commit. Step 4: the attacker creates a branch named after that
 * commit, points it at malicious code, and makes it the default.
 */
export function benignRepo(): Repo {
  return {
    commits: [
      { id: REVIEWED_PIN, payload: 'reviewed', note: 'v1.0.0 — the commit the marketplace reviewed' },
      { id: BUMPED_PIN, payload: 'reviewed', note: 'v1.1.0 — routine version bump, still benign' },
      { id: ATTACKER_COMMIT, payload: 'attacker', note: 'the rug-pull commit' },
    ],
    branches: [{ name: 'main', target: BUMPED_PIN }],
    defaultBranch: 'main',
  };
}

/** Attack variant 1: a branch whose name is the pinned 40-hex SHA, set default. */
export function shaBranchRepo(pin: CommitId): Repo {
  const base = benignRepo();
  return {
    ...base,
    branches: [...base.branches, { name: pin, target: ATTACKER_COMMIT }],
    defaultBranch: pin,
  };
}

/** Attack variant 2: a branch literally named FETCH_HEAD, set default. */
export function fetchHeadBranchRepo(): Repo {
  const base = benignRepo();
  return {
    ...base,
    branches: [...base.branches, { name: 'FETCH_HEAD', target: ATTACKER_COMMIT }],
    defaultBranch: 'FETCH_HEAD',
  };
}
