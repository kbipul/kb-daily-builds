import type { Finding, FleetNode, Job, PlanResult } from './types';
import { getModel } from './hardware';
import { checkEligibility, idealFleet, schedule, scheduleSolo } from './schedule';

/**
 * Everything a single machine needs before the router will talk to it: awake,
 * an engine running, and the workload's models pulled - but only the ones that
 * physically fit, because pulling a 42 GB model onto a 12 GB card does not make
 * it servable.
 */
export function enableNode(node: FleetNode, jobs: Job[]): FleetNode {
  const needed = [...new Set(jobs.map((j) => j.model))];
  return {
    ...node,
    state: 'ready',
    engine: node.engine === 'none' ? 'ollama' : node.engine,
    modelsPresent: [
      ...new Set([
        ...node.modelsPresent,
        ...needed.filter((m) => (getModel(m)?.vramGB ?? Infinity) <= node.vramGB),
      ]),
    ],
  };
}

/**
 * Human-readable list of what bringing this machine in would take. The first
 * step names the machine and later steps say "it", so the sentence reads the
 * way a person would say it out loud.
 */
function fixSteps(node: FleetNode, jobs: Job[]): { steps: string[]; gate: Finding['gate'] } {
  const steps: string[] = [];
  let gate: Finding['gate'] = 'model-presence';

  if (node.state !== 'ready') {
    steps.push(
      node.state === 'offline'
        ? `Power on ${node.name}`
        : node.state === 'asleep'
          ? `Wake ${node.name}`
          : `Free up ${node.name}`,
    );
    gate = 'availability';
  }
  if (node.engine === 'none') {
    steps.push(steps.length === 0 ? `Install Ollama on ${node.name}` : 'install Ollama on it');
    if (steps.length === 1) gate = 'engine';
  }

  const needed = [...new Set(jobs.map((j) => j.model))];
  const missing = needed.filter(
    (m) => !node.modelsPresent.includes(m) && (getModel(m)?.vramGB ?? Infinity) <= node.vramGB,
  );
  if (missing.length > 0) {
    const names = missing.map((m) => getModel(m)?.label.replace(' (Q4)', '') ?? m);
    const list =
      names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    steps.push(steps.length === 0 ? `Pull ${list} onto ${node.name}` : `pull ${list} onto it`);
    if (steps.length === 1) gate = 'model-presence';
  }

  const tooBig = needed.filter((m) => (getModel(m)?.vramGB ?? Infinity) > node.vramGB);
  if (tooBig.length > 0 && steps.length === 0) gate = 'memory';

  return { steps, gate };
}

/**
 * Price each machine's absence in seconds.
 *
 * The method is a counterfactual re-simulation rather than a rule of thumb:
 * bring exactly one machine into the pool, leave every other machine exactly
 * as it is, re-run the scheduler, and report the change in wall clock. That
 * makes the number attributable - "waking the studio desktop is worth 3m 12s"
 * is a claim about this workload on this fleet, not a heuristic.
 *
 * The honest weakness: these fixes are NOT additive. Two machines each worth
 * 40 seconds alone are frequently worth 45 together, because after the first
 * one joins there is less work left to steal. The UI says so, and the ceiling
 * schedule is there to give the true combined figure.
 */
export function computeFindings(
  nodes: FleetNode[],
  jobs: Job[],
  baselineMakespan: number,
): Finding[] {
  const findings: Finding[] = [];
  const base = schedule(nodes, jobs);

  for (const node of nodes) {
    const contributed = (base.busyByNode[node.id] ?? 0) > 0;
    const { steps, gate } = fixSteps(node, jobs);

    if (contributed && steps.length === 0) continue;

    if (steps.length === 0) {
      // Already eligible for everything it can run, and the scheduler still
      // had nothing for it. More machines is not the answer here.
      const anyEligible = jobs.some((j) => checkEligibility(node, j).eligible);
      findings.push({
        nodeId: node.id,
        nodeName: node.name,
        action: anyEligible ? 'Nothing to fix' : 'Cannot help this workload',
        gate: anyEligible ? 'model-presence' : 'memory',
        fixedMakespanSec: baselineMakespan,
        savedSec: 0,
        detail: anyEligible
          ? 'Ready, engine running, models pulled - the scheduler simply ran out of work to give it. Adding machines will not shorten this run.'
          : `Every model in this workload needs more memory than its ${node.vramGB} GB. No amount of configuration changes that.`,
      });
      continue;
    }

    const patched = nodes.map((n) => (n.id === node.id ? enableNode(n, jobs) : n));
    const after = schedule(patched, jobs);
    const saved = baselineMakespan - after.makespanSec;

    const action = steps.join(', then ');

    findings.push({
      nodeId: node.id,
      nodeName: node.name,
      action,
      gate,
      fixedMakespanSec: after.makespanSec,
      savedSec: Math.max(0, saved),
      detail:
        saved > 0.5
          ? `Bringing ${node.name} into the pool takes this run to ${Math.round(after.makespanSec)}s on its own.`
          : `${node.name} becomes eligible, but the scheduler still has nothing spare to give it on this workload.`,
    });
  }

  return findings.sort((a, b) => b.savedSec - a.savedSec);
}

export function plan(nodes: FleetNode[], jobs: Job[]): PlanResult {
  const cluster = schedule(nodes, jobs);
  const solo = scheduleSolo(nodes, jobs);
  const ceiling = schedule(idealFleet(nodes, jobs), jobs);

  // A solo run that could not place every job did less work, so its wall clock
  // is not a baseline. Say so instead of printing a ratio that flatters or
  // slanders the cluster depending on which job got dropped.
  const soloFeasible = solo.unplaced.length === 0;
  const speedup = soloFeasible && cluster.makespanSec > 0 ? solo.makespanSec / cluster.makespanSec : 0;
  const ceilingSpeedup =
    soloFeasible && ceiling.makespanSec > 0 ? solo.makespanSec / ceiling.makespanSec : 0;
  const headroom = ceiling.makespanSec > 0 ? cluster.makespanSec / ceiling.makespanSec : 1;

  return {
    cluster,
    solo,
    ceiling,
    speedup,
    ceilingSpeedup,
    headroom,
    soloFeasible,
    findings: computeFindings(nodes, jobs, cluster.makespanSec),
  };
}
