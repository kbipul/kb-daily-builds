import type { InstallResult } from './install';
import { runInstall } from './install';
import type { AgentId } from './agents';
import { AGENTS, getAgent } from './agents';
import type { HostId } from './host';
import { fetchHeadBranchRepo, shaBranchRepo, BUMPED_PIN } from './repo';

export interface Finding {
  id: string;
  title: string;
  body: string;
  /** false where the source leaves the question open; the title then ends in '?'. */
  settled: boolean;
}

/** Findings that hold regardless of what the reader has selected. */
export function standingFindings(): Finding[] {
  return [
    {
      id: 'report-is-an-echo',
      title: 'The install report is an echo of the manifest',
      body:
        'The commit this app reports as installed is the pinned SHA in every single run, compromised or clean, because it is copied from the marketplace manifest rather than read back from the working tree. That is modelled deliberately: reported is set to the pin by construction in runInstall, and a test asserts it never differs. An operator reading install logs cannot tell the two cases apart, which is why the disclosure calls the result zero-click and not merely silent.',
      settled: true,
    },
    {
      id: 'host-closes-three-of-four',
      title: 'Moving to GitHub closes three agents and leaves the fourth open',
      body:
        'GitHub refuses a 40-hex branch name, so on GitHub the commit-shaped branch never exists and Claude Code, Codex and GitHub Copilot all land on the pinned commit. Gemini CLI is untouched by that policy for a mechanical reason the simulator produces on its own: its attack branch is named FETCH_HEAD, which is not commit-shaped, so no ref-name rule filters it. The disclosure reaches the same conclusion in one line, that a GitHub-only marketplace "does nothing for Gemini CLI’s variant".',
      settled: true,
    },
    {
      id: 'default-branch-required',
      title: 'The attack needs the default branch, and not merely a branch',
      body:
        'A plain clone brings down only the default branch as a local branch. Point the commit-shaped branch at attacker code but leave main as the default and the checkout finds no local ref by that name, falls through to the commit object, and lands on the reviewed code. Every threat model that grants an attacker repository control grants this for free, which is why it reads as a footnote and not a mitigation.',
      settled: true,
    },
    {
      id: 'assertion-reads-head',
      title: 'The fix is one line and it has to read HEAD',
      body:
        'Toggling the assertion on aborts both variants. It works on the Gemini path as well because it compares the resolved HEAD, not the name that was requested: checkout FETCH_HEAD succeeded in its own terms, it simply succeeded against a branch. A check written against the requested ref would pass and install the attacker’s tree.',
      settled: true,
    },
  ];
}

/** Findings that depend on the current selection. */
export function contextualFindings(result: InstallResult, agent: AgentId): Finding[] {
  const out: Finding[] = [];
  const profile = getAgent(agent);

  if (result.hostRejectedRefs.length > 0 && result.pinHonoured) {
    out.push({
      id: 'saved-by-the-host',
      title: 'This run was saved by the host, not by the agent',
      body: `The agent ran the same unverified checkout it always runs. What stopped it was ${result.hostRejectedRefs.length} branch name the host refused to create. Change the host and the identical agent code produces the identical command trace with a different commit in the tree.`,
      settled: true,
    });
  }

  if (profile.autoUpdateIsDefault === null) {
    out.push({
      id: 'auto-update-unstated',
      title: `Does ${profile.label} auto-update plugins in the background?`,
      body: profile.autoUpdateNote + ' That gap matters: background auto-update is what turns a swapped pin into a zero-click event reaching machines that installed months ago. It is left unresolved here, because the source does not say.',
      settled: false,
    });
  }

  if (profile.patchState === 'contested') {
    out.push({
      id: 'copilot-status',
      title: 'Is GitHub Copilot patched?',
      body: profile.patchNote,
      settled: false,
    });
  }

  return out;
}

/** The open question this build could not close from the source alone. */
export function sourceTension(): Finding {
  return {
    id: 'tldr-vs-deep-dive',
    title: 'Does the attack need a commit-shaped branch name, or just a default branch?',
    body:
      'The TL;DR says an attacker "can now set the default branch to a malicious version and anyone who installs will get the malicious version". Read alone, that describes a plain default-branch swap defeating any pin. The technical section is narrower: the branch has to be named the exact 40-hex pinned SHA, and on a host that permits such names. This simulator implements the narrow reading, because that is the one with commands attached, and prints both, so the gap stays visible to whoever reads it next.',
    settled: false,
  };
}

/**
 * Sweeps every agent against both attack repos on a given host. Used by the
 * matrix panel and pinned by a test.
 */
export function sweepHost(host: HostId): Array<{ agent: AgentId; pinHonoured: boolean }> {
  return AGENTS.map((a) => {
    const repo = a.shape === 'clone-fetch-checkout-fetch-head' ? fetchHeadBranchRepo() : shaBranchRepo(BUMPED_PIN);
    const r = runInstall({ repo, host, agent: a.id, pin: BUMPED_PIN, assertHead: false });
    return { agent: a.id, pinHonoured: r.pinHonoured };
  });
}
