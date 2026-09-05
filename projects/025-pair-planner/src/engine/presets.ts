import type { FleetNode, Job, Workload } from './types';

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  nodes: FleetNode[];
  workload: Workload;
}

/**
 * Calibration preset - the one public data point I could check the model
 * against.
 *
 * NVIDIA's IFA 2026 demonstration ran five subagents through Hermes Desktop and
 * Ollama and reported 8m 48s on a three-device PAIR cluster against 18m 00s on
 * a single machine. Only those two wall-clocks were published, not the token
 * counts, the models, or the machines. So the job sizes below are inferred:
 * they are chosen so the SOLO run lands on the published 18 minutes, and the
 * cluster figure is then whatever this simulator predicts. The gap between that
 * prediction and NVIDIA's measured 8m 48s is reported in the README rather than
 * tuned away, because it is the most useful thing this preset produces.
 *
 * The three-phase shape - lead agent plans, subagents fan out, lead agent
 * merges - is not in NVIDIA's write-up either. It is there because a fan-out
 * with no serial head or tail can beat any measured speedup you like, and
 * pretending otherwise is how these tools end up lying.
 */
const nvidiaDemo: Preset = {
  id: 'nvidia-demo',
  label: "NVIDIA's IFA demo",
  blurb:
    'Five subagents over three devices. Sized so the single-machine run matches the 18 minutes NVIDIA published, then compared against their measured 8m 48s cluster time.',
  nodes: [
    {
      id: 'spark',
      name: 'DGX Spark',
      accelerator: 'dgx-spark',
      vramGB: 110,
      engine: 'ollama',
      modelsPresent: ['qwen3-14b'],
      state: 'ready',
      isHost: true,
    },
    {
      id: 'desktop',
      name: 'Workstation',
      accelerator: 'rtx-4090',
      vramGB: 24,
      engine: 'ollama',
      modelsPresent: ['qwen3-14b'],
      state: 'ready',
    },
    {
      id: 'laptop',
      name: 'MacBook Pro',
      accelerator: 'm4-pro',
      vramGB: 36,
      engine: 'lm-studio',
      modelsPresent: ['qwen3-14b'],
      state: 'ready',
    },
  ],
  workload: {
    id: 'five-subagents',
    label: 'Lead agent + 5 subagents + merge',
    jobs: [
      { id: 'lead-plan', label: 'Lead agent: split the task', model: 'qwen3-14b', promptTokens: 8000, outputTokens: 1500, phase: 0 },
      { id: 's1', label: 'Subagent: map the repository', model: 'qwen3-14b', promptTokens: 42000, outputTokens: 2900, phase: 1 },
      { id: 's2', label: 'Subagent: summarise open issues', model: 'qwen3-14b', promptTokens: 28000, outputTokens: 4800, phase: 1 },
      { id: 's3', label: 'Subagent: draft the migration plan', model: 'qwen3-14b', promptTokens: 18000, outputTokens: 8200, phase: 1 },
      { id: 's4', label: 'Subagent: review test coverage', model: 'qwen3-14b', promptTokens: 33000, outputTokens: 5600, phase: 1 },
      { id: 's5', label: 'Subagent: check dependency licences', model: 'qwen3-14b', promptTokens: 24000, outputTokens: 4000, phase: 1 },
      { id: 'lead-merge', label: 'Lead agent: merge the findings', model: 'qwen3-14b', promptTokens: 20000, outputTokens: 2500, phase: 2 },
    ],
  },
};

/**
 * The case almost everybody is actually in: four capable machines in the house
 * and exactly one of them eligible. Nothing here is broken. Every machine is
 * unavailable for an ordinary, correct reason.
 */
const homeOffice: Preset = {
  id: 'home-office',
  label: 'Four machines, one eligible',
  blurb:
    'A gaming PC being gamed on, a desktop that never pulled the model, a mini PC with no engine, and the laptop doing all the work.',
  nodes: [
    {
      id: 'mbp',
      name: 'MacBook Pro (yours)',
      accelerator: 'm4-pro',
      vramGB: 36,
      engine: 'lm-studio',
      modelsPresent: ['llama-3.1-8b', 'qwen3-14b'],
      state: 'ready',
      isHost: true,
    },
    {
      id: 'gaming',
      name: 'Gaming PC',
      accelerator: 'rtx-4090',
      vramGB: 24,
      engine: 'ollama',
      modelsPresent: ['llama-3.1-8b', 'qwen3-14b'],
      state: 'in-use',
    },
    {
      id: 'study',
      name: 'Study desktop',
      accelerator: 'rtx-4070',
      vramGB: 12,
      engine: 'ollama',
      modelsPresent: ['phi-4-mini'],
      state: 'ready',
    },
    {
      id: 'mini',
      name: 'Living-room mini PC',
      accelerator: 'rtx-3060',
      vramGB: 12,
      engine: 'none',
      modelsPresent: [],
      state: 'ready',
    },
  ],
  workload: {
    id: 'inbox-triage',
    label: 'Overnight inbox and document triage',
    jobs: [
      { id: 'p', label: 'Plan the batch', model: 'llama-3.1-8b', promptTokens: 4000, outputTokens: 900, phase: 0 },
      { id: 'a', label: 'Classify 200 emails', model: 'llama-3.1-8b', promptTokens: 60000, outputTokens: 6000, phase: 1 },
      { id: 'b', label: 'Summarise 40 PDFs', model: 'qwen3-14b', promptTokens: 90000, outputTokens: 9000, phase: 1 },
      { id: 'c', label: 'Extract action items', model: 'llama-3.1-8b', promptTokens: 45000, outputTokens: 5200, phase: 1 },
      { id: 'd', label: 'Draft replies', model: 'qwen3-14b', promptTokens: 30000, outputTokens: 11000, phase: 1 },
      { id: 'e', label: 'Write the digest', model: 'qwen3-14b', promptTokens: 25000, outputTokens: 3000, phase: 2 },
    ],
  },
};

/**
 * The IT-director framing: a floor of workstations that are doing nothing
 * between 19:00 and 08:00, and a power policy that is quietly the reason your
 * overnight batch takes all night. The DGX Spark is the only machine in the
 * building with the memory to hold the 70B, and it is also one of the slowest -
 * which is the whole problem with sizing a fleet by GPU count.
 */
const studioOvernight: Preset = {
  id: 'studio-overnight',
  label: 'Office fleet, after hours',
  blurb:
    'Seven machines idle overnight. Sleep policy has three of them, two never had an engine installed, and only one box can hold the 70B.',
  nodes: [
    {
      id: 'ws-lead',
      name: 'Build server',
      accelerator: 'rtx-4080',
      vramGB: 16,
      engine: 'ollama',
      modelsPresent: ['llama-3.1-8b', 'qwen3-14b', 'gpt-oss-20b'],
      state: 'ready',
      isHost: true,
    },
    {
      id: 'spark',
      name: 'DGX Spark',
      accelerator: 'dgx-spark',
      vramGB: 110,
      engine: 'ollama',
      modelsPresent: ['llama-3.3-70b'],
      state: 'ready',
    },
    { id: 'ws1', name: 'Design workstation 1', accelerator: 'rtx-4090', vramGB: 24, engine: 'ollama', modelsPresent: ['llama-3.1-8b'], state: 'asleep' },
    { id: 'ws2', name: 'Design workstation 2', accelerator: 'rtx-4090', vramGB: 24, engine: 'ollama', modelsPresent: ['llama-3.1-8b'], state: 'asleep' },
    { id: 'ws3', name: 'Editing workstation', accelerator: 'rtx-5080', vramGB: 16, engine: 'none', modelsPresent: [], state: 'ready' },
    { id: 'ws4', name: 'QA desktop', accelerator: 'rtx-3080', vramGB: 10, engine: 'none', modelsPresent: [], state: 'ready' },
    { id: 'ws5', name: 'Reception PC', accelerator: 'rtx-2080', vramGB: 8, engine: 'ollama', modelsPresent: ['phi-4-mini'], state: 'asleep' },
  ],
  workload: {
    id: 'nightly-corpus',
    label: 'Nightly document corpus run',
    jobs: [
      { id: 'plan', label: 'Plan the corpus run', model: 'llama-3.1-8b', promptTokens: 5000, outputTokens: 1200, phase: 0 },
      { id: 'x1', label: 'Chunk + embed shard 1', model: 'llama-3.1-8b', promptTokens: 120000, outputTokens: 4000, phase: 1 },
      { id: 'x2', label: 'Chunk + embed shard 2', model: 'llama-3.1-8b', promptTokens: 120000, outputTokens: 4000, phase: 1 },
      { id: 'x3', label: 'Chunk + embed shard 3', model: 'llama-3.1-8b', promptTokens: 120000, outputTokens: 4000, phase: 1 },
      { id: 'x4', label: 'Chunk + embed shard 4', model: 'llama-3.1-8b', promptTokens: 120000, outputTokens: 4000, phase: 1 },
      { id: 'q1', label: 'Contract review pass', model: 'gpt-oss-20b', promptTokens: 80000, outputTokens: 7000, phase: 1 },
      { id: 'q2', label: 'Policy conflict check (70B)', model: 'llama-3.3-70b', promptTokens: 20000, outputTokens: 1200, phase: 1 },
      { id: 'roll', label: 'Roll up the night report', model: 'qwen3-14b', promptTokens: 30000, outputTokens: 3500, phase: 2 },
    ],
  },
};

export const PRESETS: Preset[] = [nvidiaDemo, homeOffice, studioOvernight];

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export type { Job, FleetNode, Workload };
