import { useMemo, useState } from 'react';
import { BINDING_KINDS, CORPUS } from '../lib/corpus';
import type { IdentifierRow } from '../lib/types';

type SortKey = 'risk' | 'provider';

export default function ComparisonTable({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('risk');

  const rows = useMemo(() => {
    const copy = [...CORPUS];
    if (sortKey === 'risk') {
      copy.sort((a, b) => BINDING_KINDS[b.bindingKind].risk - BINDING_KINDS[a.bindingKind].risk);
    } else {
      copy.sort((a, b) => a.provider.localeCompare(b.provider));
    }
    return copy;
  }, [sortKey]);

  return (
    <div className="panel">
      <div className="table-head">
        <h2 className="drift-title">All {CORPUS.length} identifiers</h2>
        <div className="sort-buttons">
          <button
            type="button"
            className={'sort-btn' + (sortKey === 'risk' ? ' sort-btn-active' : '')}
            onClick={() => setSortKey('risk')}
          >
            Sort by risk
          </button>
          <button
            type="button"
            className={'sort-btn' + (sortKey === 'provider' ? ' sort-btn-active' : '')}
            onClick={() => setSortKey('provider')}
          >
            Sort by provider
          </button>
        </div>
      </div>
      <table className="drift-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Identifier shape</th>
            <th>Classification</th>
            <th>Notice</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: IdentifierRow) => {
            const kind = BINDING_KINDS[row.bindingKind];
            return (
              <tr
                key={row.id}
                className={row.id === selectedId ? 'row-active' : ''}
                onClick={() => onSelect(row.id)}
              >
                <td>{row.provider}</td>
                <td>
                  {row.shape}
                  <div className="table-example">{row.example}</div>
                </td>
                <td>
                  <span className={`risk-dot risk-${kind.risk}`} /> {kind.label}
                </td>
                <td className="muted-cell">{row.notice}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
