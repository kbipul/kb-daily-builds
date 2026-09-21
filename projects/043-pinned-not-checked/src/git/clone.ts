import type { CommitId, Ref, Repo } from './repo';
import { resolveRevision } from './resolve';
import type { Resolution } from './resolve';

/**
 * The local side of the clone. Only the default branch arrives as a local
 * branch: the disclosure notes that "a non-default branch is fetched only as a
 * remote-tracking ref, and the checkout would fall back to the commit".
 */
export interface WorkingClone {
  localBranches: Ref[];
  objects: CommitId[];
  /** The contents of .git/FETCH_HEAD, written by `git fetch`. */
  fetchHeadFile: CommitId | null;
  head: CommitId | null;
}

/**
 * Simplification, declared: object availability is modelled as "every commit in
 * the repo", including under --depth 1. A shallow clone really would carry
 * fewer objects, but neither disclosed path turns on which objects a shallow
 * clone omits, and modelling it would add a knob that changes no outcome here.
 */
export function gitClone(repo: Repo): WorkingClone {
  const def = repo.branches.find((b) => b.name === repo.defaultBranch);
  if (!def) throw new Error(`default branch ${repo.defaultBranch} not found`);
  return {
    localBranches: [{ ...def }],
    objects: repo.commits.map((c) => c.id),
    fetchHeadFile: null,
    head: def.target,
  };
}

export function gitFetch(clone: WorkingClone, rev: CommitId): WorkingClone {
  const known = clone.objects.includes(rev);
  return { ...clone, fetchHeadFile: known ? rev : null };
}

export interface CheckoutOutcome {
  clone: WorkingClone;
  resolution: Resolution;
  /** Set when the name FETCH_HEAD fell through to the file rather than a ref. */
  readFetchHeadFile: boolean;
}

export function gitCheckout(clone: WorkingClone, name: string): CheckoutOutcome {
  const resolution = resolveRevision(clone.localBranches, clone.objects, name);

  if (resolution.via !== 'none') {
    return { clone: { ...clone, head: resolution.commit }, resolution, readFetchHeadFile: false };
  }

  // `git checkout FETCH_HEAD` reads .git/FETCH_HEAD only when FETCH_HEAD did
  // not already resolve as a ref. That order is the whole Gemini CLI variant.
  if (name === 'FETCH_HEAD' && clone.fetchHeadFile) {
    return {
      clone: { ...clone, head: clone.fetchHeadFile },
      resolution: {
        name,
        commit: clone.fetchHeadFile,
        via: 'object',
        ambiguous: false,
        warning: null,
      },
      readFetchHeadFile: true,
    };
  }

  return { clone, resolution, readFetchHeadFile: false };
}

/** `git rev-parse HEAD` — the commit actually in the working tree. */
export function revParseHead(clone: WorkingClone): CommitId | null {
  return clone.head;
}
