import { SELF_DESCRIPTION, SOURCE_URL } from '../engine/corpus';

export function SelfDescription() {
  return (
    <div className="self-desc" data-testid="self-description">
      <p className="self-intro">
        Seven sentences in which the document describes its own standing. They are not scored above:
        none of them is a commitment about how a model behaves, and running them through the same
        triage would be a category error.
      </p>
      <ul>
        {SELF_DESCRIPTION.map((s) => (
          <li key={s.text}>
            <q>{s.text}</q>
            <span className="where">{s.where}</span>
          </li>
        ))}
      </ul>
      <p className="self-outro">
        Read together they set the floor for everything on this page. A commitment you could check
        is still a commitment about a model that, on the document's own account, is not yet trained
        on it. <a href={SOURCE_URL}>Read the document</a>.
      </p>
    </div>
  );
}
