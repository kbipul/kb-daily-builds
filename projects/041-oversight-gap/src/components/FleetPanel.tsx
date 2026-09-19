import { fleetMetrics, summaryLine, SCENARIOS, type FleetInput } from '../oversight/fleet';
import { fmt, pct } from '../format';

interface Props {
  selected: FleetInput;
  onSelect: (f: FleetInput) => void;
}

export function FleetPanel({ selected, onSelect }: Props) {
  const m = fleetMetrics(selected);

  return (
    <section className="panel fleet">
      <h2>The same three numbers, for a fleet you actually run</h2>
      <p className="lede">
        None of these needs a clever monitor. Coverage is a question about
        plumbing, latency is a timestamp difference, and the escalation rate is
        a count over a count.
      </p>

      <div className="tabs" role="tablist">
        {SCENARIOS.map((s) => (
          <button
            key={s.name}
            role="tab"
            aria-selected={s.name === selected.name}
            className={s.name === selected.name ? 'on' : ''}
            onClick={() => onSelect(s)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="cards">
        <div className="card">
          <span className="k">Coverage, all actions</span>
          <span className="v">{pct(m.coverage, 1)}</span>
        </div>
        <div className={`card ${m.uninspectedWrites > 0 ? 'warn' : ''}`}>
          <span className="k">Coverage, write actions</span>
          <span className="v">{pct(m.writeCoverage, 1)}</span>
        </div>
        <div className="card">
          <span className="k">Median human latency</span>
          <span className="v">{m.medianHumanHours}h</span>
        </div>
        <div className="card">
          <span className="k">Escalation rate</span>
          <span className="v">{pct(m.escalationRate)}</span>
        </div>
        <div className="card">
          <span className="k">Blocked per week</span>
          <span className="v">{fmt(m.blockedPerWeek)}</span>
        </div>
        <div className={`card ${m.uninspectedWrites > 0 ? 'warn' : ''}`}>
          <span className="k">Writes nothing inspects</span>
          <span className="v">{fmt(m.uninspectedWrites)}</span>
        </div>
      </div>

      <p className="summary-line">&ldquo;{summaryLine(selected)}&rdquo;</p>
      {m.uninspectedWrites > 0 && (
        <p className="warn-line">
          {fmt(m.uninspectedWrites)} write actions had a path to run that nothing
          inspected. Close that before tuning anything else: a catch rate on a
          monitor those calls never reach is not a number about them.
        </p>
      )}
    </section>
  );
}
