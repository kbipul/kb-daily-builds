import type { Finding } from '../git/findings';

export function FindingsPanel({ findings }: { findings: Finding[] }) {
  return (
    <section className="panel findings">
      <h2>Findings</h2>
      {findings.map((f) => (
        <article key={f.id} className={f.settled ? 'finding' : 'finding open'}>
          <h3>
            {f.title}
            {!f.settled && <span className="tag">open</span>}
          </h3>
          <p>{f.body}</p>
        </article>
      ))}
    </section>
  );
}
