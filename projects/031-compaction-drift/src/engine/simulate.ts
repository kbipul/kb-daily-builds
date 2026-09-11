import {
  ACTIONABLE_THRESHOLD,
  DEFAULT_RETENTION,
  POLICY_BY_ID,
  POST_COMPACTION_FRACTION,
  RULE_LIKE_KINDS,
} from './policies';
import type {
  ActionOutcome,
  ActionVerdict,
  Fact,
  FactKind,
  FactState,
  FactStateAtAction,
  FactTrace,
  GovernedAction,
  Levers,
  SessionSpec,
  SimulationResult,
} from './types';

export interface CompactionEvent {
  /** Turn at which the harness compacted. */
  turn: number;
  /**
   * Turns at or after this index were inside the retained tail and therefore
   * untouched by this round.
   */
  tailStartsAtTurn: number;
}

/**
 * Walk the session forward and record where the harness had to compact.
 *
 * Growth is linear in turns, which is the simplification this whole model
 * rests on and is stated in the README: real transcripts grow unevenly, a
 * single large tool result can force a round on its own. The shape of the
 * answer — repeated rounds, each one compounding — does not depend on the
 * growth being smooth.
 */
export function planCompactions(levers: Levers, systemTokens: number): {
  events: CompactionEvent[];
  contextTokensByTurn: number[];
  overflowTurn: number | null;
} {
  const policy = POLICY_BY_ID[levers.policy];
  const events: CompactionEvent[] = [];
  const contextTokensByTurn: number[] = [];
  let overflowTurn: number | null = null;

  const limit = levers.contextLimitTokens;
  const perTurn = Math.max(1, levers.tokensPerTurn);
  let tokens = systemTokens;
  /** The oldest turn still held verbatim in the transcript. */
  let oldestLiveTurn = 1;

  for (let turn = 1; turn <= levers.turns; turn++) {
    tokens += perTurn;

    if (tokens > limit) {
      if (!policy.compacts) {
        if (overflowTurn === null) overflowTurn = turn;
        // The session cannot continue; freeze the trace here.
        contextTokensByTurn.push(tokens);
        for (let rest = turn + 1; rest <= levers.turns; rest++) contextTokensByTurn.push(tokens);
        return { events, contextTokensByTurn, overflowTurn };
      }
      const target = Math.max(systemTokens + perTurn, limit * POST_COMPACTION_FRACTION);
      const tailTokens = Math.max(perTurn, target - systemTokens);
      const tailTurns = Math.max(1, Math.floor(tailTokens / perTurn));
      const tailStartsAtTurn = Math.max(oldestLiveTurn, turn - tailTurns + 1);
      events.push({ turn, tailStartsAtTurn });
      oldestLiveTurn = tailStartsAtTurn;
      tokens = systemTokens + (turn - tailStartsAtTurn + 1) * perTurn;
    }

    contextTokensByTurn.push(tokens);
  }

  return { events, contextTokensByTurn, overflowTurn };
}

function stateFor(fidelity: number): FactState {
  if (fidelity <= 0) return 'lost';
  if (fidelity >= 0.999) return 'verbatim';
  return fidelity >= ACTIONABLE_THRESHOLD ? 'degraded' : 'lost';
}

/**
 * The turns at which a fact is (re)asserted at full fidelity: when it was
 * first stated, whenever the operator repeated it, and — if the visitor turns
 * the mitigation on — on the restatement cadence.
 */
export function assertionTurns(fact: Fact, levers: Levers): number[] {
  const turns = new Set<number>([fact.statedAtTurn, ...fact.restatedAtTurns]);
  if (levers.restateEveryNTurns > 0) {
    for (
      let t = fact.statedAtTurn + levers.restateEveryNTurns;
      t <= levers.turns;
      t += levers.restateEveryNTurns
    ) {
      turns.add(t);
    }
  }
  return [...turns].filter((t) => t >= 1 && t <= levers.turns).sort((a, b) => a - b);
}

export function traceFact(
  fact: Fact,
  levers: Levers,
  events: CompactionEvent[],
  retention: Record<FactKind, number>,
): FactTrace {
  const policy = POLICY_BY_ID[levers.policy];
  const asserted = new Set(assertionTurns(fact, levers));

  // Role-level protection: the policy keeps this role word for word, so no
  // amount of compaction degrades it.
  const roleProtected =
    (fact.role === 'system' && policy.keepsSystemVerbatim) ||
    (fact.role === 'user' && policy.keepsUserVerbatim);

  const fidelityByTurn: number[] = [];
  const stateByTurn: FactState[] = [];
  let fidelity = 0;
  let lostAtTurn: number | null = null;
  let compactionsSurvived = 0;
  /** The most recent turn at which this fact was asserted verbatim. */
  let lastAssertedTurn = -1;

  for (let turn = 1; turn <= levers.turns; turn++) {
    if (asserted.has(turn)) {
      fidelity = 1;
      lastAssertedTurn = turn;
    }

    const event = events.find((e) => e.turn === turn);
    if (event && lastAssertedTurn >= 1) {
      // Only material older than the retained tail is touched this round.
      const insideTail = lastAssertedTurn >= event.tailStartsAtTurn;
      if (!insideTail) {
        compactionsSurvived++;
        if (roleProtected) {
          fidelity = 1;
        } else if (policy.rehydratesExternalised && fact.externalised) {
          // Re-read from the store rather than recovered from the transcript.
          fidelity = 1;
        } else if (policy.summarises) {
          fidelity *= retention[fact.kind];
        } else {
          fidelity = 0;
        }
      }
    }

    if (lastAssertedTurn < 1) {
      fidelityByTurn.push(0);
      stateByTurn.push('not-yet-stated');
      continue;
    }

    fidelityByTurn.push(fidelity);
    const state = stateFor(fidelity);
    stateByTurn.push(state);
    if (state === 'lost' && lostAtTurn === null) lostAtTurn = turn;
  }

  return { factId: fact.id, fidelityByTurn, stateByTurn, lostAtTurn, compactionsSurvived };
}

function reasonFor(
  state: FactState,
  fact: Fact,
  levers: Levers,
  subagentBlocked: boolean,
): string {
  if (subagentBlocked) {
    return 'Never reached the subagent — each subagent keeps its own context, and this was not forwarded into its brief.';
  }
  const policy = POLICY_BY_ID[levers.policy];
  switch (state) {
    case 'not-yet-stated':
      return 'Not stated until after this point in the session.';
    case 'verbatim':
      if (fact.role === 'system' && policy.keepsSystemVerbatim)
        return 'In the pinned prefix, which this policy never compacts.';
      if (fact.role === 'user' && policy.keepsUserVerbatim)
        return 'An operator message, kept word for word by this policy.';
      if (policy.rehydratesExternalised && fact.externalised)
        return 'Held outside the transcript and re-read after each compaction.';
      return 'Still inside the retained tail — no compaction round has reached it.';
    case 'degraded':
      return 'Survives only inside a summary. The gist is there; the operative detail may not be.';
    case 'lost':
      return policy.summarises
        ? 'Summarised repeatedly until the operative detail was gone.'
        : 'Evicted outright — this policy discards rather than summarises.';
  }
}

export function evaluateAction(
  action: GovernedAction,
  facts: Fact[],
  traces: FactTrace[],
  levers: Levers,
  overflowTurn: number | null,
): ActionOutcome {
  if (action.atTurn > levers.turns || (overflowTurn !== null && action.atTurn >= overflowTurn)) {
    return { actionId: action.id, verdict: 'not-reached', factStates: [] };
  }

  const delegated = levers.delegateToSubagents && action.executor === 'subagent';
  const factStates: FactStateAtAction[] = [];

  for (const factId of action.governedBy) {
    const fact = facts.find((f) => f.id === factId);
    const trace = traces.find((t) => t.factId === factId);
    if (!fact || !trace) continue;

    // A subagent starts with its own context. A main-thread fact is simply
    // not there unless the operator forwarded it, whatever compaction did.
    const subagentBlocked = delegated && !levers.forwardConstraintsToSubagents;
    const fidelity = subagentBlocked ? 0 : trace.fidelityByTurn[action.atTurn - 1];
    const state: FactState = subagentBlocked
      ? 'lost'
      : trace.stateByTurn[action.atTurn - 1];

    factStates.push({
      factId,
      state,
      fidelity,
      reason: reasonFor(state, fact, levers, subagentBlocked),
    });
  }

  let verdict: ActionVerdict = 'governed';
  if (factStates.some((f) => f.state === 'lost' || f.state === 'not-yet-stated')) {
    verdict = 'ungoverned';
  } else if (factStates.some((f) => f.state === 'degraded')) {
    verdict = 'weakly-governed';
  }

  return { actionId: action.id, verdict, factStates };
}

export function simulate(
  spec: SessionSpec,
  levers: Levers,
  retention: Record<FactKind, number> = DEFAULT_RETENTION,
): SimulationResult {
  const { events, contextTokensByTurn, overflowTurn } = planCompactions(levers, spec.systemTokens);
  const traces = spec.facts.map((f) => traceFact(f, levers, events, retention));
  const outcomes = spec.actions.map((a) =>
    evaluateAction(a, spec.facts, traces, levers, overflowTurn),
  );

  const reached = outcomes.filter((o) => o.verdict !== 'not-reached');

  let firstLossTurn: number | null = null;
  for (const fact of spec.facts) {
    if (!RULE_LIKE_KINDS.includes(fact.kind)) continue;
    const trace = traces.find((t) => t.factId === fact.id);
    if (trace?.lostAtTurn != null) {
      firstLossTurn =
        firstLossTurn === null ? trace.lostAtTurn : Math.min(firstLossTurn, trace.lostAtTurn);
    }
  }

  return {
    compactionTurns: events.map((e) => e.turn),
    overflowTurn,
    traces,
    outcomes,
    contextTokensByTurn,
    ungovernedActions: reached.filter((o) => o.verdict === 'ungoverned').length,
    weaklyGovernedActions: reached.filter((o) => o.verdict === 'weakly-governed').length,
    reachedActions: reached.length,
    firstLossTurn,
  };
}
