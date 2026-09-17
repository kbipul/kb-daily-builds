import { useMemo, useState } from 'react';
import { SCENARIOS } from './fides/scenarios';
import { simulate } from './fides/engine';
import { ScenarioPicker } from './components/ScenarioPicker';
import { ToolList } from './components/ToolList';
import { StepTimeline } from './components/StepTimeline';

export default function App() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [dropApplied, setDropApplied] = useState(false);

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId)!, [scenarioId]);

  const trace = useMemo(
    () =>
      simulate(scenario.tools, scenario.steps, {
        dropAfterStepId: dropApplied ? scenario.dropToggleAfterStepId : undefined,
      }),
    [scenario, dropApplied],
  );

  function pick(id: string) {
    setScenarioId(id);
    setDropApplied(false);
  }

  const blockedCount = trace.filter((t) => t.decision !== 'ran').length;

  return (
    <div className="page">
      <div className="hero">
        <p className="eyebrow">Day 38 · kb-daily-builds</p>
        <h1>Still Untrusted</h1>
        <p className="tagline">
          One bad read taints the rest of the run, and nothing decays it automatically. A from-scratch simulator of{' '}
          <a href="https://learn.microsoft.com/en-us/agent-framework/agents/security" target="_blank" rel="noreferrer">
            Microsoft Agent Framework&rsquo;s FIDES
          </a>{' '}
          label algebra — <code>agent-framework-core</code> is Python-only, so this reimplements the documented rules in
          TypeScript and checks them against Microsoft&rsquo;s own worked example.
        </p>
      </div>

      <div className="panel intro-panel">
        <p>
          Every piece of content an agent touches carries two labels: <strong>integrity</strong> (trusted / untrusted) and{' '}
          <strong>confidentiality</strong> (public / private / user_identity). Labels combine using the{' '}
          <em>most-restrictive-wins</em> rule as they flow through tool calls, and a policy check runs before every
          sensitive tool — not after. Pick a scenario, then read the timeline below step by step.
        </p>
      </div>

      <div className="picker">
        <ScenarioPicker scenarios={SCENARIOS} activeId={scenarioId} onPick={pick} />
      </div>

      <div className="panel">
        <p className="source-note">{scenario.sourceNote}</p>
      </div>

      <h2 className="section-title">Tools in this scenario</h2>
      <ToolList tools={scenario.tools} />

      {scenario.dropToggleAfterStepId && (
        <div className="panel drop-panel">
          <label className="drop-toggle">
            <input type="checkbox" checked={dropApplied} onChange={(e) => setDropApplied(e.target.checked)} />
            Apply the hypothetical drop
          </label>
          <p className="drop-caption">{scenario.dropToggleCaption}</p>
        </div>
      )}

      <div className="timeline-summary">
        <h2 className="section-title">Trace</h2>
        <span className="blocked-count">
          {blockedCount} of {trace.length} call{trace.length === 1 ? '' : 's'} blocked
        </span>
      </div>
      <StepTimeline trace={trace} />

      <footer className="footer">
        <p>
          Every rule above is reimplemented from{' '}
          <a href="https://learn.microsoft.com/en-us/agent-framework/agents/security" target="_blank" rel="noreferrer">
            Microsoft&rsquo;s FIDES documentation
          </a>
          , current as of the doc&rsquo;s 25 Aug 2026 update and the security PRs merged 8 Sep 2026. Nothing here calls a
          model or an API — the whole thing runs on a pure function in your browser.
        </p>
      </footer>
    </div>
  );
}
