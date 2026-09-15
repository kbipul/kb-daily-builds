import { EVIDENCE_SOURCES } from '../engine/evidence';
import { marginalGain } from '../engine/triage';
import type { EvidenceSourceId, ScopeId } from '../engine/types';

interface Props {
  held: Set<EvidenceSourceId>;
  scope: ScopeId;
  onToggle: (id: EvidenceSourceId) => void;
}

export function EvidencePanel({ held, scope, onToggle }: Props) {
  return (
    <div className="evidence-grid" data-testid="evidence-grid">
      {EVIDENCE_SOURCES.map((s) => {
        const on = held.has(s.id);
        const blocked = Boolean(s.requires && !held.has(s.requires));
        const gain = on ? 0 : marginalGain(held, s.id, scope);
        return (
          <button
            key={s.id}
            type="button"
            className={`evidence ${on ? 'on' : ''} ${blocked ? 'blocked' : ''}`}
            aria-pressed={on}
            data-testid={`evidence-${s.id}`}
            onClick={() => onToggle(s.id)}
          >
            <span className="evidence-head">
              <span className="evidence-label">{s.label}</span>
              {on ? (
                <span className="pill pill-on">held</span>
              ) : (
                <span className={`pill ${gain > 0 ? 'pill-gain' : 'pill-zero'}`}>
                  {gain > 0 ? `+${gain}` : '+0'}
                </span>
              )}
            </span>
            <span className="evidence-held">{s.held}</span>
            {s.note && <span className="evidence-note">{s.note}</span>}
            {blocked && on && (
              <span className="evidence-blocked">
                Grants nothing until you also hold {s.requires}.
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
