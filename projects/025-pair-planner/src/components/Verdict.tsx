import type { PlanResult } from '../engine/types';
import { formatDuration } from '../engine/hardware';

interface Props {
  plan: PlanResult;
  nodeCount: number;
}

/** The ten-second answer: how many machines the router can actually use. */
export function Verdict({ plan, nodeCount }: Props) {
  const used = nodeCount - plan.cluster.idleNodeIds.length;
  const lost = plan.cluster.makespanSec - plan.ceiling.makespanSec;

  return (
    <section className="verdict">
      <div className="headline">
        <span className="headline-big">
          {used} of {nodeCount}
        </span>
        <span className="headline-sub">
          machine{nodeCount === 1 ? '' : 's'} the router could use on this run
        </span>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">One machine</span>
          <span className="stat-value">
            {plan.soloFeasible ? formatDuration(plan.solo.makespanSec) : 'impossible'}
          </span>
          <span className="stat-note">
            {plan.soloFeasible
              ? 'everything on the host, in order'
              : `the host cannot serve ${plan.solo.unplaced.length} of these jobs`}
          </span>
        </div>
        <div className="stat stat-primary">
          <span className="stat-label">Your fleet, as it is</span>
          <span className="stat-value">{formatDuration(plan.cluster.makespanSec)}</span>
          <span className="stat-note">
            {plan.soloFeasible
              ? `${plan.speedup.toFixed(2)}x faster than one machine`
              : 'PAIR is not speeding this up — it is the only way it runs'}
          </span>
        </div>
        <div className="stat stat-ceiling">
          <span className="stat-label">Every machine eligible</span>
          <span className="stat-value">{formatDuration(plan.ceiling.makespanSec)}</span>
          <span className="stat-note">
            {lost > 1
              ? `${formatDuration(lost)} is going to eligibility, not to hardware`
              : 'already there — this fleet has nothing left to unlock'}
          </span>
        </div>
      </div>

      {plan.cluster.unplaced.length > 0 ? (
        <p className="warn">
          <strong>{plan.cluster.unplaced.length} job{plan.cluster.unplaced.length > 1 ? 's have' : ' has'} nowhere to run.</strong>{' '}
          {plan.cluster.unplaced.map((u) => `${u.jobLabel} (${u.reason})`).join('; ')}. PAIR routes whole
          requests to one machine at a time — it does not split a model across two of them, so a model
          that fits nowhere stays unservable.
        </p>
      ) : null}
    </section>
  );
}
