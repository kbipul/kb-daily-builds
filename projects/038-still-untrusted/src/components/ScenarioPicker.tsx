import type { Scenario } from '../fides/scenarios';

export function ScenarioPicker({
  scenarios,
  activeId,
  onPick,
}: {
  scenarios: Scenario[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="picker-buttons">
      {scenarios.map((s) => (
        <button
          key={s.id}
          className={`picker-btn ${s.id === activeId ? 'picker-btn-active' : ''}`}
          onClick={() => onPick(s.id)}
        >
          <span className="picker-shape">{s.title}</span>
          <span className="picker-example">{s.summary}</span>
        </button>
      ))}
    </div>
  );
}
