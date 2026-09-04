import type { PromptStack } from './types';

/**
 * Three stacks drawn from shapes that actually show up in production. The
 * token sizes are illustrative, not measured from anyone's system — the point
 * of each preset is its ORDERING, which is the thing the tool analyses.
 */
export const PRESETS: PromptStack[] = [
  {
    name: 'Coding agent (the classic timestamp bug)',
    turnsPerSession: 30,
    sessionsPerDay: 40,
    outputTokens: 900,
    breakpoints: [4],
    blocks: [
      { id: 'tools', label: 'Tool definitions (18 tools)', tokens: 3400, volatility: 'static', zone: 'tools' },
      { id: 'sys', label: 'System prompt', tokens: 1800, volatility: 'static', zone: 'system' },
      {
        id: 'now',
        label: '"Current date and time: …"',
        tokens: 12,
        volatility: 'per-turn',
        zone: 'system',
        note: 'Injected so the model knows what day it is. Twelve tokens.',
      },
      { id: 'repo', label: 'Repository map + open files', tokens: 24000, volatility: 'per-session', zone: 'context' },
      { id: 'hist', label: 'Conversation so far', tokens: 8000, volatility: 'per-turn', zone: 'history' },
      { id: 'user', label: 'User message', tokens: 300, volatility: 'per-turn', zone: 'turn' },
    ],
  },
  {
    name: 'Enterprise RAG copilot (personalised too early)',
    turnsPerSession: 6,
    sessionsPerDay: 900,
    outputTokens: 600,
    breakpoints: [],
    blocks: [
      { id: 'sys', label: 'System prompt + answer format', tokens: 900, volatility: 'static', zone: 'system' },
      {
        id: 'who',
        label: '"You are speaking with {name}, {role}, {region}"',
        tokens: 40,
        volatility: 'per-session',
        zone: 'system',
        note: 'Personalisation pinned to the top of the system prompt.',
      },
      { id: 'policy', label: 'HR + security policy corpus', tokens: 42000, volatility: 'static', zone: 'context' },
      { id: 'chunks', label: 'Retrieved chunks for this question', tokens: 6000, volatility: 'per-turn', zone: 'context' },
      { id: 'q', label: 'Question', tokens: 120, volatility: 'per-turn', zone: 'turn' },
    ],
  },
  {
    name: 'Clean stack (what good looks like)',
    turnsPerSession: 30,
    sessionsPerDay: 40,
    outputTokens: 900,
    breakpoints: [2, 3],
    blocks: [
      { id: 'tools', label: 'Tool definitions (18 tools)', tokens: 3400, volatility: 'static', zone: 'tools' },
      { id: 'sys', label: 'System prompt', tokens: 1800, volatility: 'static', zone: 'system' },
      { id: 'policy', label: 'Pinned reference docs', tokens: 24000, volatility: 'static', zone: 'context' },
      { id: 'repo', label: 'Repository map (this session)', tokens: 12000, volatility: 'per-session', zone: 'context' },
      { id: 'hist', label: 'Conversation so far', tokens: 8000, volatility: 'per-turn', zone: 'history' },
      { id: 'now', label: '"Current date and time: …"', tokens: 12, volatility: 'per-turn', zone: 'turn' },
      { id: 'user', label: 'User message', tokens: 300, volatility: 'per-turn', zone: 'turn' },
    ],
  },
];

/** Named patterns that quietly break a prefix. Shown in the UI as a checklist. */
export const KNOWN_INVALIDATORS: { title: string; detail: string }[] = [
  {
    title: 'The current date or time in the system prompt',
    detail: 'The cheapest possible way to destroy the most expensive possible prefix. Put it in the user turn.',
  },
  {
    title: 'Tool definitions built from an unordered map',
    detail: 'Object key order is not guaranteed across processes. Sort the tool array before you serialise it.',
  },
  {
    title: 'The user name, tenant id or locale near the top',
    detail: 'Fine — but it makes the whole head per-session, so it needs its own breakpoint below the static part.',
  },
  {
    title: 'Randomly sampled few-shot examples',
    detail: 'Sampling per request means a new prefix per request. Freeze the sample per session, or move it after the breakpoint.',
  },
  {
    title: 'A trailing whitespace or JSON key-order change from a library upgrade',
    detail: 'Matching is on exact tokens, not on meaning. A serialiser change is a silent full-price month.',
  },
  {
    title: 'Anything read from the request itself — request id, trace id, retry count',
    detail: 'Observability metadata belongs in headers, not in the prompt body.',
  },
];
