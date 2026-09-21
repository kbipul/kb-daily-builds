import { DISCLOSURE, QUOTES } from '../git/source';

export function SourcePanel() {
  return (
    <section className="panel source">
      <h2>What this is built from</h2>
      <p className="cite">
        {DISCLOSURE.authors.join(', ')}. <a href={DISCLOSURE.url}>{DISCLOSURE.title}</a>.{' '}
        {DISCLOSURE.publisher}, {DISCLOSURE.published}. Found {DISCLOSURE.foundMonth}, disclosed to
        all four vendors {DISCLOSURE.disclosedMonth}.
      </p>
      <dl className="quotes">
        {QUOTES.map((q) => (
          <div key={q.id}>
            <dt>{q.section}</dt>
            <dd>&ldquo;{q.text}&rdquo;</dd>
          </div>
        ))}
      </dl>
      <p className="note">
        Every behaviour in the simulator traces to one of these lines. Nothing here was tested
        against a real agent, a real marketplace or a real git host.
      </p>
    </section>
  );
}
