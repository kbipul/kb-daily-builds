/**
 * Framework profiles.
 *
 * Two of these name real software, and their reported reproduction ranges come
 * from the Loopjacking paper (arXiv 2609.21081) as summarised in its abstract
 * and in the Agentic Security newsletter of 22 September 2026. This file models
 * the BINDING SHAPE each profile uses. It is not a port of either framework's
 * code, and no version here was executed. See README "Build notes".
 */

/** How the approval record refers back to the thing approved. */
export type Binding =
  /** Store the action id only; re-resolve the action from live state at execute. */
  | 'reference'
  /** Store a copy of the action as it stood at approval; execute that copy. */
  | 'value'
  /** Store a copy AND a digest; re-check the digest before executing. */
  | 'bound';

export type Profile = {
  key: string;
  name: string;
  /** Fields the approval card renders. Anything absent is invisible to the reviewer. */
  cardFields: ('label' | 'tool' | 'args' | 'reversible')[];
  binding: Binding;
  /** What the paper reports about this profile, or why it is here. */
  note: string;
};

export const PROFILES: Profile[] = [
  {
    key: 'agno',
    name: 'Agno AgentOS (≤ 3.0.9)',
    cardFields: ['label', 'tool'],
    binding: 'reference',
    note: 'Post-approval substitution reproduced in seven tested releases ending at 3.0.9.',
  },
  {
    key: 'langgraph',
    name: 'LangGraph Agent Server (≤ 0.14.0, conditional in-memory)',
    cardFields: ['label', 'tool', 'args'],
    binding: 'reference',
    note: 'Reproduced in 12 tested versions of a conditional in-memory Agent Server composition ending at 0.14.0.',
  },
  {
    key: 'snapshot',
    name: 'Snapshot approval (value copy)',
    cardFields: ['label', 'tool', 'args'],
    binding: 'value',
    note: 'Not a named framework. Copying the action at approval time closes the post-approval route and leaves the representation route open.',
  },
  {
    key: 'bound',
    name: 'Digest-bound approval',
    cardFields: ['label', 'tool', 'args', 'reversible'],
    binding: 'bound',
    note: 'The shape the paper argues for: the approval is bound to the exact action executed, and execution re-checks the binding.',
  },
];

export function profileByKey(key: string): Profile {
  const p = PROFILES.find((x) => x.key === key);
  if (!p) throw new Error('unknown profile: ' + key);
  return p;
}
