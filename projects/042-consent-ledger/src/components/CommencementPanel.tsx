import { PROVISIONS } from '../dpdp/provisions';
import { PUBLICATION, countdowns } from '../dpdp/commencement';

export function CommencementPanel() {
  const cs = countdowns(new Date());

  return (
    <section className="panel">
      <h2>4 · None of this is in force yet</h2>
      <p className="panel-note">
        The commencement notification states periods, not calendar dates. Every date below is
        arithmetic on the printed publication date of {PUBLICATION}, and the eGazette record for the
        same issue carries a code embedding 14112025 — which would move all of them by a day.
      </p>

      <ul className="dates">
        {cs.map((c) => (
          <li key={c.group.id}>
            <div className="row-head">
              <span className="row-title">{c.group.computed}</span>
              <span className="days">
                {c.arrived ? 'arrived' : `${c.daysAway} days`}
                {!c.arrived && (
                  <em> (or {c.daysAwayAlternate}, on the other reading)</em>
                )}
              </span>
            </div>
            <p className="row-detail">{c.group.brings}</p>
            <p className="row-basis">
              <span className="cite" title={PROVISIONS[c.group.clause].text}>
                {PROVISIONS[c.group.clause].cite}: "{c.group.period}"
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
