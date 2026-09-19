import { PUBLISHED, SOURCE, type MetricKind } from '../oversight/figures';

const GROUPS: { kind: MetricKind; title: string; gloss: string }[] = [
  { kind: 'fleet', title: 'The fleet', gloss: 'What is running.' },
  {
    kind: 'coverage',
    title: 'Coverage',
    gloss: 'The share of an agent’s actions that pass through a monitor.',
  },
  {
    kind: 'latency',
    title: 'Review latency',
    gloss: 'The time between an action and its review.',
  },
  {
    kind: 'escalation',
    title: 'Escalation rate',
    gloss: 'The share of activity blocked, redirected or flagged.',
  },
];

export function FiguresPanel() {
  return (
    <section className="panel figures">
      <h2>What was published</h2>
      <p className="lede">
        Three metrics, and Anthropic&rsquo;s own figures for one internal
        platform. Every quote below is verbatim; every scope line is the caveat
        Anthropic attaches to the number.
      </p>
      {GROUPS.map((g) => (
        <div className="group" key={g.kind}>
          <h3>
            {g.title} <span className="gloss">{g.gloss}</span>
          </h3>
          {PUBLISHED.filter((f) => f.metric === g.kind).map((f) => (
            <div className="figure" key={f.id}>
              <div className="figure-head">
                <span className="figure-label">{f.label}</span>
                <span className="figure-value">{f.value}</span>
              </div>
              <blockquote>{f.quote}</blockquote>
              <p className="scope">{f.scope}</p>
            </div>
          ))}
        </div>
      ))}
      <p className="source">
        Source:{' '}
        <a href={SOURCE.url} target="_blank" rel="noreferrer">
          {SOURCE.title}
        </a>
        , {SOURCE.authors}, {SOURCE.published}. Read {SOURCE.read}.
      </p>
    </section>
  );
}
