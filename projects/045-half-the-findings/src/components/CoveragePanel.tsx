import type { AuditState, Summary } from '../model/audit';

export function CoveragePanel({
  state,
  summary,
  totalPaths,
}: {
  state: AuditState;
  summary: Summary;
  totalPaths: number;
}) {
  return (
    <div className="panel wide">
      <h2>Coverage ledger</h2>
      <ol className="runs">
        {state.runs.map((r) => (
          <li key={r.n}>
            <span className="run">run {r.n}</span>
            <span className="explored">
              read {r.explored.map((p) => <code key={p}>{p.replace('src/', '')}</code>)}
            </span>
            {r.skipped.length > 0 && (
              <span className="skippedset">
                skipped {r.skipped.map((p) => <code key={p}>{p.replace('src/', '')}</code>)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="verdicts">
        {summary.unexplored.length > 0 ? (
          <p className="gap">
            {summary.unexplored.length} of {totalPaths} paths have never been read by any run. Nothing in the report
            covers them, and the report does not say so.
          </p>
        ) : (
          <p className="closed">Every path has been read by some run.</p>
        )}

        {summary.shielded.length > 0 && (
          <p className="alarm">
            {summary.shielded.length} live{' '}
            {summary.shielded.length === 1 ? 'vulnerability sits' : 'vulnerabilities sit'} on a path the last run
            skipped because a finding already named it:{' '}
            {summary.shielded.map((v) => (
              <code key={v.id}>{v.id}</code>
            ))}
            . Targeting gaps is what makes runs additive, and it is also what lets a regression stay invisible.
          </p>
        )}
      </div>
    </div>
  );
}
