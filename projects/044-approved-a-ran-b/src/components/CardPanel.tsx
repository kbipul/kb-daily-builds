import type { Card } from '../model/run';

export function CardPanel({
  card,
  approved,
  onApprove,
}: {
  card: Card;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="panel">
      <h2>1 · The approval card</h2>
      <p className="hint">This, and only this, is what the reviewer reads.</p>
      <dl className="card">
        {card.fields.map((f) => (
          <div key={f.name}>
            <dt>{f.name}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      {card.omitted.length > 0 && (
        <p className="omitted">
          Not rendered: {card.omitted.map((o) => <code key={o}>{o}</code>)}
        </p>
      )}
      <button onClick={onApprove} disabled={approved}>
        {approved ? 'Approved' : 'Approve'}
      </button>
    </div>
  );
}
