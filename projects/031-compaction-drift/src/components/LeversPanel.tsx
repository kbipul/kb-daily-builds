import { POLICIES, POLICY_BY_ID } from '../engine/policies';
import { CONTEXT_WINDOWS } from '../engine/sessions';
import type { Levers, PolicyId } from '../engine/types';

interface Props {
  levers: Levers;
  onChange: (next: Levers) => void;
  hasDelegatedActions: boolean;
}

export default function LeversPanel({ levers, onChange, hasDelegatedActions }: Props) {
  const policy = POLICY_BY_ID[levers.policy];
  const set = (patch: Partial<Levers>) => onChange({ ...levers, ...patch });

  return (
    <section className="panel" aria-labelledby="levers-heading">
      <h2 id="levers-heading">Harness settings</h2>

      <label className="field">
        <span className="field-label">Compaction policy</span>
        <select
          value={levers.policy}
          onChange={(e) => set({ policy: e.target.value as PolicyId })}
          aria-label="Compaction policy"
        >
          {POLICIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mechanism">{policy.mechanism}</p>
      <p className="source">
        {policy.source} ·{' '}
        <a href={policy.url} target="_blank" rel="noreferrer">
          reference
        </a>
      </p>

      <label className="field">
        <span className="field-label">Context window</span>
        <select
          value={levers.contextLimitTokens}
          onChange={(e) => set({ contextLimitTokens: Number(e.target.value) })}
          aria-label="Context window"
        >
          {CONTEXT_WINDOWS.map((w) => (
            <option key={w.tokens} value={w.tokens}>
              {w.label} tokens
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">
          Session length <b>{levers.turns} turns</b>
        </span>
        <input
          type="range"
          min={20}
          max={300}
          step={5}
          value={levers.turns}
          onChange={(e) => set({ turns: Number(e.target.value) })}
          aria-label="Session length in turns"
        />
      </label>

      <label className="field">
        <span className="field-label">
          Transcript growth <b>{levers.tokensPerTurn.toLocaleString()} tokens / turn</b>
        </span>
        <input
          type="range"
          min={1000}
          max={20000}
          step={500}
          value={levers.tokensPerTurn}
          onChange={(e) => set({ tokensPerTurn: Number(e.target.value) })}
          aria-label="Tokens per turn"
        />
      </label>

      <label className="field">
        <span className="field-label">
          Re-state every rule{' '}
          <b>
            {levers.restateEveryNTurns === 0
              ? 'never'
              : `every ${levers.restateEveryNTurns} turns`}
          </b>
        </span>
        <input
          type="range"
          min={0}
          max={40}
          step={1}
          value={levers.restateEveryNTurns}
          onChange={(e) => set({ restateEveryNTurns: Number(e.target.value) })}
          aria-label="Restatement cadence"
        />
      </label>

      <fieldset className="toggles" disabled={!hasDelegatedActions}>
        <legend>Subagents</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={levers.delegateToSubagents}
            onChange={(e) => set({ delegateToSubagents: e.target.checked })}
          />
          <span>Delegate flagged work to subagents</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={levers.forwardConstraintsToSubagents}
            disabled={!levers.delegateToSubagents}
            onChange={(e) => set({ forwardConstraintsToSubagents: e.target.checked })}
          />
          <span>Forward the rules into each subagent brief</span>
        </label>
        <p className="hint">
          Each subagent keeps its own context. Anything the main thread knows reaches it only if
          you put it in the brief — and it arrives at whatever fidelity the main thread still has.
        </p>
      </fieldset>
    </section>
  );
}
