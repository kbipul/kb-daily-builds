import { useState } from 'react';
import { SimulationResult } from '../engine/types';

interface Props {
  result: SimulationResult | null;
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'var(--grade-a)';
  if (grade.startsWith('B')) return 'var(--grade-b)';
  if (grade === 'C') return 'var(--grade-c)';
  if (grade === 'D') return 'var(--grade-d)';
  return 'var(--grade-f)';
}

export default function SimulationView({ result }: Props) {
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

  if (!result) {
    return (
      <div className="results-panel">
        <div className="placeholder">
          <p>Configure your containment controls on the left</p>
          <p>and hit <strong>Run Escape Simulation</strong> to see</p>
          <p>how far an AI model could escalate.</p>
        </div>
      </div>
    );
  }

  const toggleLevel = (lvl: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  return (
    <div className="results-panel">
      <div className="grade-display">
        <div className="grade-letter" style={{ color: gradeColor(result.grade) }}>
          {result.grade}
        </div>
        <div className="grade-label">Containment Grade</div>
        <div className="grade-summary">{result.summary}</div>
      </div>

      {result.levels.map(level => {
        const expanded = expandedLevels.has(level.level);
        const statusClass = level.breached ? 'breached' : 'held';

        return (
          <div key={level.level} className="level-row">
            <div className="level-header" onClick={() => level.probes.length > 0 && toggleLevel(level.level)}>
              <div className={`level-num ${statusClass}`}>{level.level}</div>
              <div className="level-name">{level.name}</div>
              <span className={`level-badge ${statusClass}`}>
                {level.breached ? 'BREACHED' : level.probes.length === 0 ? 'BASELINE' : 'HELD'}
              </span>
              {level.probes.length > 0 && (
                <span className={`chevron${expanded ? ' open' : ''}`}>▶</span>
              )}
            </div>

            {expanded && (
              <div className="level-details">
                <p className="level-desc">{level.description}</p>
                {level.probes.map(pr => (
                  <div key={pr.probe.id} className="probe-item">
                    <div className="probe-name">
                      <span className="probe-icon">{pr.breached ? '🔓' : '🛡️'}</span>
                      {pr.probe.name}
                    </div>
                    <p className="probe-desc">{pr.probe.description}</p>
                    <p className={`probe-consequence ${pr.breached ? 'breached' : 'held'}`}>
                      {pr.breached
                        ? `⚠ ${pr.probe.consequence}`
                        : `✓ Blocked by: ${pr.holdingControls.join(', ')}`}
                    </p>
                    {pr.breached && pr.weakControls.length > 0 && (
                      <p className="probe-controls">
                        Exploited weak controls: <strong>{pr.weakControls.join(', ')}</strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
