import type { AuditState } from '../model/audit';

export function RepoPanel({
  state,
  onFix,
  onRegress,
}: {
  state: AuditState;
  onFix: (id: string) => void;
  onRegress: (id: string) => void;
}) {
  const reported = new Set(state.findings.filter((f) => f.verdict !== 'rejected').map((f) => f.id));

  return (
    <div className="panel">
      <h2>What the repo actually holds</h2>
      <p className="hint">
        Ground truth. The pipeline cannot read this panel, and neither can a real audit. Fix one, then put it back.
      </p>
      <ul className="truth">
        {state.truth.map((v) => {
          const named = reported.has(v.id);
          const cls = v.fixed ? 'fixed' : named ? 'named' : 'missed';
          return (
            <li key={v.id} className={cls}>
              <span className="fid">{v.id}</span>
              <code>{v.path}</code>
              <span className="cls">{v.cls}</span>
              <span className="status">
                {v.fixed ? 'fixed' : named ? 'in the report' : 'not in the report'}
              </span>
              {v.fixed ? (
                <button className="tiny" onClick={() => onRegress(v.id)}>
                  regress
                </button>
              ) : (
                <button className="tiny" onClick={() => onFix(v.id)}>
                  fix
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
