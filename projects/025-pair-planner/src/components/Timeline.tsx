import type { FleetNode, ScheduleResult } from '../engine/types';
import { checkEligibility } from '../engine/schedule';
import { formatDuration } from '../engine/hardware';
import type { Job } from '../engine/types';

const PHASE_CLASS = ['ph0', 'ph1', 'ph2', 'ph3', 'ph4'];

interface Props {
  nodes: FleetNode[];
  jobs: Job[];
  result: ScheduleResult;
}

/**
 * One lane per machine. An empty lane is the point of the whole tool, so it
 * carries the reason rather than just being blank.
 */
export function Timeline({ nodes, jobs, result }: Props) {
  const span = Math.max(result.makespanSec, 1);

  return (
    <div className="timeline">
      {nodes.map((node) => {
        const bars = result.assignments.filter((a) => a.nodeId === node.id);
        const blockers = new Set<string>();
        for (const j of jobs) {
          for (const b of checkEligibility(node, j).blockers) blockers.add(b);
        }
        const busy = result.busyByNode[node.id] ?? 0;
        const util = Math.round((busy / span) * 100);

        return (
          <div className="lane" key={node.id}>
            <div className="lane-label">
              <span className="lane-name">
                {node.name}
                {node.isHost ? <span className="host-tag">host</span> : null}
              </span>
              <span className="lane-meta">
                {bars.length > 0 ? `${util}% busy · ${bars.length} job${bars.length > 1 ? 's' : ''}` : 'sat this run out'}
              </span>
            </div>
            <div className={`lane-track${bars.length === 0 ? ' lane-track-empty' : ''}`}>
              {bars.map((a) => (
                <div
                  key={a.jobId}
                  className={`bar ${PHASE_CLASS[a.phase % PHASE_CLASS.length]}`}
                  style={{
                    left: `${(a.startSec / span) * 100}%`,
                    width: `${Math.max(((a.endSec - a.startSec) / span) * 100, 0.8)}%`,
                  }}
                  title={`${a.jobLabel} — ${formatDuration(a.endSec - a.startSec)}`}
                >
                  <span className="bar-text">{a.jobLabel}</span>
                </div>
              ))}
              {bars.length === 0 ? (
                <span className="lane-empty-reason">
                  {blockers.size > 0 ? [...blockers].slice(0, 2).join(' · ') : 'eligible, but the scheduler had nothing spare'}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className="axis">
        <span>0s</span>
        <span>{formatDuration(span / 2)}</span>
        <span>{formatDuration(span)}</span>
      </div>
    </div>
  );
}
