import type { Block, Horizon, PromptStack, Volatility, Zone } from './types';
import { MAX_BREAKPOINTS, ZONE_ORDER } from './types';
import type { ModelPricing, Ttl } from './pricing';
import { writeRate } from './pricing';

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

const stableAt = (v: Volatility, horizon: Horizon): boolean =>
  horizon === 'warm' ? v !== 'per-turn' : v === 'static';

/**
 * Index of the last block in the unbroken stable run from the top of the
 * prompt, or -1 if the very first block already changes. Anthropic matches the
 * longest identical token PREFIX, so one changed block ends the run for
 * everything behind it — that is the cliff.
 */
export function stableThrough(blocks: Block[], horizon: Horizon): number {
  let i = -1;
  while (i + 1 < blocks.length && stableAt(blocks[i + 1].volatility, horizon)) i++;
  return i;
}

/** The deepest breakpoint that can actually be read back. -1 = no hit at all. */
export function hitDepth(stack: PromptStack, horizon: Horizon): number {
  const limit = stableThrough(stack.blocks, horizon);
  const eligible = stack.breakpoints.filter((b) => b <= limit && b < stack.blocks.length);
  return eligible.length ? Math.max(...eligible) : -1;
}

export interface RequestCost {
  hitTokens: number;
  writeTokens: number;
  plainTokens: number;
  inputCost: number;
  outputCost: number;
  total: number;
}

const rangeTokens = (blocks: Block[], from: number, to: number) =>
  from > to ? 0 : sum(blocks.slice(from, to + 1).map((b) => b.tokens));

/**
 * Cost of ONE request. Tokens up to the deepest readable breakpoint are read;
 * everything from there to the deepest breakpoint present is (re)written this
 * request; the tail is charged at the ordinary input rate.
 */
export function requestCost(
  stack: PromptStack,
  model: ModelPricing,
  horizon: Horizon,
  ttl: Ttl,
): RequestCost {
  const total = sum(stack.blocks.map((b) => b.tokens));
  const hd = hitDepth(stack, horizon);
  const valid = stack.breakpoints.filter((b) => b < stack.blocks.length);
  const lastBp = valid.length ? Math.max(...valid) : -1;
  const hitTokens = rangeTokens(stack.blocks, 0, hd);
  const writeTokens = lastBp > hd ? rangeTokens(stack.blocks, hd + 1, lastBp) : 0;
  const plainTokens = total - hitTokens - writeTokens;
  const inputCost =
    (hitTokens * model.cacheRead + writeTokens * writeRate(model, ttl) + plainTokens * model.input) /
    1e6;
  const outputCost = (stack.outputTokens * model.output) / 1e6;
  return { hitTokens, writeTokens, plainTokens, inputCost, outputCost, total: inputCost + outputCost };
}

/** What the same traffic costs with no cache_control markers at all. */
export function uncachedRequestCost(stack: PromptStack, model: ModelPricing): RequestCost {
  const total = sum(stack.blocks.map((b) => b.tokens));
  const inputCost = (total * model.input) / 1e6;
  const outputCost = (stack.outputTokens * model.output) / 1e6;
  return {
    hitTokens: 0,
    writeTokens: 0,
    plainTokens: total,
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  };
}

export interface Rollup {
  perSession: number;
  perDay: number;
  perMonth: number;
}

/** Turn 1 of a session is cold; the rest are warm. 30-day month. */
export function rollup(
  stack: PromptStack,
  model: ModelPricing,
  ttl: Ttl,
  uncached = false,
): Rollup {
  const cold = uncached
    ? uncachedRequestCost(stack, model)
    : requestCost(stack, model, 'cold', ttl);
  const warm = uncached
    ? uncachedRequestCost(stack, model)
    : requestCost(stack, model, 'warm', ttl);
  const turns = Math.max(1, stack.turnsPerSession);
  const perSession = cold.total + warm.total * (turns - 1);
  const perDay = perSession * Math.max(0, stack.sessionsPerDay);
  return { perSession, perDay, perMonth: perDay * 30 };
}

export type DiagnosticKind =
  | 'no-breakpoint'
  | 'trapped-breakpoint'
  | 'cliff'
  | 'cold-cliff'
  | 'redundant-breakpoint'
  | 'unfixable-early-volatility'
  | 'too-many-breakpoints'
  | 'clean';

export interface Diagnostic {
  kind: DiagnosticKind;
  severity: 'critical' | 'warning' | 'info' | 'good';
  title: string;
  detail: string;
  blockId?: string;
  strandedTokens?: number;
}

/**
 * The findings. Ordered most expensive first; the UI shows them verbatim.
 */
export function diagnose(stack: PromptStack, model: ModelPricing, ttl: Ttl): Diagnostic[] {
  const out: Diagnostic[] = [];
  const blocks = stack.blocks;
  const warmEnd = stableThrough(blocks, 'warm');
  const coldEnd = stableThrough(blocks, 'cold');
  const valid = [...new Set(stack.breakpoints)].filter((b) => b >= 0 && b < blocks.length).sort((a, b) => a - b);

  if (valid.length > MAX_BREAKPOINTS) {
    out.push({
      kind: 'too-many-breakpoints',
      severity: 'critical',
      title: `${valid.length} breakpoints — the API accepts ${MAX_BREAKPOINTS}`,
      detail: `Anthropic allows at most ${MAX_BREAKPOINTS} cache_control markers per request. The extras will be rejected.`,
    });
  }

  if (valid.length === 0) {
    out.push({
      kind: 'no-breakpoint',
      severity: 'critical',
      title: 'No cache_control marker anywhere',
      detail: `Every token is billed at the full input rate on every request. ${rangeTokens(blocks, 0, warmEnd).toLocaleString()} tokens are stable turn-to-turn and could be reading at $${model.cacheRead}/M instead of $${model.input}/M.`,
    });
  }

  const trapped = valid.filter((b) => b > warmEnd);
  for (const b of trapped) {
    const tokens = rangeTokens(blocks, 0, b);
    const surcharge = ((writeRate(model, ttl) - model.input) * tokens) / 1e6;
    out.push({
      kind: 'trapped-breakpoint',
      severity: 'critical',
      title: `Breakpoint on "${blocks[b].label}" can never be read back`,
      detail: `Its prefix contains a per-turn block, so the ${tokens.toLocaleString()}-token prefix is rewritten at $${writeRate(model, ttl)}/M every single request and never read. That is ${surcharge >= 0 ? 'a surcharge of' : 'a saving of'} $${Math.abs(surcharge).toFixed(4)} per request over not caching at all.`,
      blockId: blocks[b].id,
    });
  }

  if (warmEnd + 1 < blocks.length) {
    const culprit = blocks[warmEnd + 1];
    const stranded = rangeTokens(blocks, warmEnd + 2, blocks.length - 1);
    // Below a kilotoken the tail is the user's own turn and there is nothing
    // to fix; reporting it would drown the findings that matter.
    if (stranded >= 1000) {
      out.push({
        kind: 'cliff',
        severity: 'warning',
        title: `"${culprit.label}" (${culprit.tokens.toLocaleString()} tokens) strands ${stranded.toLocaleString()} tokens behind it`,
        detail: `It changes ${culprit.volatility === 'per-turn' ? 'every turn' : 'every session'}, and it sits at position ${warmEnd + 2} of ${blocks.length}. Prefix matching stops here, so nothing after it can be cached no matter how stable it is.`,
        blockId: culprit.id,
        strandedTokens: stranded,
      });
    }
  }

  if (coldEnd < warmEnd) {
    const perSession = rangeTokens(blocks, coldEnd + 1, warmEnd);
    out.push({
      kind: 'cold-cliff',
      severity: 'info',
      title: `${perSession.toLocaleString()} tokens are per-session, not static`,
      detail: `They cache fine inside one conversation but are rewritten for every new session. Give them their own breakpoint at block ${coldEnd + 1} so the static head still hits on a cold start.`,
    });
  }

  const classOf = (b: number) => (b <= coldEnd ? 'cold' : b <= warmEnd ? 'warm' : 'dead');
  for (let i = 1; i < valid.length; i++) {
    if (classOf(valid[i]) === classOf(valid[i - 1]) && classOf(valid[i]) !== 'dead') {
      out.push({
        kind: 'redundant-breakpoint',
        severity: 'info',
        title: `Breakpoint on "${blocks[valid[i - 1]].label}" is redundant`,
        detail: `The deeper breakpoint on "${blocks[valid[i]].label}" has the same stability, so it always wins the longest-prefix match. You have ${MAX_BREAKPOINTS} markers to spend; this one buys nothing.`,
        blockId: blocks[valid[i - 1]].id,
      });
    }
  }

  const firstVolatileZone = blocks.find((b) => b.volatility === 'per-turn')?.zone;
  if (firstVolatileZone && firstVolatileZone !== 'turn' && firstVolatileZone !== 'history') {
    const idx = blocks.findIndex((b) => b.volatility === 'per-turn');
    const behind = rangeTokens(blocks, idx + 1, blocks.length - 1);
    if (behind > 1000) {
      out.push({
        kind: 'unfixable-early-volatility',
        severity: 'warning',
        title: `A per-turn block sits in the "${firstVolatileZone}" zone`,
        detail: `Reordering inside a zone cannot rescue this — ${behind.toLocaleString()} tokens in later zones stay stranded. Move it into the current turn instead: a timestamp or a tool result reads the same at the bottom of the prompt and costs nothing there.`,
        blockId: blocks[idx].id,
      });
    }
  }

  if (out.length === 0) {
    out.push({
      kind: 'clean',
      severity: 'good',
      title: 'Prefix is clean',
      detail: `Everything stable is in front of a breakpoint and nothing volatile is trapped behind one. ${rangeTokens(blocks, 0, hitDepth(stack, 'warm')).toLocaleString()} tokens read back at $${model.cacheRead}/M on every warm turn.`,
    });
  }

  const weight = { critical: 0, warning: 1, info: 2, good: 3 } as const;
  return out.sort((a, b) => weight[a.severity] - weight[b.severity]);
}

const VOLATILITY_RANK: Record<Volatility, number> = {
  static: 0,
  'per-session': 1,
  'per-turn': 2,
};

/** A stack is only meaningful if its zones appear in request order. */
export function validateStack(stack: PromptStack): string[] {
  const errs: string[] = [];
  let last = -1;
  for (const b of stack.blocks) {
    const z = ZONE_ORDER.indexOf(b.zone as Zone);
    if (z < last) errs.push(`"${b.label}" is in the ${b.zone} zone but follows a later zone.`);
    last = Math.max(last, z);
    if (b.tokens < 0) errs.push(`"${b.label}" has a negative token count.`);
  }
  if (stack.breakpoints.length > MAX_BREAKPOINTS) {
    errs.push(`${stack.breakpoints.length} breakpoints exceeds the API limit of ${MAX_BREAKPOINTS}.`);
  }
  return errs;
}

/**
 * The fix. Sorts blocks by volatility WITHIN each zone (the only reordering
 * that is semantically legal) and then places the two breakpoints that
 * actually pay: one at the end of the static head, one at the end of the
 * turn-stable head. Array.prototype.sort is stable, so equal blocks keep their
 * original relative order.
 */
export function optimize(stack: PromptStack): PromptStack {
  const blocks: Block[] = [];
  for (const zone of ZONE_ORDER) {
    const inZone = stack.blocks.filter((b) => b.zone === zone);
    inZone.sort((a, b) => VOLATILITY_RANK[a.volatility] - VOLATILITY_RANK[b.volatility]);
    blocks.push(...inZone);
  }
  const coldEnd = stableThrough(blocks, 'cold');
  const warmEnd = stableThrough(blocks, 'warm');
  const breakpoints = [...new Set([coldEnd, warmEnd].filter((i) => i >= 0))].sort((a, b) => a - b);
  return { ...stack, blocks, breakpoints };
}

export const totalTokens = (stack: PromptStack) => sum(stack.blocks.map((b) => b.tokens));
