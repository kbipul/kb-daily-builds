import { RESIDUE, residueFor, unreachableStores, weakestReach, type Reach } from '../dpdp/residue';
import type { LedgerRow } from '../dpdp/evaluate';
import type { StoreId } from '../dpdp/uses';

const REACH_LABEL: Record<Reach, string> = {
  erased: 'Delete works',
  'erasable-if-instrumented': 'Delete works if you planned for it',
  'contractual-only': 'Only a contract says so',
  'no-erase-primitive': 'There is no delete',
};

/** Stores the pipeline has already written to under the current notice. */
function touchedStores(rows: LedgerRow[]): StoreId[] {
  const stores = rows
    .filter((r) => r.ruling.verdict !== 'not-authorised' && r.use.store !== 'none')
    .map((r) => r.use.store);
  const withProcessors = rows.some(
    (r) => r.ruling.verdict !== 'not-authorised' && r.use.foreignProcessor,
  )
    ? [...stores, 'processor-copy' as StoreId]
    : stores;
  return Array.from(new Set(withProcessors));
}

export function ResiduePanel({ rows, withdrawn }: { rows: LedgerRow[]; withdrawn: boolean }) {
  // When consent is withdrawn every row reads not-authorised, so the stores that
  // matter are the ones the notice reached while it still stood.
  const live = withdrawn
    ? rows.map((r) => ({ ...r, ruling: { ...r.ruling, verdict: 'authorised' as const } }))
    : rows;
  const stores = touchedStores(live);
  const worst = weakestReach(stores);
  const stuck = unreachableStores(stores);

  return (
    <section className="panel">
      <h2>3 · What a withdrawal can reach</h2>
      <p className="panel-note">
        Section 6(6) says cease. Section 8(7) says erase. A running system answers those two asks
        with different levels of confidence depending on where the data landed.
      </p>

      <p className={`headline reach-${worst}`}>
        Across the {stores.length} store{stores.length === 1 ? '' : 's'} this notice reaches:{' '}
        <strong>{REACH_LABEL[worst]}</strong>
      </p>

      <ul className="residue">
        {RESIDUE.filter((r) => r.store !== 'none').map((row) => {
          const touched = stores.includes(row.store);
          return (
            <li key={row.store} className={touched ? `res reach-${row.reach}` : 'res idle'}>
              <div className="row-head">
                <span className="row-title">{row.label}</span>
                <span className="reach">{touched ? REACH_LABEL[row.reach] : 'not written'}</span>
              </div>
              {touched && <p className="row-detail">{row.effect}</p>}
              {touched && row.precondition && (
                <p className="row-open">Only if: {row.precondition}</p>
              )}
            </li>
          );
        })}
      </ul>

      {stuck.length > 0 && (
        <p className="warn">
          {stuck.length === 1 ? 'One store' : `${stuck.length} stores`} cannot be cleared by a delete
          request on its own: {stuck.map((s) => residueFor(s.store).label).join(', ')}.
        </p>
      )}
    </section>
  );
}
