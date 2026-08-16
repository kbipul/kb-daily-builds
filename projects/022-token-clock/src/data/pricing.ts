import type { ModelPricing, Zone } from "../lib/types";

const H = (h: number, m = 0) => h * 60 + m;

/**
 * DeepSeek's peak windows, as published: 01:00–04:00 and 06:00–10:00 UTC.
 * In Beijing time (UTC+8) that is 09:00–12:00 and 14:00–18:00 — the Chinese
 * working day. Everything outside those seven hours is off-peak.
 */
const DEEPSEEK_PEAK = [
  { startMin: H(1), endMin: H(4) },
  { startMin: H(6), endMin: H(10) },
];

const DEEPSEEK_SOURCE =
  "TechNode / Quartz, 13–14 Aug 2026 — DeepSeek V4 peak & off-peak API pricing, effective 16:00 UTC 16 Aug 2026";

/**
 * Every figure below is USD per 1,000,000 OUTPUT tokens.
 *
 * Output tokens only, deliberately. The repricing coverage quotes output rates;
 * per-band INPUT rates were not published in the sources used here, and this
 * catalogue does not carry numbers it cannot cite. See the honesty note in the
 * README and the UI.
 */
export const MODELS: ModelPricing[] = [
  {
    id: "deepseek-v4-flash",
    provider: "DeepSeek",
    name: "V4-Flash",
    outputPerMTok: { peak: 1.32, offpeak: 0.66 },
    peakWindowsUtc: DEEPSEEK_PEAK,
    previousFlatOutputPerMTok: 0.28,
    effectiveFrom: "2026-08-16T16:00:00Z",
    source: DEEPSEEK_SOURCE,
    note: "Off-peak is exactly half of peak. Peak is ~4.7x the previous flat rate.",
  },
  {
    id: "deepseek-v4-pro",
    provider: "DeepSeek",
    name: "V4-Pro",
    outputPerMTok: { peak: 3.96, offpeak: 1.98 },
    peakWindowsUtc: DEEPSEEK_PEAK,
    previousFlatOutputPerMTok: 0.87,
    effectiveFrom: "2026-08-16T16:00:00Z",
    source: DEEPSEEK_SOURCE,
    note: "Off-peak is exactly half of peak. Peak is ~4.6x the previous flat rate.",
  },
  {
    id: "deepseek-v4-flash-old",
    provider: "DeepSeek",
    name: "V4-Flash (pre-16 Aug flat rate)",
    outputPerMTok: { peak: 0.28, offpeak: 0.28 },
    peakWindowsUtc: [],
    previousFlatOutputPerMTok: null,
    effectiveFrom: "before 2026-08-16T16:00:00Z",
    source: DEEPSEEK_SOURCE,
    note: "Kept in the catalogue as the baseline the repricing moved away from.",
  },
];

export const ZONES: Zone[] = [
  { id: "ist", label: "India (IST, UTC+5:30)", offsetMin: 330 },
  { id: "utc", label: "UTC", offsetMin: 0 },
  { id: "cst", label: "China (CST, UTC+8)", offsetMin: 480 },
  { id: "cet", label: "Central Europe (UTC+2)", offsetMin: 120 },
  { id: "et", label: "US Eastern (UTC−4)", offsetMin: -240 },
  { id: "pt", label: "US Pacific (UTC−7)", offsetMin: -420 },
];

export function modelById(id: string): ModelPricing {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown model: ${id}`);
  return m;
}

export function zoneById(id: string): Zone {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone: ${id}`);
  return z;
}
