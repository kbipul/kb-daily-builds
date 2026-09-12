import type { Analysis, RuleResult } from '../engine/types';

interface Props {
  analysis: Analysis;
  onFocus: (indices: number[]) => void;
  focused: number[];
}

const ICON: Record<RuleResult['status'], string> = {
  pass: '✓',
  fail: '✕',
  'n/a': '–',
};

/**
 * Rule-by-rule verdict. Clicking a failing row highlights the segments that
 * caused it, so the table is a way into the text rather than a score card you
 * have to take on trust.
 */
export default function RuleTable({ analysis, onFocus, focused }: Props) {
  return (
    <section className="rules" aria-labelledby="rules-heading">
      <div className="rules__head">
        <h2 id="rules-heading">Conventions</h2>
        <p className="rules__score">
          {analysis.rulesPassed} / {analysis.rulesApplicable} applicable checks pass
        </p>
      </div>

      <ul className="rules__list">
        {analysis.rules.map((rule) => {
          const clickable = rule.evidence.length > 0;
          const isFocused =
            clickable && focused.length > 0 && focused[0] === rule.evidence[0];
          return (
            <li key={rule.id} className={`rule rule--${rule.status}`}>
              <button
                type="button"
                className="rule__btn"
                disabled={!clickable}
                aria-pressed={isFocused}
                onClick={() => onFocus(isFocused ? [] : rule.evidence)}
              >
                <span className="rule__icon" aria-hidden="true">
                  {ICON[rule.status]}
                </span>
                <span className="rule__body">
                  <span className="rule__title">
                    {rule.title}
                    <span className="rule__status"> {rule.status}</span>
                  </span>
                  <span className="rule__convention">{rule.convention}</span>
                  <span className="rule__detail">{rule.detail}</span>
                  {clickable && (
                    <span className="rule__hint">
                      {isFocused ? 'Clear highlight' : `Show ${rule.evidence.length} in the text`}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
