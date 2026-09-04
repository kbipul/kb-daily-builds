import type { Diagnostic } from '../engine/cache';
import { KNOWN_INVALIDATORS } from '../engine/presets';

export function Findings({ diagnostics }: { diagnostics: Diagnostic[] }) {
  return (
    <section className="panel">
      <h2>Findings</h2>
      <ul className="findings">
        {diagnostics.map((d, i) => (
          <li key={i} className={`finding sev-${d.severity}`}>
            <div className="finding-title">{d.title}</div>
            <div className="finding-detail">{d.detail}</div>
          </li>
        ))}
      </ul>

      <details className="invalidators">
        <summary>Six things that silently break a prefix</summary>
        <ul>
          {KNOWN_INVALIDATORS.map((k) => (
            <li key={k.title}>
              <strong>{k.title}</strong>
              <div className="muted">{k.detail}</div>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
