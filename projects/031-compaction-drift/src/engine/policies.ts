import type { FactKind, Policy, PolicyId } from './types';

/**
 * Compaction policy families.
 *
 * IMPORTANT, and stated in the UI as well as here: OpenAI has not published
 * the algorithm the Agents API uses to compact a session. What it has
 * published is the goal — "automatically compacts earlier context as a
 * session approaches its context limit, preserving information the agent
 * needs to continue". These six entries are the documented technique
 * families that goal is implemented with across public harnesses. Choosing
 * one here answers "what does this class of technique do to my rule", not
 * "what does vendor X do".
 */
export const POLICIES: Policy[] = [
  {
    id: 'none',
    name: 'No compaction',
    mechanism:
      'Append every turn. When the transcript passes the window the request fails; the session cannot continue.',
    source: 'Baseline. The failure mode compaction exists to remove.',
    url: 'https://developers.openai.com/api/docs/guides/compaction',
    compacts: false,
    summarises: false,
    keepsSystemVerbatim: true,
    keepsUserVerbatim: true,
    rehydratesExternalised: false,
  },
  {
    id: 'sliding-window',
    name: 'Sliding window',
    mechanism:
      'Keep the newest turns that fit and discard the oldest outright. Nothing is summarised, so anything evicted is gone completely.',
    source: 'Microsoft Agent Framework — message-count / token-count reducers',
    url: 'https://learn.microsoft.com/en-us/agent-framework/concepts/agents/conversations/compaction',
    compacts: true,
    summarises: false,
    keepsSystemVerbatim: true,
    keepsUserVerbatim: false,
    rehydratesExternalised: false,
  },
  {
    id: 'recursive-summary',
    name: 'Recursive summary',
    mechanism:
      'Replace the oldest block with a model-written summary. Each later round summarises the previous summary, so detail is lost compounding rather than all at once.',
    source: 'The standard summarising-memory pattern in agent frameworks',
    url: 'https://learn.microsoft.com/en-us/agent-framework/concepts/agents/conversations/compaction',
    compacts: true,
    summarises: true,
    keepsSystemVerbatim: false,
    keepsUserVerbatim: false,
    rehydratesExternalised: false,
  },
  {
    id: 'pinned-prefix',
    name: 'Pinned prefix + summary',
    mechanism:
      'System and developer instructions are pinned and never compacted; everything after them is recursively summarised.',
    source: 'The common harness default — instructions pinned, transcript summarised',
    url: 'https://developers.openai.com/api/docs/guides/compaction',
    compacts: true,
    summarises: true,
    keepsSystemVerbatim: true,
    keepsUserVerbatim: false,
    rehydratesExternalised: false,
  },
  {
    id: 'user-verbatim',
    name: 'User-verbatim compaction',
    mechanism:
      'Every message the operator typed is kept word for word; assistant messages, reasoning and tool results are replaced by an opaque compacted item.',
    source:
      "Anthropic's /responses/compact — prior user messages stay verbatim, prior assistant turns, tool calls and reasoning become an encrypted opaque item",
    url: 'https://developers.openai.com/api/docs/guides/compaction',
    compacts: true,
    summarises: true,
    keepsSystemVerbatim: true,
    keepsUserVerbatim: true,
    rehydratesExternalised: false,
  },
  {
    id: 'externalised',
    name: 'Pinned prefix + externalised state',
    mechanism:
      'As pinned prefix, plus: anything written to a workspace file or memory store is re-read after each compaction instead of being recovered from the transcript.',
    source:
      'Published long-session guidance — externalise durable state early rather than relying on conversation history',
    url: 'https://developers.openai.com/api/docs/guides/agents-api/overview',
    compacts: true,
    summarises: true,
    keepsSystemVerbatim: true,
    keepsUserVerbatim: false,
    rehydratesExternalised: true,
  },
];

export const POLICY_BY_ID: Record<PolicyId, Policy> = Object.fromEntries(
  POLICIES.map((p) => [p.id, p]),
) as Record<PolicyId, Policy>;

/**
 * Per-summarisation-round retention, by kind of fact.
 *
 * BASIS: engineering judgement, not a published measurement. No vendor
 * publishes per-category retention for its summariser and I have not run an
 * experiment that would let me claim one. These numbers encode a single
 * defensible ordering, which is the actual argument of this tool:
 *
 *   a summariser told to preserve "information the agent needs to continue"
 *   preserves task state preferentially, because task state is what
 *   continuation means. A standing rule is not needed to continue — it is
 *   needed at one specific later moment — and a one-clause carve-out is the
 *   single most droppable sentence in a transcript.
 *
 * The ORDER is the claim and it is defensible. The MAGNITUDES are a guess,
 * they are on screen next to the result, and they are adjustable, so the
 * reader can disagree with them numerically without having to disagree with
 * the ordering. Treat the absolute turn numbers this produces as illustrative.
 */
export const DEFAULT_RETENTION: Record<FactKind, number> = {
  'task-state': 0.95,
  correction: 0.8,
  scope: 0.75,
  constraint: 0.7,
  exception: 0.55,
};

/**
 * Below this fidelity a fact is treated as no longer actionable: the gist may
 * survive in a summary ("there were some access restrictions") while the
 * operative detail — which system, which tenant, which exception — does not.
 */
export const ACTIONABLE_THRESHOLD = 0.5;

/** Fraction of the window the harness compacts back down to. */
export const POST_COMPACTION_FRACTION = 0.45;

export const FACT_KIND_LABEL: Record<FactKind, string> = {
  constraint: 'Standing rule',
  exception: 'Carve-out',
  correction: 'Operator correction',
  scope: 'Scope boundary',
  'task-state': 'Task state',
};

/** Kinds whose loss is a governance failure rather than an efficiency loss. */
export const RULE_LIKE_KINDS: FactKind[] = ['constraint', 'exception', 'correction', 'scope'];
