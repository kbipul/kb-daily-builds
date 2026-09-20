import type { ConsentRecord } from './record';
import { hasPurpose } from './record';
import type { DownstreamUse } from './uses';
import type { ProvisionId } from './provisions';

/**
 * One function decides every row in the ledger. It is deliberately small:
 * the interesting part of DPDP is not a clever algorithm, it is that a set
 * membership test against the specified purposes rules out most of what an
 * AI pipeline wants to do.
 */

export type Verdict = 'authorised' | 'not-authorised' | 'unsettled';

export interface Ruling {
  verdict: Verdict;
  /** Why, in one sentence, in the register an engineer reads. */
  reason: string;
  /** Provisions the ruling turns on, most specific first. */
  basis: ProvisionId[];
  /** Present when verdict is 'unsettled'. */
  openQuestion?: string;
}

export function evaluate(record: ConsentRecord, u: DownstreamUse): Ruling {
  // Section 9(3) is a prohibition, not a consent question. It bites before
  // anything else, and parental consent does not unlock it.
  if (record.principalIsChild && (u.id === 'select-ads' || u.requires === 'advertising')) {
    return {
      verdict: 'not-authorised',
      reason:
        'The principal is a child, and section 9(3) prohibits targeted advertising directed at children outright. No consent makes this lawful.',
      basis: ['s9_3'],
    };
  }

  // Withdrawal stops processing going forward; it does not retrospectively
  // taint what already happened (s.6(5)).
  if (record.withdrawn) {
    return {
      verdict: 'not-authorised',
      reason:
        'Consent is withdrawn, so processing must cease within a reasonable time — and the processors must be made to cease too.',
      basis: ['s6_6', 's6_4'],
    };
  }

  if (!hasPurpose(record, u.requires)) {
    return {
      verdict: 'not-authorised',
      reason: `The notice did not specify this purpose, and consent is "limited to such personal data as is necessary for such specified purpose".`,
      basis: ['s6_1'],
    };
  }

  if (u.unsettled) {
    return {
      verdict: 'unsettled',
      reason:
        'The purpose is specified, so the stage is inside the consent. What is inside the erasure duty afterwards is the open part.',
      basis: ['s6_1', 's8_7', 's2t'],
      openQuestion: u.unsettled,
    };
  }

  return {
    verdict: 'authorised',
    reason: 'The notice specified this purpose and consent stands.',
    basis: ['s6_1'],
  };
}

export interface LedgerRow {
  use: DownstreamUse;
  ruling: Ruling;
}

export function ledger(record: ConsentRecord, uses: DownstreamUse[]): LedgerRow[] {
  return uses.map((u) => ({ use: u, ruling: evaluate(record, u) }));
}

export function countBy(rows: LedgerRow[]): Record<Verdict, number> {
  const out: Record<Verdict, number> = {
    authorised: 0,
    'not-authorised': 0,
    unsettled: 0,
  };
  for (const r of rows) out[r.ruling.verdict] += 1;
  return out;
}
