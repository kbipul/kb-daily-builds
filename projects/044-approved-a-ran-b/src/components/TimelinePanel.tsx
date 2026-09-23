import type { Stage } from '../model/run';

export function TimelinePanel({ stages }: { stages: Stage[] }) {
  return (
    <div className="panel">
      <h2>3 · The turn, stage by stage</h2>
      <ol className="timeline">
        {stages.map((s, i) => (
          <li key={i} className={s.name === 'mutate' ? 'mutate' : undefined}>
            <span className="stage-name">{s.name}</span>
            <span>{s.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
