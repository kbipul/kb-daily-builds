import { CATALOGUE, describe } from '../model/action';
import type { Trace } from '../model/run';

export function OutcomePanel({ trace, benignId }: { trace: Trace; benignId: string }) {
  const understood = CATALOGUE[benignId as keyof typeof CATALOGUE];
  const o = trace.outcome;

  return (
    <div className={'panel outcome ' + o.kind}>
      <h2>4 · What ran</h2>
      <div className="diff">
        <div>
          <span className="diff-label">The reviewer understood</span>
          <code>{describe(understood)}</code>
        </div>
        <div>
          <span className="diff-label">The executor called</span>
          <code>{o.kind === 'aborted' ? 'nothing' : describe(o.executed)}</code>
        </div>
      </div>

      {o.kind === 'faithful' && <p className="verdict">Same action. This turn held.</p>}

      {o.kind === 'aborted' && (
        <p className="verdict">
          Aborted. {o.why}
        </p>
      )}

      {o.kind === 'loopjacked' && (
        <>
          <p className="verdict">
            Loopjacked via the {o.route === 'representation' ? 'representation' : 'post-approval substitution'} route.
          </p>
          <p className="why">{o.why}</p>
          {!o.executed.reversible && <p className="irreversible">The action that ran cannot be undone.</p>}
        </>
      )}
    </div>
  );
}
