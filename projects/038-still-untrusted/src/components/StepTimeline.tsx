import type { TraceEntry } from '../fides/engine';
import { LabelBadge } from './LabelBadge';

const DECISION_LABEL: Record<TraceEntry['decision'], string> = {
  ran: 'Ran',
  'blocked-integrity': 'Blocked — integrity',
  'blocked-confidentiality': 'Blocked — confidentiality',
};

const DECISION_CLASS: Record<TraceEntry['decision'], string> = {
  ran: 'decision-ran',
  'blocked-integrity': 'decision-blocked',
  'blocked-confidentiality': 'decision-blocked',
};

export function StepTimeline({ trace }: { trace: TraceEntry[] }) {
  return (
    <ol className="timeline">
      {trace.map((entry, i) => (
        <li key={entry.step.id} className="timeline-item">
          <div className="timeline-index">{i + 1}</div>
          <div className="timeline-body panel">
            <div className="timeline-head">
              <code>{entry.toolSpec.name}</code>
              <span className={`decision ${DECISION_CLASS[entry.decision]}`}>{DECISION_LABEL[entry.decision]}</span>
            </div>
            <p className="timeline-narrative">{entry.step.narrative}</p>
            <div className="timeline-context">
              <span className="context-label">context before</span>
              <LabelBadge label={entry.contextBefore} />
              <span className="context-arrow">→</span>
              <span className="context-label">after</span>
              <LabelBadge label={entry.contextAfter} />
            </div>
            <p className="timeline-reason">{entry.reason}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
