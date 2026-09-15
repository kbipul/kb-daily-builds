import type { EvidenceClass, EvidenceSource, EvidenceSourceId } from './types';

/**
 * The access catalogue.
 *
 * `grants` is the load-bearing field and it is this project's judgement, not
 * anybody's published claim. The argument for each mapping is in `note`, and
 * the two that decide most results are:
 *
 *   - `counterfactual` is granted by exactly one entry, because catching a
 *     concealment means holding both what was shown and what was true.
 *   - `attestation` grants nothing. A vendor's account of its own conduct is
 *     the claim under test, not evidence about it.
 */
export const EVIDENCE_SOURCES: EvidenceSource[] = [
  {
    id: 'endpoint',
    label: 'Endpoint access',
    held: 'Anyone with an API key or a chat window',
    grants: ['output-inspection'],
    note: 'You see the response. Nothing about how it was produced.',
  },
  {
    id: 'redteam',
    label: 'Red-team budget',
    held: 'Teams with people, time and permission to attack their own deployment',
    grants: ['black-box-probe'],
    requires: 'endpoint',
    note: 'Constructing the input is the work. Without it you only see the responses your ordinary traffic happens to produce.',
  },
  {
    id: 'traces',
    label: 'Action traces',
    held: 'Whoever operates the agent harness',
    grants: ['action-trace'],
    note: 'Tool calls, arguments, results, cancellations, egress. Yours only if the harness is yours.',
  },
  {
    id: 'config',
    label: 'Operator configuration',
    held: 'The tenant or developer who wrote the system prompt',
    grants: ['deployment-config'],
    note: 'Tells you what you asked for, which is a different question from what the model did.',
  },
  {
    id: 'cot',
    label: 'Raw chain of thought',
    held: 'Rarely anyone outside the lab; some APIs expose a summary',
    grants: ['model-internals'],
    note: 'Reading the reasoning you were handed does not tell you whether a different reasoning was suppressed. That is a separate class.',
  },
  {
    id: 'telemetry',
    label: 'Population telemetry',
    held: 'Large operators with consented, longitudinal logs',
    grants: ['population'],
    note: 'Clauses about patterns, scale and long-term effects are not decidable from one transcript.',
  },
  {
    id: 'attestation',
    label: 'Vendor attestation',
    held: 'Any enterprise customer who asks for the system card',
    grants: [],
    note: 'Deliberately grants nothing. A system card is the vendor describing its own conduct; it can raise or lower your confidence, and it cannot falsify a clause about that vendor.',
  },
  {
    id: 'evaluator',
    label: 'Independent evaluator, employee-level access',
    held: 'Nobody, under this document',
    grants: ['model-internals', 'vendor-records', 'counterfactual', 'population'],
    note: 'Modelled on the commitment Anthropic made on 12 Sep 2026 and OpenAI matched. It is the only entry that reaches the counterfactual class, because only a party who can compare against unshipped checkpoints can see what was withheld.',
  },
];

export const SOURCE_BY_ID: Record<EvidenceSourceId, EvidenceSource> = Object.fromEntries(
  EVIDENCE_SOURCES.map((s) => [s.id, s]),
) as Record<EvidenceSourceId, EvidenceSource>;

/** Classes reachable by the held set, after dependency filtering. */
export function grantedClasses(held: ReadonlySet<EvidenceSourceId>): Set<EvidenceClass> {
  const out = new Set<EvidenceClass>();
  for (const source of EVIDENCE_SOURCES) {
    if (!held.has(source.id)) continue;
    if (source.requires && !held.has(source.requires)) continue;
    for (const cls of source.grants) out.add(cls);
  }
  return out;
}

/** Every source that would grant `cls`, ignoring what is currently held. */
export function sourcesGranting(cls: EvidenceClass): EvidenceSourceId[] {
  return EVIDENCE_SOURCES.filter((s) => s.grants.includes(cls)).map((s) => s.id);
}

/** A class nothing in the catalogue can reach. */
export function isUnreachable(cls: EvidenceClass): boolean {
  return sourcesGranting(cls).length === 0;
}

export const CLASS_LABEL: Record<EvidenceClass, string> = {
  'output-inspection': 'Read the response',
  'black-box-probe': 'Construct the input',
  'action-trace': 'Read your action log',
  'deployment-config': 'Read your own config',
  counterfactual: 'Compare against what was withheld',
  'model-internals': 'Open the model',
  'vendor-records': 'Read the vendor\u2019s files',
  population: 'Measure across users and time',
  'none-defined': 'No observable stated',
};
