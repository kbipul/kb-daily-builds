import { PROVISIONS } from '../dpdp/provisions';
import type { LedgerRow, Verdict } from '../dpdp/evaluate';

const LABEL: Record<Verdict, string> = {
  authorised: 'Authorised',
  'not-authorised': 'Not authorised',
  unsettled: 'Unsettled',
};

export function LedgerPanel({ rows }: { rows: LedgerRow[] }) {
  return (
    <section className="panel">
      <h2>2 · What the pipeline may do</h2>
      <p className="panel-note">
        Nine stages an AI feature actually has. Each verdict names the provision it turns on.
      </p>

      <ul className="ledger">
        {rows.map(({ use, ruling }) => (
          <li key={use.id} className={`row ${ruling.verdict}`}>
            <div className="row-head">
              <span className="row-title">{use.label}</span>
              <span className={`verdict ${ruling.verdict}`}>{LABEL[ruling.verdict]}</span>
            </div>
            <p className="row-detail">{use.detail}</p>
            <p className="row-reason">{ruling.reason}</p>
            {ruling.openQuestion && <p className="row-open">Open: {ruling.openQuestion}</p>}
            <p className="row-basis">
              {ruling.basis.map((id) => (
                <span key={id} title={PROVISIONS[id].text} className="cite">
                  {PROVISIONS[id].cite}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
