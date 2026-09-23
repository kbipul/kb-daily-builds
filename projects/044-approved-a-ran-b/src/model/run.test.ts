import { describe as group, it, expect } from 'vitest';
import { runTurn, buildCard } from './run';
import { profileByKey, PROFILES } from './profiles';
import { CATALOGUE } from './action';
import { digest } from './digest';

const agno = profileByKey('agno');
const langgraph = profileByKey('langgraph');
const snapshot = profileByKey('snapshot');
const bound = profileByKey('bound');

group('the pair is indistinguishable on the fields Agno renders', () => {
  it('renders identical label and tool for git status and git push --force', () => {
    const a = buildCard(CATALOGUE['read-status'], agno);
    const b = buildCard(CATALOGUE['force-push'], agno);
    expect(a.fields).toEqual(b.fields);
  });

  it('omits args, which is the only field that differs', () => {
    const card = buildCard(CATALOGUE['force-push'], agno);
    expect(card.omitted).toContain('args');
    expect(CATALOGUE['read-status'].args).not.toEqual(CATALOGUE['force-push'].args);
  });
});

group('no attack', () => {
  it('runs what was approved, on every profile', () => {
    for (const p of PROFILES) {
      const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'none', profile: p });
      expect(t.outcome.kind, p.key).toBe('faithful');
      if (t.outcome.kind === 'faithful') expect(t.outcome.executed.id).toBe('read-status');
    }
  });
});

group('post-approval state substitution', () => {
  it('executes the substitute under a reference binding', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'post-approval', profile: agno });
    expect(t.outcome.kind).toBe('loopjacked');
    if (t.outcome.kind === 'loopjacked') expect(t.outcome.executed.id).toBe('force-push');
  });

  it('shows the reviewer the benign action first — the card is honest', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'post-approval', profile: langgraph });
    const args = t.card.fields.find((f) => f.name === 'args');
    expect(args?.value).toContain('git status --short');
  });

  it('still lands even when the card renders args, because args were correct when rendered', () => {
    const t = runTurn({ shown: 'refund-9', substitute: 'refund-90000', route: 'post-approval', profile: langgraph });
    expect(t.outcome.kind).toBe('loopjacked');
    if (t.outcome.kind === 'loopjacked') expect(t.outcome.executed.args.amount_usd).toBe('90000.00');
  });

  it('is closed by a value binding: the copy taken at approval is what runs', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'post-approval', profile: snapshot });
    expect(t.outcome.kind).toBe('faithful');
  });

  it('is aborted by a digest binding, which re-resolves and then re-checks', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'post-approval', profile: bound });
    expect(t.outcome.kind).toBe('aborted');
    if (t.outcome.kind === 'aborted') expect(t.outcome.why).toContain('re-checked it');
  });
});

group('representation route', () => {
  it('lands on Agno: the consequential action is proposed from the start and args are not rendered', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'representation', profile: agno });
    expect(t.outcome.kind).toBe('loopjacked');
    if (t.outcome.kind === 'loopjacked') {
      expect(t.outcome.executed.id).toBe('force-push');
      expect(t.outcome.why).toBe('Every field the card rendered is identical for both actions.');
    }
  });

  it('survives a value binding, because the copy taken is already the hostile action', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'representation', profile: snapshot });
    expect(t.outcome.kind).toBe('loopjacked');
  });

  it('survives a digest binding too: binding the wrong action tightly still runs it', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'representation', profile: bound });
    expect(t.outcome.kind).toBe('loopjacked');
    if (t.outcome.kind === 'loopjacked') expect(t.outcome.executed.id).toBe('force-push');
  });

  it('is visible to a reviewer when the card renders args', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'representation', profile: langgraph });
    expect(t.outcome.kind).toBe('loopjacked');
    if (t.outcome.kind === 'loopjacked') {
      expect(t.outcome.why).toBe('The card did carry the difference, and it was rendered before the swap.');
    }
  });
});

group('approval records', () => {
  it('keeps no copy under a reference binding', () => {
    const t = runTurn({ shown: 'read-status', substitute: 'force-push', route: 'none', profile: agno });
    expect(t.record.snapshot).toBeUndefined();
    expect(t.record.actionId).toBe('read-status');
  });

  it('records a digest that changes with args alone', () => {
    expect(digest(CATALOGUE['refund-9'])).not.toBe(digest(CATALOGUE['refund-90000']));
  });

  it('records a digest that is stable across equal actions', () => {
    expect(digest(CATALOGUE['refund-9'])).toBe(digest(structuredClone(CATALOGUE['refund-9'])));
  });
});
