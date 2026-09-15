/**
 * Conduct Gap — types.
 *
 * The question the engine answers: for a published model-policy clause, what
 * would you have to OBSERVE to catch a violation of it, and do you hold that
 * observation?
 *
 * Two vocabularies do the work. `EvidenceClass` describes the kind of evidence
 * a clause demands. `EvidenceSourceId` describes the kind of access a reader
 * might hold. The map between them (engine/evidence.ts) is where every
 * interesting result comes from.
 */

/** What kind of observation would falsify a clause. */
export type EvidenceClass =
  /** The violation is visible in a single response you already receive. */
  | 'output-inspection'
  /** You must construct the input — adversarial, multi-turn, or pressure-testing. */
  | 'black-box-probe'
  /** You need the tool-call / action log from a harness you operate. */
  | 'action-trace'
  /** You check it against your own operator configuration, not the model. */
  | 'deployment-config'
  /** You must compare what happened against what was withheld or would have happened. */
  | 'counterfactual'
  /** You need the model's own hidden artefacts — raw reasoning, weights. */
  | 'model-internals'
  /** You need the vendor's records — eval results, review files, training data. */
  | 'vendor-records'
  /** You need aggregate behaviour across many users or a long span of time. */
  | 'population'
  /** The clause states a value or an intention with no behavioural observable. */
  | 'none-defined';

export type EvidenceSourceId =
  | 'endpoint'
  | 'redteam'
  | 'traces'
  | 'config'
  | 'cot'
  | 'telemetry'
  | 'attestation'
  | 'evaluator';

export interface EvidenceSource {
  id: EvidenceSourceId;
  label: string;
  /** Who typically holds this. */
  held: string;
  /** Evidence classes this access makes reachable. Empty is meaningful. */
  grants: EvidenceClass[];
  /** Another source that must also be held for this one to do anything. */
  requires?: EvidenceSourceId;
  note?: string;
}

/** Where a clause sits in the document's own tier system. */
export type Tier =
  | 'objective'
  | 'absolute-constraint'
  | 'human-control'
  | 'chain-of-command'
  | 'guideline'
  | 'default'
  | 'process';

/** Who may change the clause, per the document's own rules. */
export type Changeable = 'non-negotiable' | 'operator-configurable' | 'system-instruction';

export interface Clause {
  id: string;
  /** Part number in the published document, 1-5. */
  part: number;
  /** Section label as printed, e.g. "2.4 Human Control". */
  section: string;
  /** Short handle for the UI. Not from the document. */
  handle: string;
  /** Verbatim text from the published Code of Conduct. Never paraphrased. */
  text: string;
  tier: Tier;
  changeable: Changeable;
  /** The class of evidence that would falsify it. This project's judgement. */
  requires: EvidenceClass;
  /** What you would have to see. This project's judgement. */
  observable: string;
  /** Steps that would test it, where a test exists. */
  probe?: string[];
  /**
   * Set where a probe is technically constructible but must not be written
   * down here. The UI shows the reason instead of a procedure.
   */
  probeWithheld?: string;
  /** Anything worth saying about why this clause classifies the way it does. */
  note?: string;
}

export type ScopeId =
  | 'mai-direct'
  | 'mai-operator'
  | 'mai-subagent'
  | 'third-party-hosted'
  | 'mixed-surface';

export interface Scope {
  id: ScopeId;
  label: string;
  /** Whether the Code of Conduct governs the requests on this surface. */
  coverage: 'full' | 'none' | 'partial';
  /** Verbatim sentence from the document or a cited source that settles it. */
  basis: string;
  basisSource: string;
  detail: string;
}

export type Verdict =
  /** Your evidence would show a violation. */
  | 'checkable'
  /** Your evidence would show it, but the operator may change the clause itself. */
  | 'checkable-configurable'
  /** Some access in the catalogue reaches it; you do not hold that access. */
  | 'needs-access'
  /** Nothing in the catalogue reaches it. */
  | 'unfalsifiable'
  /** The clause does not attach to this deployment. */
  | 'out-of-scope';

export interface ClauseResult {
  clause: Clause;
  verdict: Verdict;
  /** Sources that would move this clause to checkable, when you lack them. */
  unlockedBy: EvidenceSourceId[];
  /** Why the verdict is what it is, in one line. */
  reason: string;
}

export interface TriageResult {
  results: ClauseResult[];
  counts: Record<Verdict, number>;
  /** Clauses in scope — everything except out-of-scope. */
  inScope: number;
  total: number;
  /**
   * Set only where the surface mixes model families. The counts below assume
   * the clause applies; on a mixed surface an unknown share of requests is
   * served by models the document does not govern, and that share is not
   * disclosed per request, so it cannot be computed here.
   */
  scopeCaveat?: string;
}
