import type { Finding } from '../engine/types';
import { formatDuration } from '../engine/hardware';

const GATE_LABEL: Record<Finding['gate'], string> = {
  'model-presence': 'model not pulled',
  availability: 'machine unavailable',
  engine: 'no engine',
  memory: 'not enough memory',
};

export function Findings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <section className="findings">
        <h2>What to fix</h2>
        <p className="muted">
          Nothing. Every machine is awake, running an engine, and holding the models this workload
          asks for.
        </p>
      </section>
    );
  }

  return (
    <section className="findings">
      <h2>What to fix</h2>
      <p className="muted">
        Each row is priced by re-running the scheduler with that one machine brought in and
        everything else left alone. The savings are not additive — once the first machine joins
        there is less work left for the second to take, so two rows worth a minute each are rarely
        worth two minutes together. The ceiling above is the honest combined figure.
      </p>
      <ul className="finding-list">
        {findings.map((f) => (
          <li key={f.nodeId} className={f.savedSec > 0.5 ? 'finding' : 'finding finding-null'}>
            <span className="finding-saved">
              {f.savedSec > 0.5 ? `-${formatDuration(f.savedSec)}` : '—'}
            </span>
            <span className="finding-body">
              <strong>{f.action}</strong>
              <span className="finding-gate">{GATE_LABEL[f.gate]}</span>
              <span className="finding-detail">{f.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
