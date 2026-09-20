import { PURPOSES, hasPurpose, type ConsentRecord, type PurposeId } from '../dpdp/record';

interface Props {
  record: ConsentRecord;
  onTogglePurpose: (p: PurposeId) => void;
  onToggleChild: () => void;
  onToggleWithdrawn: () => void;
}

export function NoticePanel({ record, onTogglePurpose, onToggleChild, onToggleWithdrawn }: Props) {
  return (
    <section className="panel">
      <h2>1 · The notice</h2>
      <p className="panel-note">
        Tick what your section 5 notice actually names. Consent is "limited to such personal data as
        is necessary for such specified purpose" — everything downstream is decided here.
      </p>

      <ul className="purposes">
        {PURPOSES.map((p) => {
          const on = hasPurpose(record, p.id);
          return (
            <li key={p.id}>
              <label className={on ? 'purpose on' : 'purpose'}>
                <input type="checkbox" checked={on} onChange={() => onTogglePurpose(p.id)} />
                <span>
                  <strong>{p.label}</strong>
                  <em>{p.noticeWording}</em>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="switches">
        <label className={record.principalIsChild ? 'switch on' : 'switch'}>
          <input type="checkbox" checked={record.principalIsChild} onChange={onToggleChild} />
          The user is a child (under 18)
        </label>
        <label className={record.withdrawn ? 'switch on danger' : 'switch'}>
          <input type="checkbox" checked={record.withdrawn} onChange={onToggleWithdrawn} />
          The user withdraws consent
        </label>
      </div>
    </section>
  );
}
