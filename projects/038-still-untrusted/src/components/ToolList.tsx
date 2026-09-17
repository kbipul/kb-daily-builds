import type { ToolSpec } from '../fides/engine';

export function ToolList({ tools }: { tools: ToolSpec[] }) {
  return (
    <div className="tool-list">
      {tools.map((t) => (
        <div className="tool-card" key={t.name}>
          <div className="tool-head">
            <span className={`tool-kind tool-kind-${t.kind}`}>{t.kind}</span>
            <code>{t.name}</code>
          </div>
          <p>{t.description}</p>
          <div className="tool-policy">
            {t.acceptsUntrusted === false && <span className="badge badge-danger">accepts_untrusted: false</span>}
            {t.maxAllowedConfidentiality && (
              <span className="badge badge-warn">max_allowed_confidentiality: {t.maxAllowedConfidentiality}</span>
            )}
            {t.kind === 'sink' && t.acceptsUntrusted !== false && !t.maxAllowedConfidentiality && (
              <span className="badge badge-muted">no declared cap</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
