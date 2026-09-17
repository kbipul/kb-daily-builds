// The label algebra documented at:
// https://learn.microsoft.com/en-us/agent-framework/agents/security
// ("Labels on content" / "The combining rule"). Reimplemented from the docs —
// agent-framework-core is Python-only, so nothing here imports the real
// package. See engine.test.ts for the golden test against Microsoft's own
// worked example.

export type Integrity = 'trusted' | 'untrusted';
export type Confidentiality = 'public' | 'private' | 'user_identity';

export interface ContentLabel {
  integrity: Integrity;
  confidentiality: Confidentiality;
}

// "A Content item without a security_label is treated as trusted + public."
export const DEFAULT_LABEL: ContentLabel = { integrity: 'trusted', confidentiality: 'public' };

const CONFIDENTIALITY_RANK: Record<Confidentiality, number> = {
  public: 0,
  private: 1,
  user_identity: 2,
};

/**
 * "When labels are combined ... FIDES picks the most restrictive of each
 * axis: Integrity: untrusted wins over trusted. Confidentiality:
 * user_identity > private > public."
 */
export function combineLabels(...labels: ContentLabel[]): ContentLabel {
  if (labels.length === 0) return DEFAULT_LABEL;
  const integrity: Integrity = labels.some((l) => l.integrity === 'untrusted') ? 'untrusted' : 'trusted';
  const confidentiality = labels.reduce<Confidentiality>(
    (acc, l) => (CONFIDENTIALITY_RANK[l.confidentiality] > CONFIDENTIALITY_RANK[acc] ? l.confidentiality : acc),
    'public',
  );
  return { integrity, confidentiality };
}

export function confidentialityExceeds(label: Confidentiality, cap: Confidentiality): boolean {
  return CONFIDENTIALITY_RANK[label] > CONFIDENTIALITY_RANK[cap];
}

export function confidentialityRank(label: Confidentiality): number {
  return CONFIDENTIALITY_RANK[label];
}
