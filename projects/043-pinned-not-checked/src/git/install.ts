import type { CommitId, Payload, Repo } from './repo';
import { findCommit } from './repo';
import { applyHostPolicy, getHost } from './host';
import type { HostId } from './host';
import { getAgent } from './agents';
import type { AgentId } from './agents';
import { gitCheckout, gitClone, gitFetch, revParseHead } from './clone';
import type { WorkingClone } from './clone';

export interface Step {
  command: string;
  effect: string;
  warning?: string;
  fatal?: boolean;
}

export interface InstallResult {
  steps: Step[];
  /** The commit actually in the working tree when the install finishes. */
  head: CommitId | null;
  headPayload: Payload | null;
  /** What the agent tells the marketplace and the user it installed. */
  reported: CommitId;
  /** Does the working tree hold the commit the marketplace pinned? */
  pinHonoured: boolean;
  aborted: boolean;
  abortReason: string | null;
  hostRejectedRefs: string[];
}

export interface InstallOptions {
  repo: Repo;
  host: HostId;
  agent: AgentId;
  pin: CommitId;
  /** The one-line fix: assert the resolved HEAD equals the pin. */
  assertHead: boolean;
}

/**
 * Runs an agent's disclosed install sequence against the simulated repo and
 * reports both what landed and what the agent says landed.
 */
export function runInstall(opts: InstallOptions): InstallResult {
  const host = getHost(opts.host);
  const agent = getAgent(opts.agent);
  const { repo, rejected } = applyHostPolicy(opts.repo, host);

  const steps: Step[] = [];
  let clone: WorkingClone;

  if (rejected.length > 0) {
    steps.push({
      command: `# ${host.label} ref-name policy`,
      effect: `refused to create ${rejected.length} commit-shaped branch name${rejected.length > 1 ? 's' : ''}: ${rejected.join(', ')}`,
    });
  }

  if (agent.shape === 'clone-then-checkout-pin') {
    clone = gitClone(repo);
    steps.push({
      command: 'git clone <plugin repo> ./',
      effect: `default branch ${repo.defaultBranch} arrives as a local branch`,
    });

    const out = gitCheckout(clone, opts.pin);
    clone = out.clone;
    steps.push({
      command: `git checkout ${opts.pin}`,
      effect:
        out.resolution.via === 'ref'
          ? `resolved as a ref → branch ${out.resolution.name}`
          : out.resolution.via === 'object'
            ? 'resolved as a commit object'
            : 'did not resolve',
      warning: out.resolution.warning ?? undefined,
    });
  } else {
    clone = gitClone(repo);
    steps.push({
      command: 'git clone --depth 1 <plugin repo> ./',
      effect: `default branch ${repo.defaultBranch} arrives as a local branch`,
    });

    clone = gitFetch(clone, opts.pin);
    steps.push({
      command: `git fetch origin ${opts.pin}`,
      effect: clone.fetchHeadFile
        ? `retrieved the correct commit and recorded it in .git/FETCH_HEAD`
        : 'no such object on the remote',
    });

    const out = gitCheckout(clone, 'FETCH_HEAD');
    clone = out.clone;
    steps.push({
      command: 'git checkout FETCH_HEAD',
      effect: out.readFetchHeadFile
        ? 'read .git/FETCH_HEAD'
        : out.resolution.via === 'ref'
          ? 'resolved as a ref → branch FETCH_HEAD, and the fetched commit is silently discarded'
          : 'did not resolve',
    });
  }

  const head = revParseHead(clone);
  const pinHonoured = head === opts.pin;

  let aborted = false;
  let abortReason: string | null = null;

  if (opts.assertHead) {
    steps.push({
      command: `test "$(git rev-parse HEAD)" = "${opts.pin}" || abort`,
      effect: pinHonoured
        ? `HEAD is ${opts.pin} — install continues`
        : `HEAD is ${head ?? '(none)'}, not the pin — abort`,
      fatal: !pinHonoured,
    });
    if (!pinHonoured) {
      aborted = true;
      abortReason = 'resolved HEAD does not equal the pinned SHA';
    }
  }

  const commit = head ? findCommit(opts.repo, head) : undefined;

  return {
    steps,
    head,
    headPayload: commit?.payload ?? null,
    // The agent reports the commit the marketplace manifest names. It is not
    // read back from the working tree, which is the entire point.
    reported: opts.pin,
    pinHonoured,
    aborted,
    abortReason,
    hostRejectedRefs: rejected,
  };
}

/** True when the install ran to completion with attacker content in the tree. */
export function isSilentCompromise(r: InstallResult): boolean {
  return !r.aborted && r.headPayload === 'attacker' && r.reported !== r.head;
}
