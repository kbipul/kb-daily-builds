import type { UtcWindow, Zone } from "./types";

export const MINUTES_PER_DAY = 1440;

/** Normalize any minute value onto [0, 1440). */
export function wrapMin(min: number): number {
  return ((min % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function wrapHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

/**
 * Overlap in minutes between the half-open interval [startMin, startMin+length)
 * and a UTC window, both treated as cyclic over a 24-hour day.
 *
 * Windows are expressed in UTC; the interval is passed already converted to UTC
 * (and may therefore wrap past midnight, which is exactly why this is cyclic).
 */
export function overlapMinutes(
  startMin: number,
  lengthMin: number,
  window: UtcWindow,
): number {
  if (lengthMin <= 0) return 0;
  const winLen = wrapMin(window.endMin - window.startMin) || MINUTES_PER_DAY;

  let total = 0;
  // Compare against the window placed on this day and the next, so an interval
  // that wraps midnight still meets the window it straddles.
  for (const shift of [-MINUTES_PER_DAY, 0, MINUTES_PER_DAY]) {
    const winStart = window.startMin + shift;
    const winEnd = winStart + winLen;
    const lo = Math.max(startMin, winStart);
    const hi = Math.min(startMin + lengthMin, winEnd);
    if (hi > lo) total += hi - lo;
  }
  return total;
}

/**
 * The fraction (0..1) of one LOCAL hour that is priced at the peak rate.
 *
 * This is the piece that is easy to get wrong. A local hour is only aligned to
 * a UTC hour when the zone offset is a whole number of hours. India is UTC+5:30,
 * so local 06:00-07:00 IST is 00:30-01:30 UTC — which straddles the 01:00 UTC
 * start of DeepSeek's first peak window. Half that hour is peak-priced and half
 * is not, and a whole-hour model would silently pick one and be wrong.
 */
export function peakFractionForLocalHour(
  localHour: number,
  zone: Zone,
  peakWindowsUtc: UtcWindow[],
): number {
  if (peakWindowsUtc.length === 0) return 0;
  const startUtc = wrapMin(localHour * 60 - zone.offsetMin);

  // Union the windows by walking minute segments, so overlapping window
  // definitions can never double-count.
  let covered = 0;
  for (let m = 0; m < 60; m++) {
    const t = wrapMin(startUtc + m);
    const inPeak = peakWindowsUtc.some((w) => overlapMinutes(t, 1, w) > 0);
    if (inPeak) covered++;
  }
  return covered / 60;
}

/** Format a UTC window as a local-time range string, e.g. "06:30–09:30". */
export function windowInZone(window: UtcWindow, zone: Zone): string {
  const fmt = (min: number) => {
    const m = wrapMin(min);
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };
  return `${fmt(window.startMin + zone.offsetMin)}–${fmt(window.endMin + zone.offsetMin)}`;
}
