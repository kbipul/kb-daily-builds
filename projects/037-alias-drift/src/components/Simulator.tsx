import { useState } from 'react';
import { simulate, isSelfAnnouncing } from '../lib/simulate';
import type { IdentifierRow } from '../lib/types';

export default function Simulator({ row }: { row: IdentifierRow }) {
  const [ran, setRan] = useState(false);
  const steps = simulate(row);
  const selfAnnouncing = isSelfAnnouncing(row);

  return (
    <div className="panel simulator">
      <div className="simulator-head">
        <h2 className="drift-title">Deprecation day</h2>
        <button type="button" className="run-btn" onClick={() => setRan(true)}>
          {ran ? 'Run again' : 'Simulate the day this gets deprecated'}
        </button>
      </div>

      {!ran && (
        <p className="muted">
          Press the button. The three beats below are read straight off this
          row&rsquo;s own notice and post-event fields — nothing here is invented
          per click.
        </p>
      )}

      {ran && (
        <>
          <ol className="timeline">
            {steps.map((step) => (
              <li key={step.t} className={`timeline-step tone-${step.tone}`}>
                <div className="timeline-t">{step.t}</div>
                <div className="timeline-label">{step.label}</div>
                <div className="timeline-detail">{step.detail}</div>
              </li>
            ))}
          </ol>
          <p className={`verdict verdict-${selfAnnouncing ? 'ok' : 'bad'}`}>
            {selfAnnouncing
              ? 'You can tell this happened without inspecting a single response — an error or a notice does the telling for you.'
              : 'Nothing in your error rate, your logs, or your bill announces this on its own. You would have to be comparing outputs to notice.'}
          </p>
        </>
      )}
    </div>
  );
}
