import { peakFractionForLocalHour } from "./clock";
import type { CostReport, HourCost, ModelPricing, Workload, Zone } from "./types";

const PER_M = 1_000_000;

/** Sum several workloads' hourly arrays into one 24-slot array. */
export function combineHourly(
  workloads: Workload[],
  override?: Record<string, number[]>,
): number[] {
  const out = new Array(24).fill(0);
  for (const w of workloads) {
    const series = override?.[w.id] ?? w.hourlyOutputTokens;
    for (let h = 0; h < 24; h++) out[h] += series[h] ?? 0;
  }
  return out;
}

/** Blended USD per 1M tokens for one local hour under a model's bands. */
export function blendedRate(
  localHour: number,
  zone: Zone,
  model: ModelPricing,
): { peakFraction: number; blendedPerMTok: number } {
  const peakFraction = peakFractionForLocalHour(
    localHour,
    zone,
    model.peakWindowsUtc,
  );
  const blendedPerMTok =
    peakFraction * model.outputPerMTok.peak +
    (1 - peakFraction) * model.outputPerMTok.offpeak;
  return { peakFraction, blendedPerMTok };
}

export function costForHourly(
  hourlyTokens: number[],
  zone: Zone,
  model: ModelPricing,
): CostReport {
  const hours: HourCost[] = [];
  let totalTokens = 0;
  let totalCostUsd = 0;
  let peakCostUsd = 0;

  for (let h = 0; h < 24; h++) {
    const tokens = hourlyTokens[h] ?? 0;
    const { peakFraction, blendedPerMTok } = blendedRate(h, zone, model);
    const costUsd = (tokens / PER_M) * blendedPerMTok;

    // The peak-priced share of this hour's spend, for exposure reporting.
    peakCostUsd += (tokens / PER_M) * peakFraction * model.outputPerMTok.peak;

    hours.push({ hour: h, tokens, peakFraction, blendedPerMTok, costUsd });
    totalTokens += tokens;
    totalCostUsd += costUsd;
  }

  const previousFlatCostUsd =
    model.previousFlatOutputPerMTok === null
      ? null
      : (totalTokens / PER_M) * model.previousFlatOutputPerMTok;

  return {
    hours,
    totalTokens,
    totalCostUsd,
    peakExposure: totalCostUsd === 0 ? 0 : peakCostUsd / totalCostUsd,
    previousFlatCostUsd,
  };
}
