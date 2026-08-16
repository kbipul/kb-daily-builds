import { blendedRate } from "./cost";
import type { ModelPricing, ShiftMove, ShiftResult, Workload, Zone } from "./types";

const PER_M = 1_000_000;

/** Shortest distance between two hours on a cyclic 24-hour clock. */
export function cyclicDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

/**
 * Move deferrable load out of expensive hours into cheaper ones.
 *
 * Rules, in order of importance:
 *  - Non-deferrable workloads are never touched. Interactive traffic happens
 *    when your users are awake; pretending otherwise is how a savings number
 *    becomes a lie.
 *  - A workload may only move within +/- maxShiftHours of its original hour.
 *  - No destination hour may exceed `capacityMultiplier` times that workload's
 *    original busiest hour. Real infrastructure cannot absorb a whole day of
 *    batch work in one 3 a.m. slot.
 *  - Work only moves to a STRICTLY cheaper hour. Equal-rate churn is not a win.
 *
 * Deterministic: sources are processed by descending rate then ascending hour,
 * destinations by ascending rate, then distance, then hour.
 */
export function shiftDeferrable(
  workloads: Workload[],
  zone: Zone,
  model: ModelPricing,
  capacityMultiplier = 2,
): ShiftResult {
  const rates = Array.from({ length: 24 }, (_, h) => blendedRate(h, zone, model).blendedPerMTok);
  const shifted: Record<string, number[]> = {};
  const moves: ShiftMove[] = [];
  let strandedTokens = 0;

  for (const w of workloads) {
    const series = [...w.hourlyOutputTokens];
    shifted[w.id] = series;
    if (!w.deferrable || w.maxShiftHours <= 0) continue;

    const cap = Math.ceil(Math.max(...w.hourlyOutputTokens) * capacityMultiplier);

    const sources = Array.from({ length: 24 }, (_, h) => h).sort(
      (a, b) => rates[b] - rates[a] || a - b,
    );

    for (const from of sources) {
      if (series[from] <= 0) continue;

      const destinations = Array.from({ length: 24 }, (_, h) => h)
        .filter(
          (to) =>
            to !== from &&
            cyclicDistance(from, to) <= w.maxShiftHours &&
            rates[to] < rates[from],
        )
        .sort(
          (a, b) =>
            rates[a] - rates[b] ||
            cyclicDistance(from, a) - cyclicDistance(from, b) ||
            a - b,
        );

      if (destinations.length === 0) continue;

      for (const to of destinations) {
        if (series[from] <= 0) break;
        const room = cap - series[to];
        if (room <= 0) continue;
        const tokens = Math.min(series[from], room);
        if (tokens <= 0) continue;

        series[from] -= tokens;
        series[to] += tokens;
        moves.push({
          workloadId: w.id,
          fromHour: from,
          toHour: to,
          tokens,
          savedUsd: (tokens / PER_M) * (rates[from] - rates[to]),
        });
      }

      // Anything still sitting here that had somewhere cheaper to go, but found
      // every cheaper hour full, is genuinely stranded — report it rather than
      // quietly folding it into the savings headline.
      if (series[from] > 0) strandedTokens += series[from];
    }
  }

  return { shifted, moves, strandedTokens };
}
