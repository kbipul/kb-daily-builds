export interface ModelPricing {
  id: string;
  label: string;
  /** USD per 1M tokens. */
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  source: string;
}

/**
 * Only prices that can be cited are shipped as presets. Everything else is the
 * editable Custom model — the tool never invents a number.
 */
export const MODELS: ModelPricing[] = [
  {
    id: 'fable-5-1',
    label: 'Claude Fable 5.1',
    input: 10,
    output: 50,
    cacheRead: 0.25,
    cacheWrite5m: 12.5,
    cacheWrite1h: 20,
    source: 'GA 1 Sep 2026 — cache read cut 75% to $0.25/M (2.5% of input)',
  },
  {
    id: 'fable-5',
    label: 'Claude Fable 5 (the old 10% rule)',
    input: 10,
    output: 50,
    cacheRead: 1.0,
    cacheWrite5m: 12.5,
    cacheWrite1h: 20,
    source: 'Same model family before 1 Sep 2026 — cache read at the usual 10% of input',
  },
  {
    id: 'custom',
    label: 'Custom (enter your own)',
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6,
    source: 'Defaults follow the conventional Claude ratios: read 10%, 5m write 1.25x, 1h write 2x',
  },
];

export type Ttl = '5m' | '1h';

export const writeRate = (m: ModelPricing, ttl: Ttl): number =>
  ttl === '1h' ? m.cacheWrite1h : m.cacheWrite5m;

/**
 * How much worse a miss is than a hit for the same tokens. This is the whole
 * point of the tool: on Fable 5.1 it is 50x, on the old 10% rule it was 12.5x.
 */
export const missPenalty = (m: ModelPricing, ttl: Ttl): number =>
  writeRate(m, ttl) / m.cacheRead;

/**
 * A cache that is written every request and never read costs MORE than not
 * caching at all. This is the surcharge, e.g. 1.25 = a 25% penalty.
 */
export const deadCacheSurcharge = (m: ModelPricing, ttl: Ttl): number =>
  writeRate(m, ttl) / m.input;
