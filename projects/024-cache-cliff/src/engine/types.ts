/** How often the content of a block changes. */
export type Volatility = 'static' | 'per-session' | 'per-turn';

/**
 * Where a block is allowed to live in an Anthropic request. Reordering is only
 * legal WITHIN a zone — you cannot move the user turn ahead of the system
 * prompt. A valid stack lists zones in this order.
 */
export type Zone = 'tools' | 'system' | 'context' | 'history' | 'turn';

export const ZONE_ORDER: Zone[] = ['tools', 'system', 'context', 'history', 'turn'];

export const ZONE_LABEL: Record<Zone, string> = {
  tools: 'tool definitions',
  system: 'system prompt',
  context: 'pinned context',
  history: 'conversation history',
  turn: 'current turn',
};

export interface Block {
  id: string;
  label: string;
  tokens: number;
  volatility: Volatility;
  zone: Zone;
  note?: string;
}

export interface PromptStack {
  name: string;
  blocks: Block[];
  /** Indices of blocks carrying a `cache_control` marker. Anthropic allows 4. */
  breakpoints: number[];
  outputTokens: number;
  turnsPerSession: number;
  sessionsPerDay: number;
}

export const MAX_BREAKPOINTS = 4;

/** 'cold' = first request of a new session. 'warm' = a later turn in one. */
export type Horizon = 'cold' | 'warm';
