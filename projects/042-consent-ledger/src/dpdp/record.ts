import type { ProvisionId } from './provisions';

/**
 * A consent record shaped the way section 6(1) describes consent: tied to a
 * list of *specified purposes*, and limited to the data necessary for them.
 *
 * The point of modelling it this way is that "did the user consent?" is never
 * the question an AI team actually faces. The question is "consent to what,
 * and does this pipeline stage fall inside it?" — which is a set membership
 * test against `specifiedPurposes`, nothing more.
 */

export type PurposeId =
  | 'service-delivery'
  | 'safety-review'
  | 'model-improvement'
  | 'cross-product-personalisation'
  | 'advertising';

export interface Purpose {
  id: PurposeId;
  label: string;
  /** How this purpose would read in a section 5 notice. */
  noticeWording: string;
}

export const PURPOSES: Purpose[] = [
  {
    id: 'service-delivery',
    label: 'Deliver the assistant',
    noticeWording: 'To answer your questions in this product.',
  },
  {
    id: 'safety-review',
    label: 'Human safety review',
    noticeWording: 'To let our reviewers read flagged conversations for abuse and safety.',
  },
  {
    id: 'model-improvement',
    label: 'Train our models',
    noticeWording: 'To train and fine-tune the models behind this product.',
  },
  {
    id: 'cross-product-personalisation',
    label: 'Personalise our other products',
    noticeWording: 'To personalise the other products we operate using what you do here.',
  },
  {
    id: 'advertising',
    label: 'Targeted advertising',
    noticeWording: 'To select the advertising you are shown.',
  },
];

export interface ConsentRecord {
  /** Purposes the section 5 notice actually named. */
  specifiedPurposes: PurposeId[];
  /** Is the Data Principal a child (under 18) for section 9 purposes? */
  principalIsChild: boolean;
  /** Has the principal exercised section 6(4)? */
  withdrawn: boolean;
  /** Is a processor outside India in the pipeline? */
  usesForeignProcessor: boolean;
}

export const DEFAULT_RECORD: ConsentRecord = {
  specifiedPurposes: ['service-delivery'],
  principalIsChild: false,
  withdrawn: false,
  usesForeignProcessor: true,
};

export function hasPurpose(record: ConsentRecord, purpose: PurposeId): boolean {
  return record.specifiedPurposes.includes(purpose);
}

export function togglePurpose(record: ConsentRecord, purpose: PurposeId): ConsentRecord {
  const next = hasPurpose(record, purpose)
    ? record.specifiedPurposes.filter((p) => p !== purpose)
    : [...record.specifiedPurposes, purpose];
  return { ...record, specifiedPurposes: next };
}

/** Provisions that govern the record itself, regardless of any specific use. */
export const RECORD_PROVISIONS: ProvisionId[] = ['s6_1', 's6_4'];
