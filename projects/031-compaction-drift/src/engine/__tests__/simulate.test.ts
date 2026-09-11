import { describe, expect, it } from 'vitest';
import {
  assertionTurns,
  evaluateAction,
  planCompactions,
  simulate,
  traceFact,
} from '../simulate';
import {
  ACTIONABLE_THRESHOLD,
  DEFAULT_RETENTION,
  POLICIES,
  POLICY_BY_ID,
  POST_COMPACTION_FRACTION,
  RULE_LIKE_KINDS,
} from '../policies';
import { CONTEXT_WINDOWS, SESSIONS, defaultLevers } from '../sessions';
import type { Fact, Levers, PolicyId, SessionSpec } from '../types';

const incident = SESSIONS[0];

function levers(over: Partial<Levers> = {}): Levers {
  return { ...defaultLevers(incident), ...over };
}

function fact(over: Partial<Fact> = {}): Fact {
  return {
    id: 'f',
    label: 'a rule',
    kind: 'constraint',
    role: 'tool_result',
    statedAtTurn: 1,
    restatedAtTurns: [],
    externalised: false,
    ...over,
  };
}

describe('planCompactions', () => {
  it('never compacts while the transcript fits the window', () => {
    const { events, overflowTurn } = planCompactions(
      levers({ turns: 10, tokensPerTurn: 1000, contextLimitTokens: 200_000 }),
      1000,
    );
    expect(events).toHaveLength(0);
    expect(overflowTurn).toBeNull();
  });

  it('reports an overflow instead of compacting when the policy does not compact', () => {
    const { events, overflowTurn } = planCompactions(
      levers({ policy: 'none', turns: 100, tokensPerTurn: 10_000, contextLimitTokens: 100_000 }),
      0,
    );
    expect(events).toHaveLength(0);
    expect(overflowTurn).toBe(11);
  });

  it('keeps the transcript at or under the window on every turn once compacting', () => {
    const { contextTokensByTurn } = planCompactions(
      levers({ turns: 300, tokensPerTurn: 4000, contextLimitTokens: 128_000 }),
      4000,
    );
    for (const tokens of contextTokensByTurn) {
      expect(tokens).toBeLessThanOrEqual(128_000);
    }
  });

  it('compacts back to roughly the configured fraction of the window', () => {
    const limit = 200_000;
    const { events, contextTokensByTurn } = planCompactions(
      levers({ turns: 200, tokensPerTurn: 5000, contextLimitTokens: limit }),
      5000,
    );
    expect(events.length).toBeGreaterThan(1);
    const afterFirst = contextTokensByTurn[events[0].turn - 1];
    expect(afterFirst).toBeLessThanOrEqual(limit * POST_COMPACTION_FRACTION + 5000);
  });

  it('compacts more often in a smaller window', () => {
    const counts = CONTEXT_WINDOWS.map(
      (w) =>
        planCompactions(levers({ turns: 300, tokensPerTurn: 6000, contextLimitTokens: w.tokens }), 4000)
          .events.length,
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it('emits one context-size reading per turn', () => {
    const l = levers({ turns: 137 });
    expect(planCompactions(l, 3000).contextTokensByTurn).toHaveLength(137);
  });

  it('leaves the most recent turns inside the retained tail', () => {
    const { events } = planCompactions(
      levers({ turns: 200, tokensPerTurn: 5000, contextLimitTokens: 128_000 }),
      3000,
    );
    for (const e of events) {
      expect(e.tailStartsAtTurn).toBeLessThanOrEqual(e.turn);
      expect(e.tailStartsAtTurn).toBeGreaterThan(0);
    }
  });
});

describe('assertionTurns', () => {
  it('includes the first statement and every operator restatement', () => {
    const f = fact({ statedAtTurn: 3, restatedAtTurns: [20, 40] });
    expect(assertionTurns(f, levers({ turns: 60, restateEveryNTurns: 0 }))).toEqual([3, 20, 40]);
  });

  it('adds the cadence when the restatement mitigation is on', () => {
    const f = fact({ statedAtTurn: 2 });
    expect(assertionTurns(f, levers({ turns: 12, restateEveryNTurns: 4 }))).toEqual([2, 6, 10]);
  });

  it('never returns a turn beyond the end of the session', () => {
    const f = fact({ statedAtTurn: 1, restatedAtTurns: [500] });
    for (const t of assertionTurns(f, levers({ turns: 30, restateEveryNTurns: 7 }))) {
      expect(t).toBeLessThanOrEqual(30);
    }
  });
});

describe('traceFact', () => {
  const long = levers({ turns: 200, tokensPerTurn: 6000, contextLimitTokens: 128_000 });
  const { events } = planCompactions(long, 3000);

  it('reports not-yet-stated before the fact enters the transcript', () => {
    const t = traceFact(fact({ statedAtTurn: 40 }), long, events, DEFAULT_RETENTION);
    expect(t.stateByTurn[0]).toBe('not-yet-stated');
    expect(t.stateByTurn[39]).toBe('verbatim');
  });

  it('holds a pinned system rule at full fidelity for the whole session', () => {
    const t = traceFact(
      fact({ role: 'system' }),
      { ...long, policy: 'pinned-prefix' },
      events,
      DEFAULT_RETENTION,
    );
    expect(new Set(t.fidelityByTurn)).toEqual(new Set([1]));
    expect(t.lostAtTurn).toBeNull();
  });

  it('degrades a tool-result rule monotonically under a summarising policy', () => {
    const t = traceFact(fact({ role: 'tool_result' }), long, events, DEFAULT_RETENTION);
    for (let i = 1; i < t.fidelityByTurn.length; i++) {
      expect(t.fidelityByTurn[i]).toBeLessThanOrEqual(t.fidelityByTurn[i - 1]);
    }
    expect(t.lostAtTurn).not.toBeNull();
  });

  it('destroys rather than degrades under a non-summarising policy', () => {
    const t = traceFact(
      fact({ role: 'tool_result' }),
      { ...long, policy: 'sliding-window' },
      events,
      DEFAULT_RETENTION,
    );
    expect(t.fidelityByTurn.filter((f) => f > 0 && f < 1)).toHaveLength(0);
    expect(t.fidelityByTurn[t.fidelityByTurn.length - 1]).toBe(0);
  });

  it('loses a carve-out before a standing rule, all else equal', () => {
    const rule = traceFact(fact({ kind: 'constraint' }), long, events, DEFAULT_RETENTION);
    const carve = traceFact(fact({ kind: 'exception' }), long, events, DEFAULT_RETENTION);
    expect(carve.lostAtTurn!).toBeLessThanOrEqual(rule.lostAtTurn!);
  });

  it('keeps task state longest of all the kinds', () => {
    const byKind = (Object.keys(DEFAULT_RETENTION) as (keyof typeof DEFAULT_RETENTION)[]).map(
      (kind) => ({
        kind,
        fidelity: traceFact(fact({ kind }), long, events, DEFAULT_RETENTION).fidelityByTurn[199],
      }),
    );
    const best = byKind.reduce((a, b) => (b.fidelity > a.fidelity ? b : a));
    expect(best.kind).toBe('task-state');
  });

  it('resets to verbatim every time the fact is restated', () => {
    const t = traceFact(
      fact({ role: 'tool_result' }),
      { ...long, restateEveryNTurns: 5 },
      events,
      DEFAULT_RETENTION,
    );
    expect(t.lostAtTurn).toBeNull();
    expect(t.fidelityByTurn[199]).toBeGreaterThanOrEqual(ACTIONABLE_THRESHOLD);
  });

  it('re-reads an externalised fact after each round only under the externalising policy', () => {
    const f = fact({ role: 'tool_result', externalised: true });
    const withStore = traceFact(f, { ...long, policy: 'externalised' }, events, DEFAULT_RETENTION);
    const without = traceFact(f, { ...long, policy: 'pinned-prefix' }, events, DEFAULT_RETENTION);
    expect(withStore.lostAtTurn).toBeNull();
    expect(without.lostAtTurn).not.toBeNull();
  });

  it('counts only the rounds that actually reached the fact', () => {
    const late = traceFact(fact({ statedAtTurn: 199 }), long, events, DEFAULT_RETENTION);
    expect(late.compactionsSurvived).toBe(0);
  });

  it('produces one fidelity and one state reading per turn', () => {
    const t = traceFact(fact(), long, events, DEFAULT_RETENTION);
    expect(t.fidelityByTurn).toHaveLength(200);
    expect(t.stateByTurn).toHaveLength(200);
  });
});

describe('evaluateAction', () => {
  const l = levers();
  const sim = simulate(incident, l);

  it('marks an action beyond the end of the session as not reached', () => {
    const out = evaluateAction(
      { ...incident.actions[0], atTurn: 500 },
      incident.facts,
      sim.traces,
      l,
      null,
    );
    expect(out.verdict).toBe('not-reached');
  });

  it('marks actions after an overflow as not reached', () => {
    const noCompaction = levers({ policy: 'none' });
    const r = simulate(incident, noCompaction);
    expect(r.overflowTurn).not.toBeNull();
    for (const o of r.outcomes) {
      const action = incident.actions.find((a) => a.id === o.actionId)!;
      if (action.atTurn >= r.overflowTurn!) expect(o.verdict).toBe('not-reached');
    }
  });

  it('blocks a main-thread rule from a subagent that was not briefed with it', () => {
    const r = simulate(incident, levers({ forwardConstraintsToSubagents: false }));
    const delegated = incident.actions.filter((a) => a.executor === 'subagent');
    for (const a of delegated) {
      const o = r.outcomes.find((x) => x.actionId === a.id)!;
      expect(o.verdict).toBe('ungoverned');
      expect(o.factStates.every((f) => f.reason.includes('subagent'))).toBe(true);
    }
  });

  it('does not block subagents when delegation is turned off entirely', () => {
    const r = simulate(
      incident,
      levers({ delegateToSubagents: false, forwardConstraintsToSubagents: false }),
    );
    const o = r.outcomes.find((x) => x.actionId === 'a-restart')!;
    expect(o.factStates.every((f) => !f.reason.includes('subagent'))).toBe(true);
  });

  it('is ungoverned when any single governing fact is gone', () => {
    const out = sim.outcomes.find((o) => o.actionId === 'a-summary')!;
    expect(out.factStates.length).toBeGreaterThan(1);
  });

  it('attaches a written reason to every fact state it reports', () => {
    for (const o of sim.outcomes) {
      for (const f of o.factStates) {
        expect(f.reason.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('simulate — the findings this tool exists to make', () => {
  const base = levers();

  it('the rule pinned in the system prompt is the one that survives', () => {
    const r = simulate(incident, base);
    const restart = r.outcomes.find((o) => o.actionId === 'a-restart')!;
    expect(restart.verdict).toBe('governed');
    const approval = incident.facts.find((f) => f.id === 'approval')!;
    expect(approval.role).toBe('system');
  });

  it('most governed actions in the default scenario are taken without their rule', () => {
    const r = simulate(incident, base);
    expect(r.reachedActions).toBe(4);
    expect(r.ungovernedActions + r.weaklyGovernedActions).toBeGreaterThanOrEqual(3);
  });

  /**
   * The load-bearing claim, and the one that does NOT depend on the retention
   * table: a policy that keeps operator messages verbatim rescues everything
   * the human typed and nothing the session discovered for itself, because a
   * tool result is not an operator message under any of these policies.
   */
  it('user-verbatim compaction rescues what the operator typed and not what a tool returned', () => {
    const r = simulate(incident, levers({ policy: 'user-verbatim' }));
    const residency = r.outcomes.find((o) => o.actionId === 'a-findings')!;
    expect(residency.verdict).toBe('governed');
    expect(incident.facts.find((f) => f.id === 'residency')!.role).toBe('user');

    const freeze = r.outcomes.find((o) => o.actionId === 'a-freeze')!;
    expect(freeze.verdict).toBe('ungoverned');
    expect(incident.facts.find((f) => f.id === 'freeze')!.role).toBe('tool_result');
  });

  it('no policy saves the tool-discovered carve-out in the default scenario', () => {
    for (const p of POLICIES.filter((x) => x.compacts)) {
      const r = simulate(incident, levers({ policy: p.id }));
      const freeze = r.outcomes.find((o) => o.actionId === 'a-freeze')!;
      expect(freeze.verdict).not.toBe('governed');
    }
  });

  /**
   * Externalising state is the published mitigation, and in the presets it
   * changes nothing — because the only fact anyone thought to externalise was
   * the top-level rule, which the pinned prefix was already protecting.
   */
  it('externalising only the system rule buys nothing over pinning it', () => {
    const pinned = simulate(incident, levers({ policy: 'pinned-prefix' }));
    const stored = simulate(incident, levers({ policy: 'externalised' }));
    expect(stored.ungovernedActions).toBe(pinned.ungovernedActions);
    expect(stored.weaklyGovernedActions).toBe(pinned.weaklyGovernedActions);
  });

  it('externalising the tool-discovered carve-out instead is what actually helps', () => {
    const patched: SessionSpec = {
      ...incident,
      facts: incident.facts.map((f) =>
        f.id === 'freeze' ? { ...f, externalised: true } : { ...f, externalised: false },
      ),
    };
    const stored = simulate(patched, levers({ policy: 'externalised' }));
    const freeze = stored.outcomes.find((o) => o.actionId === 'a-freeze')!;
    expect(freeze.verdict).toBe('governed');
  });

  it('discarding is strictly worse than summarising', () => {
    const drop = simulate(incident, levers({ policy: 'sliding-window' }));
    const summarise = simulate(incident, levers({ policy: 'pinned-prefix' }));
    expect(drop.ungovernedActions).toBeGreaterThanOrEqual(summarise.ungovernedActions);
    expect(drop.firstLossTurn!).toBeLessThanOrEqual(summarise.firstLossTurn!);
  });

  it('restating every few turns removes every loss', () => {
    const r = simulate(incident, levers({ restateEveryNTurns: 8 }));
    expect(r.firstLossTurn).toBeNull();
    expect(r.ungovernedActions).toBe(0);
  });

  it('a bigger window delays the first loss but does not prevent it in a long session', () => {
    const small = simulate(SESSIONS[1], { ...defaultLevers(SESSIONS[1]), contextLimitTokens: 128_000 });
    const large = simulate(SESSIONS[1], {
      ...defaultLevers(SESSIONS[1]),
      contextLimitTokens: 1_050_000,
    });
    expect(small.compactionTurns.length).toBeGreaterThan(large.compactionTurns.length);
    if (large.firstLossTurn !== null && small.firstLossTurn !== null) {
      expect(large.firstLossTurn).toBeGreaterThanOrEqual(small.firstLossTurn);
    }
  });

  it('reports every action in every preset, and never double counts a verdict', () => {
    for (const spec of SESSIONS) {
      const r = simulate(spec, defaultLevers(spec));
      expect(r.outcomes).toHaveLength(spec.actions.length);
      expect(r.ungovernedActions + r.weaklyGovernedActions).toBeLessThanOrEqual(r.reachedActions);
    }
  });

  it('only rule-like facts count towards the first-loss headline', () => {
    const onlyTaskState: SessionSpec = {
      ...incident,
      facts: incident.facts.map((f) => ({ ...f, kind: 'task-state' as const })),
    };
    expect(simulate(onlyTaskState, levers({ policy: 'sliding-window' })).firstLossTurn).toBeNull();
    expect(RULE_LIKE_KINDS).not.toContain('task-state');
  });
});

describe('policy catalogue', () => {
  it('gives every policy a source and a link', () => {
    for (const p of POLICIES) {
      expect(p.source.length).toBeGreaterThan(10);
      expect(p.url).toMatch(/^https:\/\//);
      expect(p.mechanism.length).toBeGreaterThan(40);
    }
  });

  it('indexes every policy by id', () => {
    for (const p of POLICIES) expect(POLICY_BY_ID[p.id as PolicyId]).toBe(p);
  });

  it('has exactly one non-compacting baseline', () => {
    expect(POLICIES.filter((p) => !p.compacts)).toHaveLength(1);
  });

  it('orders retention so that a carve-out is the most droppable thing in the transcript', () => {
    const values = Object.values(DEFAULT_RETENTION);
    expect(DEFAULT_RETENTION.exception).toBe(Math.min(...values));
    expect(DEFAULT_RETENTION['task-state']).toBe(Math.max(...values));
  });

  it('keeps every retention value a genuine loss below 1', () => {
    for (const v of Object.values(DEFAULT_RETENTION)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('scenario data', () => {
  it('states every fact before the action it governs', () => {
    for (const spec of SESSIONS) {
      for (const action of spec.actions) {
        for (const id of action.governedBy) {
          const f = spec.facts.find((x) => x.id === id);
          expect(f, `${spec.id}: ${action.id} references unknown fact ${id}`).toBeDefined();
          expect(f!.statedAtTurn).toBeLessThan(action.atTurn);
        }
      }
    }
  });

  it('keeps every action inside its session', () => {
    for (const spec of SESSIONS) {
      for (const a of spec.actions) expect(a.atTurn).toBeLessThanOrEqual(spec.turns);
    }
  });

  it('gives every action a stated consequence', () => {
    for (const spec of SESSIONS) {
      for (const a of spec.actions) expect(a.consequence.length).toBeGreaterThan(20);
    }
  });

  it('exercises every policy-relevant role across the presets', () => {
    const roles = new Set(SESSIONS.flatMap((s) => s.facts.map((f) => f.role)));
    expect(roles).toContain('system');
    expect(roles).toContain('user');
    expect(roles).toContain('tool_result');
  });

  it('includes at least one delegated action per preset', () => {
    for (const spec of SESSIONS) {
      expect(spec.actions.some((a) => a.executor === 'subagent')).toBe(true);
    }
  });

  it('uses unique ids throughout', () => {
    for (const spec of SESSIONS) {
      expect(new Set(spec.facts.map((f) => f.id)).size).toBe(spec.facts.length);
      expect(new Set(spec.actions.map((a) => a.id)).size).toBe(spec.actions.length);
    }
    expect(new Set(SESSIONS.map((s) => s.id)).size).toBe(SESSIONS.length);
  });

  it('starts every preset with a policy that actually compacts', () => {
    for (const spec of SESSIONS) {
      expect(POLICY_BY_ID[defaultLevers(spec).policy].compacts).toBe(true);
    }
  });
});
