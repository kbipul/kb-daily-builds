import type {
  Assignment,
  EligibilityCheck,
  FleetNode,
  Job,
  ScheduleResult,
  UnplacedJob,
} from './types';
import { getAccelerator, getModel, jobDurationSec, modelLoadSec } from './hardware';

const STATE_BLOCKER: Record<string, string> = {
  'in-use': 'in use by a human',
  asleep: 'asleep',
  offline: 'powered off',
};

/**
 * The eligibility filter, in the order NVIDIA describes it: readiness,
 * supported engine state, requested-model presence, then job load. Memory is
 * added because a machine that has pulled a model it cannot fit will fail the
 * request rather than serve it slowly.
 *
 * Every blocker is collected rather than short-circuiting, because the useful
 * output is not "ineligible" but "ineligible for these two reasons, one of
 * which you can fix in thirty seconds".
 */
export function checkEligibility(node: FleetNode, job: Job): EligibilityCheck {
  const blockers: string[] = [];
  const model = getModel(job.model);

  if (node.state !== 'ready') {
    blockers.push(STATE_BLOCKER[node.state] ?? node.state);
  }
  if (node.engine === 'none') {
    blockers.push('no inference engine installed');
  }
  if (!node.modelsPresent.includes(job.model)) {
    blockers.push(`${model?.label ?? job.model} not pulled`);
  }
  if (model && node.vramGB < model.vramGB) {
    blockers.push(
      `needs ${model.vramGB} GB, has ${node.vramGB} GB`,
    );
  }

  return { nodeId: node.id, eligible: blockers.length === 0, blockers };
}

/**
 * Serve time on one machine, plus the weights-into-VRAM cost when this machine
 * was not already holding that model. `resident` is the model the node served
 * last; undefined means a cold node.
 */
function durationOn(node: FleetNode, job: Job, resident?: string): number {
  const model = getModel(job.model);
  const accel = getAccelerator(node.accelerator);
  if (!model || !accel) return Infinity;
  const compute = jobDurationSec(job.promptTokens, job.outputTokens, model, accel.perfIndex);
  const load = resident === job.model ? 0 : modelLoadSec(model);
  return compute + load;
}

/** Duration of a job on the fastest machine that could actually take it. */
function bestCaseDuration(nodes: FleetNode[], job: Job): number {
  let best = Infinity;
  for (const n of nodes) {
    if (!checkEligibility(n, job).eligible) continue;
    best = Math.min(best, durationOn(n, job));
  }
  return best;
}

export { durationOn };

/** The blocker that stopped the most machines, for the unplaced-job message. */
function dominantBlocker(nodes: FleetNode[], job: Job): string {
  const tally = new Map<string, number>();
  for (const n of nodes) {
    for (const b of checkEligibility(n, job).blockers) {
      tally.set(b, (tally.get(b) ?? 0) + 1);
    }
  }
  let top = 'no eligible machine';
  let topCount = 0;
  for (const [b, c] of tally) {
    if (c > topCount) {
      top = b;
      topCount = c;
    }
  }
  return top;
}

/**
 * Greedy list scheduler, longest-job-first, over the eligible machines.
 *
 * Jobs are grouped into phases: everything in phase N must land before phase
 * N+1 opens, which is how a lead agent's fan-out/gather actually behaves. Only
 * jobs inside a phase compete for machines.
 *
 * Longest-processing-time-first is a heuristic, not an optimiser. On identical
 * machines LPT is within 4/3 of optimal; these machines are not identical, so
 * the guarantee does not carry over and the schedule is merely good. That is
 * an acceptable trade here because the headline output is a comparison between
 * two schedules built by the same rule, and a shared bias cancels.
 */
export function schedule(nodes: FleetNode[], jobs: Job[]): ScheduleResult {
  const assignments: Assignment[] = [];
  const unplaced: UnplacedJob[] = [];
  const freeAt = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  // Which model each machine currently has in VRAM. A switch costs a reload.
  const resident = new Map<string, string | undefined>(nodes.map((n) => [n.id, undefined]));
  const busy: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, 0]));

  const phases = [...new Set(jobs.map((j) => j.phase))].sort((a, b) => a - b);
  let phaseStart = 0;

  for (const phase of phases) {
    const phaseJobs = jobs
      .filter((j) => j.phase === phase)
      .sort((a, b) => bestCaseDuration(nodes, b) - bestCaseDuration(nodes, a));

    // Machines carry no work across a phase boundary: the gather step is a
    // barrier, so every lane restarts at the phase's start time.
    for (const n of nodes) freeAt.set(n.id, phaseStart);

    let phaseEnd = phaseStart;

    for (const job of phaseJobs) {
      const eligible = nodes.filter((n) => checkEligibility(n, job).eligible);
      if (eligible.length === 0) {
        unplaced.push({
          jobId: job.id,
          jobLabel: job.label,
          reason: dominantBlocker(nodes, job),
        });
        continue;
      }

      let chosen = eligible[0];
      let chosenEnd = Infinity;
      for (const n of eligible) {
        const end = (freeAt.get(n.id) ?? phaseStart) + durationOn(n, job, resident.get(n.id));
        // Earliest finish wins; a tie goes to the machine that is free sooner,
        // which keeps the fast card available for the next long job.
        if (end < chosenEnd - 1e-9) {
          chosen = n;
          chosenEnd = end;
        }
      }

      const start = freeAt.get(chosen.id) ?? phaseStart;
      const end = start + durationOn(chosen, job, resident.get(chosen.id));
      resident.set(chosen.id, job.model);
      assignments.push({
        jobId: job.id,
        jobLabel: job.label,
        nodeId: chosen.id,
        phase,
        startSec: start,
        endSec: end,
      });
      freeAt.set(chosen.id, end);
      busy[chosen.id] += end - start;
      phaseEnd = Math.max(phaseEnd, end);
    }

    phaseStart = phaseEnd;
  }

  const makespanSec = assignments.reduce((m, a) => Math.max(m, a.endSec), 0);
  const idleNodeIds = nodes.filter((n) => (busy[n.id] ?? 0) === 0).map((n) => n.id);

  return { assignments, unplaced, makespanSec, busyByNode: busy, idleNodeIds };
}

/**
 * The before picture: every job on the machine the agent runs on, one after
 * another. The host's own state is ignored (you are sitting at it), but model
 * presence and memory still apply - a workload the host cannot serve at all
 * is the case where PAIR is not a speedup but the only way to run it.
 */
export function scheduleSolo(nodes: FleetNode[], jobs: Job[]): ScheduleResult {
  const host = nodes.find((n) => n.isHost) ?? nodes[0];
  if (!host) {
    return {
      assignments: [],
      unplaced: jobs.map((j) => ({ jobId: j.id, jobLabel: j.label, reason: 'no host machine' })),
      makespanSec: 0,
      busyByNode: {},
      idleNodeIds: [],
    };
  }
  const awakeHost: FleetNode = { ...host, state: 'ready' };
  const ordered = [...jobs].sort((a, b) => a.phase - b.phase);
  return schedule([awakeHost], ordered.map((j, i) => ({ ...j, phase: i })));
}

/**
 * The best this hardware could ever do: every machine awake, an engine on all
 * of them, every model pulled everywhere it fits. Memory still bites, because
 * that is physics rather than configuration.
 *
 * The distance between this and the real schedule is the number the tool
 * exists to show - time lost to eligibility, not to silicon.
 */
export function idealFleet(nodes: FleetNode[], jobs: Job[]): FleetNode[] {
  const needed = [...new Set(jobs.map((j) => j.model))];
  return nodes.map((n) => ({
    ...n,
    state: 'ready',
    engine: n.engine === 'none' ? 'ollama' : n.engine,
    modelsPresent: [
      ...new Set([
        ...n.modelsPresent,
        ...needed.filter((m) => (getModel(m)?.vramGB ?? Infinity) <= n.vramGB),
      ]),
    ],
  }));
}
