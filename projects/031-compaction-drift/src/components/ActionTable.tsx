import type { ActionVerdict, Fact, GovernedAction, SimulationResult } from '../engine/types';

const VERDICT_LABEL: Record<ActionVerdict, string> = {
  governed: 'rule was there',
  'weakly-governed': 'only the gist was there',
  ungoverned: 'rule was gone',
  'not-reached': 'never reached',
};

interface Props {
  actions: GovernedAction[];
  facts: Fact[];
  result: SimulationResult;
}

export default function ActionTable({ actions, facts, result }: Props) {
  return (
    <section className="panel" aria-labelledby="actions-heading">
      <h2 id="actions-heading">The moments that matter</h2>
      <p className="lede">
        Each of these is an action the agent takes whose correctness depends on something said
        earlier in the same session.
      </p>
      <ul className="actions">
        {actions.map((action) => {
          const outcome = result.outcomes.find((o) => o.actionId === action.id);
          if (!outcome) return null;
          return (
            <li className={`action action-${outcome.verdict}`} key={action.id}>
              <div className="action-head">
                <span className="action-turn">turn {action.atTurn}</span>
                <span className="action-label">{action.label}</span>
                <span className={`verdict verdict-${outcome.verdict}`}>
                  {VERDICT_LABEL[outcome.verdict]}
                </span>
              </div>
              {outcome.verdict !== 'not-reached' && (
                <>
                  <ul className="action-facts">
                    {outcome.factStates.map((fs) => {
                      const fact = facts.find((f) => f.id === fs.factId);
                      return (
                        <li key={fs.factId} className={`fs fs-${fs.state}`}>
                          <b>{fact?.label}</b>
                          <span className="fs-reason">{fs.reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {outcome.verdict === 'ungoverned' && (
                    <p className="consequence">{action.consequence}</p>
                  )}
                </>
              )}
              {action.executor === 'subagent' && (
                <p className="delegated-note">Delegated to a subagent.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
