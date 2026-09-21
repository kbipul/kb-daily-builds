import type { CommitId, Ref } from './repo';

export type ResolvedVia = 'ref' | 'object' | 'none';

export interface Resolution {
  name: string;
  commit: CommitId | null;
  via: ResolvedVia;
  /** The name is both a local ref and a known object id. */
  ambiguous: boolean;
  warning: string | null;
}

/**
 * git's name resolution, restricted to the two kinds of name this simulator
 * uses: a local branch and a commit object id.
 *
 * The rule the disclosure turns on, quoted: "when a name is both a valid ref
 * and an object id, git prefers the ref and only prints a `refname is
 * ambiguous` warning".
 */
export function resolveRevision(
  localBranches: Ref[],
  objects: CommitId[],
  name: string,
): Resolution {
  const ref = localBranches.find((b) => b.name === name);
  const isObject = objects.includes(name);

  if (ref) {
    return {
      name,
      commit: ref.target,
      via: 'ref',
      ambiguous: isObject,
      warning: isObject ? `warning: refname '${name}' is ambiguous.` : null,
    };
  }
  if (isObject) {
    return { name, commit: name, via: 'object', ambiguous: false, warning: null };
  }
  return { name, commit: null, via: 'none', ambiguous: false, warning: null };
}
