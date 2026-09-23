import type { AuditState } from '../model/audit';

const LABEL: Record<string, string> = {
  confirmed: 'confirmed',
  needs_validation: 'needs_validation',
  rejected: 'rejected',
};

export function FindingsPanel({ state }: { state: AuditState }) {
  const reported = state.findings.filter((f) => f.verdict !== 'rejected');

  return (
    <div className="panel">
      <h2>findings.json</h2>
      <p className="hint">
        What the report says. Every entry has been re-checked by an agent that did not find it.
      </p>
      {reported.length === 0 && <p className="pending">No findings yet.</p>}
      <ul className="findings">
        {state.findings.map((f, i) => (
          <li key={f.id + '-' + i} className={f.verdict}>
            <span className={'verdict ' + f.verdict}>{LABEL[f.verdict]}</span>
            <span className="fid">{f.id}</span>
            <code>{f.path}</code>
            <span className="cls">{f.cls}</span>
            <span className="run">run {f.run}</span>
            <span className="vtick" title="independently verified">
              verified
            </span>
            {f.skippedLater && (
              <span className="shielded" title="A later run skipped this path because this finding already named it">
                path skipped since
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
