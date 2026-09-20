import { useMemo, useState } from 'react';
import { DEFAULT_RECORD, togglePurpose, type ConsentRecord } from './dpdp/record';
import { USES } from './dpdp/uses';
import { countBy, ledger } from './dpdp/evaluate';
import { NoticePanel } from './components/NoticePanel';
import { LedgerPanel } from './components/LedgerPanel';
import { ResiduePanel } from './components/ResiduePanel';
import { CommencementPanel } from './components/CommencementPanel';

export function App() {
  const [record, setRecord] = useState<ConsentRecord>(DEFAULT_RECORD);
  const rows = useMemo(() => ledger(record, USES), [record]);
  const counts = useMemo(() => countBy(rows), [rows]);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Day 042 · kb-daily-builds</p>
        <h1>Consent Ledger</h1>
        <p className="lede">
          Write the consent notice for an AI feature the way section 6(1) describes it, then read
          which parts of the pipeline it actually authorises — and which stores a withdrawal can
          still reach afterwards.
        </p>
        <p className="tally">
          <span className="chip chip-yes">{counts.authorised} authorised</span>
          <span className="chip chip-no">{counts['not-authorised']} not authorised</span>
          <span className="chip chip-open">{counts.unsettled} unsettled</span>
        </p>
      </header>

      <main>
        <NoticePanel
          record={record}
          onTogglePurpose={(p) => setRecord((r) => togglePurpose(r, p))}
          onToggleChild={() => setRecord((r) => ({ ...r, principalIsChild: !r.principalIsChild }))}
          onToggleWithdrawn={() => setRecord((r) => ({ ...r, withdrawn: !r.withdrawn }))}
        />
        <LedgerPanel rows={rows} />
        <ResiduePanel rows={rows} withdrawn={record.withdrawn} />
        <CommencementPanel />
      </main>

      <footer>
        <p>
          Legal information, not legal advice. Every quoted string in{' '}
          <code>src/dpdp/provisions.ts</code> is Gazette text; the dates are arithmetic on a printed
          publication date and are labelled as such.
        </p>
        <p>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> ·{' '}
          <a href="https://github.com/kbipul/consent-ledger">source</a>
        </p>
      </footer>
    </div>
  );
}
