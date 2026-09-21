import type { Repo } from './repo';
import { looksLikeCommitId } from './repo';

export type HostId = 'github' | 'bitbucket' | 'self-hosted';

export interface Host {
  id: HostId;
  label: string;
  /** GitHub rejects a 40-hex branch name outright. Bitbucket and self-hosted git do not. */
  rejectsCommitShapedRefNames: boolean;
  note: string;
}

export const HOSTS: Host[] = [
  {
    id: 'github',
    label: 'GitHub',
    rejectsCommitShapedRefNames: true,
    note: 'Rejects a 40-hex branch name outright. A marketplace that allows only GitHub blunts the branch-name variant.',
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    rejectsCommitShapedRefNames: false,
    note: 'Accepts commit-shaped branch names. Listed in Anthropic’s own documentation as a valid marketplace backend.',
  },
  {
    id: 'self-hosted',
    label: 'Self-hosted git',
    rejectsCommitShapedRefNames: false,
    note: 'Accepts commit-shaped branch names. Also a supported marketplace backend.',
  },
];

export function getHost(id: HostId): Host {
  const h = HOSTS.find((x) => x.id === id);
  if (!h) throw new Error(`unknown host: ${id}`);
  return h;
}

export interface HostFilterResult {
  repo: Repo;
  rejected: string[];
}

/**
 * Apply the host's ref-name policy to the server-side repo. A branch the host
 * refuses to create simply does not exist for anything downstream.
 */
export function applyHostPolicy(repo: Repo, host: Host): HostFilterResult {
  if (!host.rejectsCommitShapedRefNames) return { repo, rejected: [] };

  const rejected = repo.branches.filter((b) => looksLikeCommitId(b.name)).map((b) => b.name);
  if (rejected.length === 0) return { repo, rejected: [] };

  const branches = repo.branches.filter((b) => !looksLikeCommitId(b.name));
  const defaultStillExists = branches.some((b) => b.name === repo.defaultBranch);
  const fallback = branches[0];
  if (!fallback) throw new Error('host policy removed every branch');

  return {
    repo: {
      ...repo,
      branches,
      defaultBranch: defaultStillExists ? repo.defaultBranch : fallback.name,
    },
    rejected,
  };
}
