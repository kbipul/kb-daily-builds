import { describe, expect, it } from 'vitest';
import { isSilentCompromise, runInstall } from './install';
import { AGENTS } from './agents';
import { HOSTS } from './host';
import {
  ATTACKER_COMMIT,
  BUMPED_PIN,
  benignRepo,
  fetchHeadBranchRepo,
  shaBranchRepo,
} from './repo';

const pin = BUMPED_PIN;

describe('the branch-name variant', () => {
  it('installs attacker code on Bitbucket while the pin looks honoured', () => {
    const r = runInstall({
      repo: shaBranchRepo(pin),
      host: 'bitbucket',
      agent: 'claude-code',
      pin,
      assertHead: false,
    });
    expect(r.head).toBe(ATTACKER_COMMIT);
    expect(r.headPayload).toBe('attacker');
    expect(r.reported).toBe(pin);
    expect(r.pinHonoured).toBe(false);
    expect(isSilentCompromise(r)).toBe(true);
  });

  it('lands on the pinned commit on GitHub, same agent, same commands', () => {
    const r = runInstall({
      repo: shaBranchRepo(pin),
      host: 'github',
      agent: 'claude-code',
      pin,
      assertHead: false,
    });
    expect(r.head).toBe(pin);
    expect(r.pinHonoured).toBe(true);
    expect(r.hostRejectedRefs).toEqual([pin]);
  });

  it('emits the ambiguity warning git would print', () => {
    const r = runInstall({
      repo: shaBranchRepo(pin),
      host: 'self-hosted',
      agent: 'codex',
      pin,
      assertHead: false,
    });
    const checkout = r.steps.find((s) => s.command.startsWith('git checkout'));
    expect(checkout?.warning).toMatch(/is ambiguous/);
  });
});

describe('the FETCH_HEAD variant', () => {
  it('is not closed by the GitHub ref-name policy', () => {
    const r = runInstall({
      repo: fetchHeadBranchRepo(),
      host: 'github',
      agent: 'gemini-cli',
      pin,
      assertHead: false,
    });
    expect(r.hostRejectedRefs).toEqual([]);
    expect(r.head).toBe(ATTACKER_COMMIT);
    expect(isSilentCompromise(r)).toBe(true);
  });

  it('still fetches the right commit before discarding it', () => {
    const r = runInstall({
      repo: fetchHeadBranchRepo(),
      host: 'github',
      agent: 'gemini-cli',
      pin,
      assertHead: false,
    });
    const fetch = r.steps.find((s) => s.command.startsWith('git fetch'));
    expect(fetch?.effect).toContain('.git/FETCH_HEAD');
  });
});

describe('the assertion', () => {
  it('aborts both variants', () => {
    const branch = runInstall({
      repo: shaBranchRepo(pin),
      host: 'self-hosted',
      agent: 'claude-code',
      pin,
      assertHead: true,
    });
    const fetchHead = runInstall({
      repo: fetchHeadBranchRepo(),
      host: 'github',
      agent: 'gemini-cli',
      pin,
      assertHead: true,
    });
    expect(branch.aborted).toBe(true);
    expect(fetchHead.aborted).toBe(true);
    expect(branch.abortReason).toBe('resolved HEAD does not equal the pinned SHA');
  });

  it('does not abort a clean install', () => {
    const r = runInstall({
      repo: benignRepo(),
      host: 'github',
      agent: 'claude-code',
      pin,
      assertHead: true,
    });
    expect(r.aborted).toBe(false);
    expect(r.head).toBe(pin);
  });
});

describe('what the agent reports', () => {
  it('reports the pin in every combination of agent, host and repo', () => {
    const repos = [benignRepo(), shaBranchRepo(pin), fetchHeadBranchRepo()];
    for (const agent of AGENTS) {
      for (const host of HOSTS) {
        for (const repo of repos) {
          for (const assertHead of [false, true]) {
            const r = runInstall({ repo, host: host.id, agent: agent.id, pin, assertHead });
            expect(r.reported).toBe(pin);
          }
        }
      }
    }
  });

  it('disagrees with the working tree only when something was swapped', () => {
    const clean = runInstall({
      repo: benignRepo(),
      host: 'bitbucket',
      agent: 'codex',
      pin,
      assertHead: false,
    });
    const dirty = runInstall({
      repo: shaBranchRepo(pin),
      host: 'bitbucket',
      agent: 'codex',
      pin,
      assertHead: false,
    });
    expect(clean.reported).toBe(clean.head);
    expect(dirty.reported).not.toBe(dirty.head);
    expect(dirty.steps.map((s) => s.command)).toEqual(
      clean.steps.map((s) => s.command).filter((c) => !c.startsWith('#')),
    );
  });
});
