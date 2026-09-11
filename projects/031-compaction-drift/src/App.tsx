import { useMemo, useState } from 'react';
import ActionTable from './components/ActionTable';
import BasisPanel from './components/BasisPanel';
import FactTimeline from './components/FactTimeline';
import LeversPanel from './components/LeversPanel';
import { DEFAULT_RETENTION, POLICY_BY_ID } from './engine/policies';
import { SESSIONS, defaultLevers } from './engine/sessions';
import { simulate } from './engine/simulate';
import type { FactKind, Levers, SessionSpec } from './engine/types';
import './App.css';

export default function App() {
  const [specId, setSpecId] = useState(SESSIONS[0].id);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [levers, setLevers] = useState<Levers>(() => defaultLevers(SESSIONS[0]));
  const [retention, setRetention] = useState<Record<FactKind, number>>({ ...DEFAULT_RETENTION });

  const spec: SessionSpec = useMemo(() => {
    const base = SESSIONS.find((s) => s.id === specId)!;
    return {
      ...base,
      facts: base.facts.map((f) =>
        f.id in overrides ? { ...f, externalised: overrides[f.id] } : f,
      ),
    };
  }, [specId, overrides]);

  const result = useMemo(() => simulate(spec, levers, retention), [spec, levers, retention]);

  const selectSpec = (id: string) => {
    const next = SESSIONS.find((s) => s.id === id)!;
    setSpecId(id);
    setOverrides({});
    setLevers(defaultLevers(next));
  };

  const policy = POLICY_BY_ID[levers.policy];
  const failing = result.ungovernedActions;
  const weak = result.weaklyGovernedActions;
  const hasDelegated = spec.actions.some((a) => a.executor === 'subagent');

  return (
    <div className="app">
      <header className="hero">
        <p className="kicker">Day 031 · kb-daily-builds</p>
        <h1>Compaction Drift</h1>
        <p className="thesis">
          The Agents API went to public beta on 10 September 2026: OpenAI now runs the harness, and
          it compacts your session automatically to keep it inside the window, &ldquo;preserving
          information the agent needs to continue&rdquo;. A standing rule is not information the
          agent needs to continue. It is information the agent needs once, later, at the exact
          moment it is about to break it.
        </p>
        <p className="thesis">
          Lay out a long session and watch which of your rules is still there when the agent acts on
          it.
        </p>
      </header>

      <nav className="scenarios" aria-label="Scenario">
        {SESSIONS.map((s) => (
          <button
            key={s.id}
            className={s.id === specId ? 'scenario active' : 'scenario'}
            onClick={() => selectSpec(s.id)}
            aria-pressed={s.id === specId}
          >
            <b>{s.name}</b>
            <span>{s.turns} turns</span>
          </button>
        ))}
      </nav>
      <p className="blurb">{spec.blurb}</p>

      <section className="verdict-bar" aria-live="polite">
        <div className={`headline ${failing > 0 ? 'bad' : weak > 0 ? 'warn' : 'good'}`}>
          <span className="big">
            {failing} of {result.reachedActions}
          </span>
          <span className="cap">
            actions taken with the governing rule no longer in context
            {weak > 0 && <> · {weak} more with only the gist of it</>}
          </span>
        </div>
        <dl className="stats">
          <div>
            <dt>Compaction rounds</dt>
            <dd>{result.compactionTurns.length}</dd>
          </div>
          <div>
            <dt>First rule lost</dt>
            <dd>{result.firstLossTurn === null ? 'none' : `turn ${result.firstLossTurn}`}</dd>
          </div>
          <div>
            <dt>Policy</dt>
            <dd>{policy.name}</dd>
          </div>
        </dl>
      </section>

      <div className="columns">
        <LeversPanel levers={levers} onChange={setLevers} hasDelegatedActions={hasDelegated} />
        <div className="col-main">
          <FactTimeline
            facts={spec.facts}
            actions={spec.actions}
            result={result}
            turns={levers.turns}
            onToggleExternalised={(id) =>
              setOverrides((o) => ({
                ...o,
                [id]: !(id in o ? o[id] : spec.facts.find((f) => f.id === id)!.externalised),
              }))
            }
          />
          <ActionTable actions={spec.actions} facts={spec.facts} result={result} />
        </div>
      </div>

      <BasisPanel
        retention={retention}
        onChange={(kind, value) => setRetention((r) => ({ ...r, [kind]: value }))}
        onReset={() => setRetention({ ...DEFAULT_RETENTION })}
      />

      <footer className="foot">
        <p>
          No key, no network, no model — the whole thing is arithmetic over a policy table you can
          read in{' '}
          <a
            href="https://github.com/kbipul/compaction-drift/blob/main/src/engine/policies.ts"
            target="_blank"
            rel="noreferrer"
          >
            policies.ts
          </a>
          . This is not a simulation of any vendor&rsquo;s summariser; none of them is published.
        </p>
        <p>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> · Day 031 of{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>
        </p>
      </footer>
    </div>
  );
}
