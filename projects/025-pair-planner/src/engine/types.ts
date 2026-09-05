/**
 * Domain types for the PAIR fleet simulator.
 *
 * The vocabulary follows NVIDIA's own description of the Personal AI Router
 * (beta, 3 Sep 2026): a scheduler that filters paired systems on readiness,
 * supported engine state, requested-model presence and job load, then hands
 * an eligible node's local inference engine (Ollama / LM Studio) one request.
 *
 * Modelling choice: a machine serves ONE request at a time here. Real engines
 * batch concurrent requests and would compress the busiest lane, so cluster
 * wall-clocks in this simulator are conservative for heavily loaded nodes. I
 * left batching out rather than invent a gain curve I cannot source.
 * PAIR routes INDEPENDENT requests. It does not shard a single model across
 * machines, which is the constraint most people assume away.
 */

/** Why a machine is or is not available to the router right now. */
export type NodeState =
  /** Idle and paired - the router may send it work. */
  | 'ready'
  /** Powered on but the human is using it (a game, a render, a call). */
  | 'in-use'
  /** Lid closed / suspended. Reachable in principle, not in practice. */
  | 'asleep'
  /** Powered off or off the network. */
  | 'offline';

/** The local inference engine PAIR proxies on that machine. */
export type Engine = 'ollama' | 'lm-studio' | 'none';

export interface FleetNode {
  id: string;
  /** Human label, e.g. "Studio desktop". */
  name: string;
  /** Key into ACCELERATORS. */
  accelerator: string;
  /** Usable VRAM (or unified memory budget) in GB. */
  vramGB: number;
  engine: Engine;
  /** Model ids actually pulled onto this machine. Presence is a hard gate. */
  modelsPresent: string[];
  state: NodeState;
  /** True for the machine the agent runs on - the solo baseline uses it. */
  isHost?: boolean;
}

export interface ModelSpec {
  id: string;
  label: string;
  /** Working-set memory needed to serve it, in GB. Hard eligibility gate. */
  vramGB: number;
  /** Decode tokens/sec on the reference accelerator (perfIndex 1.00). */
  decodeTps: number;
  /** Prefill tokens/sec on the reference accelerator. */
  prefillTps: number;
}

export interface Accelerator {
  id: string;
  label: string;
  /** Throughput relative to the reference part. See hardware.ts for sourcing. */
  perfIndex: number;
  /** Typical usable memory, offered as a default when adding a node. */
  typicalVramGB: number;
}

/**
 * One inference request the lead agent wants served.
 *
 * `phase` models dependency: every job in phase N must finish before phase
 * N+1 starts. Jobs inside a phase are independent, which is exactly the shape
 * PAIR is built for - and the reason a serial-heavy workload cannot be fixed
 * by adding machines.
 */
export interface Job {
  id: string;
  label: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  phase: number;
}

export interface Workload {
  id: string;
  label: string;
  jobs: Job[];
}

/** One scheduled job placement, ready to draw as a Gantt bar. */
export interface Assignment {
  jobId: string;
  jobLabel: string;
  nodeId: string;
  phase: number;
  startSec: number;
  endSec: number;
}

/** A job the router could not place on any machine, and why. */
export interface UnplacedJob {
  jobId: string;
  jobLabel: string;
  reason: string;
}

export interface ScheduleResult {
  assignments: Assignment[];
  unplaced: UnplacedJob[];
  /** Wall clock for the whole workload, seconds. */
  makespanSec: number;
  /** Busy seconds per node id - zero means the machine sat the run out. */
  busyByNode: Record<string, number>;
  /** Node ids that were never given a single job. */
  idleNodeIds: string[];
}

/** Per-node explanation of eligibility for one specific job. */
export interface EligibilityCheck {
  nodeId: string;
  eligible: boolean;
  /** Empty when eligible. */
  blockers: string[];
}

/** A single concrete change, priced in seconds saved. */
export interface Finding {
  nodeId: string;
  nodeName: string;
  /** Short imperative, e.g. "Pull qwen3-14b onto Studio desktop". */
  action: string;
  /** Which eligibility gate this clears. */
  gate: 'model-presence' | 'availability' | 'engine' | 'memory';
  /** Makespan with this one fix applied, seconds. */
  fixedMakespanSec: number;
  /** Seconds removed from the run by this fix alone. */
  savedSec: number;
  /** Explanatory sentence for the UI. */
  detail: string;
}

export interface PlanResult {
  cluster: ScheduleResult;
  /** Everything on the host machine, one job at a time. */
  solo: ScheduleResult;
  /**
   * Every node made ready with every model present - the best PAIR could
   * ever do with this hardware. The gap to `cluster` is eligibility loss,
   * not a hardware limit.
   */
  ceiling: ScheduleResult;
  /**
   * solo -> cluster. Only meaningful when `soloFeasible` is true: if the host
   * cannot serve every job, the two schedules are not doing the same work and
   * dividing one wall-clock by the other compares a run against a shorter run
   * that skipped the hard part.
   */
  speedup: number;
  ceilingSpeedup: number;
  /** cluster -> ceiling. Always meaningful; both run the same job set. */
  headroom: number;
  /**
   * False when the machine you sit at cannot serve some job at all. Then PAIR
   * is not an accelerator, it is the only reason the workload runs.
   */
  soloFeasible: boolean;
  findings: Finding[];
}
