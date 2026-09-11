import { FACT_KIND_LABEL } from '../engine/policies';
import type { Fact, FactState, GovernedAction, SimulationResult } from '../engine/types';

const STATE_LABEL: Record<FactState, string> = {
  'not-yet-stated': 'not yet stated',
  verbatim: 'verbatim',
  degraded: 'in a summary only',
  lost: 'gone',
};

const ROLE_LABEL: Record<Fact['role'], string> = {
  system: 'system prompt',
  user: 'you typed it',
  assistant: 'the model concluded it',
  tool_result: 'a tool returned it',
  subagent_report: 'a subagent reported it',
};

interface Props {
  facts: Fact[];
  actions: GovernedAction[];
  result: SimulationResult;
  turns: number;
  onToggleExternalised: (factId: string) => void;
}

export default function FactTimeline({
  facts,
  actions,
  result,
  turns,
  onToggleExternalised,
}: Props) {
  const compactions = new Set(result.compactionTurns);

  return (
    <section className="panel" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">What is still in context, turn by turn</h2>
      <p className="lede">
        Each row is one thing the session needs to keep knowing. Each cell is a turn.
        <span className="chip chip-verbatim">verbatim</span>
        <span className="chip chip-degraded">summary only</span>
        <span className="chip chip-lost">gone</span>
        {result.compactionTurns.length > 0 && (
          <>
            {' '}
            The dark ticks are the {result.compactionTurns.length} compaction round
            {result.compactionTurns.length === 1 ? '' : 's'}.
          </>
        )}
      </p>

      {result.overflowTurn !== null && (
        <p className="overflow-note" role="status">
          Without compaction this session stops at turn {result.overflowTurn}: the transcript no
          longer fits the window and the request fails. Everything after that never happens.
        </p>
      )}

      <div className="timeline">
        {facts.map((fact) => {
          const trace = result.traces.find((t) => t.factId === fact.id);
          if (!trace) return null;
          return (
            <div className="tl-row" key={fact.id}>
              <div className="tl-meta">
                <span className={`kind kind-${fact.kind}`}>{FACT_KIND_LABEL[fact.kind]}</span>
                <span className="tl-label">{fact.label}</span>
                <span className="tl-sub">
                  turn {fact.statedAtTurn} · {ROLE_LABEL[fact.role]}
                  {trace.lostAtTurn !== null && (
                    <b className="tl-lost"> · gone by turn {trace.lostAtTurn}</b>
                  )}
                </span>
                <label className="check check-sm">
                  <input
                    type="checkbox"
                    checked={fact.externalised}
                    onChange={() => onToggleExternalised(fact.id)}
                    aria-label={`Write "${fact.label}" to durable storage`}
                  />
                  <span>written to durable storage</span>
                </label>
              </div>
              <div className="tl-track" role="img" aria-label={trackSummary(fact, trace.stateByTurn)}>
                {Array.from({ length: turns }, (_, i) => {
                  const state = trace.stateByTurn[i] ?? 'not-yet-stated';
                  const turn = i + 1;
                  return (
                    <span
                      key={turn}
                      className={`cell cell-${state}${compactions.has(turn) ? ' cell-compaction' : ''}`}
                      title={`Turn ${turn}: ${STATE_LABEL[state]}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="tl-row tl-actions">
          <div className="tl-meta">
            <span className="tl-label">Actions taken</span>
            <span className="tl-sub">the moments the rules above have to be there</span>
          </div>
          <div className="tl-track">
            {Array.from({ length: turns }, (_, i) => {
              const turn = i + 1;
              const action = actions.find((a) => a.atTurn === turn);
              const outcome = action
                ? result.outcomes.find((o) => o.actionId === action.id)
                : undefined;
              return (
                <span
                  key={turn}
                  className={`cell cell-action${outcome ? ` act-${outcome.verdict}` : ''}`}
                  title={action ? `Turn ${turn}: ${action.label}` : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function trackSummary(fact: Fact, states: FactState[]): string {
  const lost = states.findIndex((s) => s === 'lost');
  if (lost === -1) return `${fact.label}: present for the whole session.`;
  return `${fact.label}: no longer actionable from turn ${lost + 1}.`;
}
