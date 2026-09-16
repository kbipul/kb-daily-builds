import { BINDING_KINDS } from '../lib/corpus';
import type { IdentifierRow } from '../lib/types';

const RISK_LABEL = ['Frozen', 'Auto-upgrades', 'Aliased', 'Zero notice'];

export default function DriftCard({ row }: { row: IdentifierRow }) {
  const kind = BINDING_KINDS[row.bindingKind];
  return (
    <div className="panel drift-card">
      <div className="drift-head">
        <div>
          <div className="eyebrow">{row.provider}</div>
          <h2 className="drift-title">{row.shape}</h2>
          <code className="drift-example">{row.example}</code>
        </div>
        <span className={`risk-badge risk-${kind.risk}`}>{RISK_LABEL[kind.risk]}</span>
      </div>

      <dl className="drift-facts">
        <dt>Classification</dt>
        <dd>{kind.label}</dd>

        <dt>Notice</dt>
        <dd>{row.notice}</dd>

        <dt>What happens</dt>
        <dd>{row.postEventBehavior}</dd>

        <dt>Source</dt>
        <dd>
          <a href={row.sourceUrl} target="_blank" rel="noreferrer">
            {row.sourceLabel}
          </a>
        </dd>
      </dl>

      {row.caveat && <p className="caveat">Caveat: {row.caveat}</p>}
    </div>
  );
}
