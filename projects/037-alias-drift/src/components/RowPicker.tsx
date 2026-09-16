import { CORPUS } from '../lib/corpus';
import type { IdentifierRow } from '../lib/types';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

const PROVIDER_ORDER = ['OpenAI', 'Anthropic', 'Google Gemini', 'Azure OpenAI', 'DeepSeek'] as const;

export default function RowPicker({ selectedId, onSelect }: Props) {
  const byProvider = new Map<string, IdentifierRow[]>();
  for (const row of CORPUS) {
    const list = byProvider.get(row.provider) ?? [];
    list.push(row);
    byProvider.set(row.provider, list);
  }

  return (
    <div className="picker">
      {PROVIDER_ORDER.map((provider) => (
        <div key={provider} className="picker-group">
          <div className="picker-provider">{provider}</div>
          <div className="picker-buttons">
            {(byProvider.get(provider) ?? []).map((row) => (
              <button
                key={row.id}
                type="button"
                className={
                  'picker-btn' + (row.id === selectedId ? ' picker-btn-active' : '')
                }
                onClick={() => onSelect(row.id)}
              >
                <span className="picker-shape">{row.shape}</span>
                <span className="picker-example">{row.example}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
