import type { Accelerator, ModelSpec } from './types';

/**
 * CALIBRATION CONSTANTS, NOT MEASUREMENTS.
 *
 * Every number below is a rough public-benchmark-order estimate for 4-bit
 * quantized local inference, normalised so an RTX 4090 has perfIndex 1.00.
 * I did not benchmark any of this hardware. Treat individual figures as
 * +/-40%. What the simulator is actually good for is RATIOS and RANKINGS:
 * "which machine sat out, and what would including it be worth" survives a
 * large error in the absolute tokens/sec, because the same error applies to
 * every lane of the schedule.
 *
 * The number to distrust most is DGX Spark. It has an enormous unified memory
 * pool - which is why it can hold a 70B when nothing else can - and modest
 * memory bandwidth, so its perfIndex is low while its VRAM is huge. That
 * combination is deliberate, and it drives one of the more interesting
 * results: the only machine that can run the big model is often the slowest
 * one in the building.
 */
export const PERF_INDEX_ERROR_BAND = 0.4;

export const ACCELERATORS: Accelerator[] = [
  { id: 'rtx-5090', label: 'GeForce RTX 5090', perfIndex: 1.45, typicalVramGB: 32 },
  { id: 'rtx-4090', label: 'GeForce RTX 4090', perfIndex: 1.0, typicalVramGB: 24 },
  { id: 'rtx-5080', label: 'GeForce RTX 5080', perfIndex: 0.92, typicalVramGB: 16 },
  { id: 'rtx-4080', label: 'GeForce RTX 4080', perfIndex: 0.78, typicalVramGB: 16 },
  { id: 'rtx-4070', label: 'GeForce RTX 4070', perfIndex: 0.55, typicalVramGB: 12 },
  { id: 'rtx-3080', label: 'GeForce RTX 3080', perfIndex: 0.52, typicalVramGB: 10 },
  { id: 'rtx-3060', label: 'GeForce RTX 3060 12GB', perfIndex: 0.32, typicalVramGB: 12 },
  { id: 'rtx-2080', label: 'GeForce RTX 2080', perfIndex: 0.24, typicalVramGB: 8 },
  { id: 'dgx-spark', label: 'DGX Spark', perfIndex: 0.6, typicalVramGB: 110 },
  { id: 'm4-max', label: 'Apple M4 Max', perfIndex: 0.5, typicalVramGB: 96 },
  { id: 'm4-pro', label: 'Apple M4 Pro', perfIndex: 0.3, typicalVramGB: 36 },
  { id: 'm4', label: 'Apple M4', perfIndex: 0.19, typicalVramGB: 16 },
];

export const REFERENCE_ACCELERATOR = 'rtx-4090';

/**
 * Model catalogue. decodeTps / prefillTps are on the reference part; vramGB is
 * the working set including a modest KV-cache allowance, which is why these
 * sit above the raw weight size.
 */
export const MODELS: ModelSpec[] = [
  { id: 'phi-4-mini', label: 'Phi-4 mini (Q4)', vramGB: 3.5, decodeTps: 160, prefillTps: 4200 },
  { id: 'llama-3.1-8b', label: 'Llama 3.1 8B (Q4)', vramGB: 6, decodeTps: 95, prefillTps: 2600 },
  { id: 'qwen3-14b', label: 'Qwen3 14B (Q4)', vramGB: 10, decodeTps: 55, prefillTps: 1500 },
  { id: 'gpt-oss-20b', label: 'gpt-oss 20B (Q4)', vramGB: 14, decodeTps: 40, prefillTps: 1100 },
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B (Q4)', vramGB: 42, decodeTps: 11, prefillTps: 300 },
];

const ACCEL_BY_ID = new Map(ACCELERATORS.map((a) => [a.id, a]));
const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function getAccelerator(id: string): Accelerator | undefined {
  return ACCEL_BY_ID.get(id);
}

export function getModel(id: string): ModelSpec | undefined {
  return MODEL_BY_ID.get(id);
}

/**
 * Seconds to serve one request on one machine.
 *
 * Prefill and decode are billed separately because they scale completely
 * differently. A 40k-token prompt with a 200-token answer is a prefill
 * problem; a 500-token prompt with a 4k-token answer is a decode problem.
 * Collapsing them into one tokens/sec number is the most common way these
 * estimates go wrong.
 *
 * Network transfer is deliberately not modelled: PAIR moves a prompt and a
 * response over a LAN, which is milliseconds against jobs measured in tens of
 * seconds. That approximation stops being safe for very short jobs, and the
 * UI says so rather than hiding it.
 */
export function jobDurationSec(
  promptTokens: number,
  outputTokens: number,
  model: ModelSpec,
  perfIndex: number,
): number {
  if (perfIndex <= 0) return Infinity;
  const prefill = promptTokens / (model.prefillTps * perfIndex);
  const decode = outputTokens / (model.decodeTps * perfIndex);
  return prefill + decode;
}

/**
 * Cold-start cost: a machine that has not just served this model must read the
 * weights into VRAM first. 1.1 GB/s is an NVMe-to-VRAM order of magnitude, not
 * a measurement, and it is the single assumption most likely to be wrong on any
 * given box - a model already resident in the page cache loads far faster, and
 * a cold spinning disk far slower.
 *
 * It matters because it penalises exactly the thing a fleet does more of than a
 * single machine: switching models. Leave it out and a cluster looks better
 * than it is.
 */
export const MODEL_LOAD_GBPS = 1.1;

export function modelLoadSec(model: ModelSpec): number {
  return model.vramGB / MODEL_LOAD_GBPS;
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec)) return '-';
  const rounded = Math.round(sec);
  if (rounded < 60) return rounded + 's';
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s === 0 ? m + 'm' : m + 'm ' + String(s).padStart(2, '0') + 's';
}
