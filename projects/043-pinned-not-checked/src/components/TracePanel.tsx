import type { InstallResult } from '../git/install';
import { findCommit, short } from '../git/repo';
import type { Repo } from '../git/repo';

export function TracePanel({ result, repo }: { result: InstallResult; repo: Repo }) {
  const landed = result.head ? findCommit(repo, result.head) : undefined;

  return (
    <section className="panel trace">
      <h2>What the agent ran</h2>
      <ol className="steps">
        {result.steps.map((s, i) => (
          <li key={i} className={s.fatal ? 'step fatal' : 'step'}>
            <code className="cmd">{s.command}</code>
            <span className="effect">{s.effect}</span>
            {s.warning && <span className="warn">{s.warning}</span>}
          </li>
        ))}
      </ol>

      <div className="outcome">
        <div className={`out-row ${result.pinHonoured ? 'good' : 'bad'}`}>
          <span className="out-label">In the working tree</span>
          <span className="out-value">
            <code>{short(result.head)}</code>
            {landed && <em> {landed.note}</em>}
          </span>
        </div>
        <div className="out-row neutral">
          <span className="out-label">Reported as installed</span>
          <span className="out-value">
            <code>{short(result.reported)}</code>
            <em> copied from the marketplace manifest</em>
          </span>
        </div>
      </div>

      <p className={`verdict ${result.aborted ? 'aborted' : result.pinHonoured ? 'held' : 'broken'}`}>
        {result.aborted
          ? `Install aborted: ${result.abortReason}.`
          : result.pinHonoured
            ? 'The pin held. The working tree holds the commit the marketplace reviewed.'
            : 'The pin did not hold, and nothing in this run says so.'}
      </p>
    </section>
  );
}
