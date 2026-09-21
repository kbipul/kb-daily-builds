import { describe, expect, it } from 'vitest';
import {
  contextualFindings,
  sourceTension,
  standingFindings,
  sweepHost,
} from './findings';
import { runInstall } from './install';
import { BUMPED_PIN, shaBranchRepo } from './repo';

describe('findings', () => {
  it('states every unsettled finding as a question', () => {
    const r = runInstall({
      repo: shaBranchRepo(BUMPED_PIN),
      host: 'bitbucket',
      agent: 'github-copilot',
      pin: BUMPED_PIN,
      assertHead: false,
    });
    const all = [
      ...standingFindings(),
      ...contextualFindings(r, 'github-copilot'),
      sourceTension(),
    ];
    const open = all.filter((f) => !f.settled);
    expect(open.length).toBeGreaterThan(1);
    for (const f of open) expect(f.title, f.id).toMatch(/\?$/);
  });

  it('does not phrase a settled finding as a question', () => {
    for (const f of standingFindings()) expect(f.title, f.id).not.toMatch(/\?$/);
  });

  it('raises the contested-patch question only for the agent it applies to', () => {
    const r = runInstall({
      repo: shaBranchRepo(BUMPED_PIN),
      host: 'bitbucket',
      agent: 'claude-code',
      pin: BUMPED_PIN,
      assertHead: false,
    });
    const ids = contextualFindings(r, 'claude-code').map((f) => f.id);
    expect(ids).not.toContain('copilot-status');
  });
});

describe('sweepHost', () => {
  it('leaves exactly one agent exposed on GitHub', () => {
    const exposed = sweepHost('github').filter((x) => !x.pinHonoured);
    expect(exposed.map((x) => x.agent)).toEqual(['gemini-cli']);
  });

  it('exposes all four on a host that allows commit-shaped branch names', () => {
    for (const host of ['bitbucket', 'self-hosted'] as const) {
      expect(sweepHost(host).every((x) => !x.pinHonoured)).toBe(true);
    }
  });
});
