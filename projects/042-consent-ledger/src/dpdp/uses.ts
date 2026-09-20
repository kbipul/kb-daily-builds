import type { PurposeId } from './record';

/**
 * The pipeline stages an AI feature actually has, named the way an engineer
 * would name them in a design doc rather than the way a policy team would.
 * Each one records which store it writes to, because the store is what decides
 * whether withdrawal can be honoured — see residue.ts.
 */

export type StoreId =
  | 'none'
  | 'transcript-store'
  | 'vector-index'
  | 'model-weights'
  | 'output-cache'
  | 'processor-copy';

export type UseId =
  | 'serve-answer'
  | 'retain-transcript'
  | 'index-embeddings'
  | 'human-safety-review'
  | 'train-base-model'
  | 'finetune-account-checkpoint'
  | 'seed-other-product'
  | 'cache-generations'
  | 'select-ads';

export interface DownstreamUse {
  id: UseId;
  label: string;
  /** One line an engineer would recognise from a ticket. */
  detail: string;
  /** The purpose this stage needs to have been specified in the notice. */
  requires: PurposeId;
  store: StoreId;
  /** True if the stage necessarily moves data to a processor outside India. */
  foreignProcessor: boolean;
  /**
   * Set where the Act does not settle the question and no Indian guidance
   * fills the gap. The string is the open question, stated as a question.
   */
  unsettled?: string;
}

export const USES: DownstreamUse[] = [
  {
    id: 'serve-answer',
    label: 'Answer the question',
    detail: 'Send the prompt to the model and return the reply. Nothing written.',
    requires: 'service-delivery',
    store: 'none',
    foreignProcessor: false,
  },
  {
    id: 'retain-transcript',
    label: 'Keep the transcript',
    detail: 'Write the conversation to the transcript store so the session can resume.',
    requires: 'service-delivery',
    store: 'transcript-store',
    foreignProcessor: false,
  },
  {
    id: 'index-embeddings',
    label: 'Index the embeddings',
    detail: 'Embed each turn and write the vectors to the retrieval index.',
    requires: 'service-delivery',
    store: 'vector-index',
    foreignProcessor: false,
    unsettled:
      'Is a float vector derived from a transcript "data about an individual who is identifiable by or in relation to such data"? Section 2(t) turns on identifiability, and no Indian guidance says whether an embedding clears that bar.',
  },
  {
    id: 'human-safety-review',
    label: 'Route to a human reviewer',
    detail: 'Show flagged conversations to a trust-and-safety reviewer.',
    requires: 'safety-review',
    store: 'transcript-store',
    foreignProcessor: true,
  },
  {
    id: 'train-base-model',
    label: 'Add to the training corpus',
    detail: 'Include the transcript in the mix for the next base model run.',
    requires: 'model-improvement',
    store: 'model-weights',
    foreignProcessor: true,
  },
  {
    id: 'finetune-account-checkpoint',
    label: 'Fine-tune on this account',
    detail: "Train a per-tenant adapter on the account's own conversations.",
    requires: 'model-improvement',
    store: 'model-weights',
    foreignProcessor: false,
  },
  {
    id: 'seed-other-product',
    label: 'Seed the other product',
    detail: 'Feed the same transcripts into the recommender for a different product.',
    requires: 'cross-product-personalisation',
    store: 'transcript-store',
    foreignProcessor: false,
  },
  {
    id: 'cache-generations',
    label: 'Cache the generations',
    detail: 'Keep model outputs keyed to the user so repeat prompts are cheap.',
    requires: 'service-delivery',
    store: 'output-cache',
    foreignProcessor: false,
    unsettled:
      'A cached generation can restate what the user typed. Section 8(7) says erase "personal data": does a generated string that reproduces it count as the same personal data, or as new data about the same person?',
  },
  {
    id: 'select-ads',
    label: 'Select the ads',
    detail: 'Build an interest profile from the conversation and target advertising.',
    requires: 'advertising',
    store: 'transcript-store',
    foreignProcessor: false,
  },
];

export function use(id: UseId): DownstreamUse {
  const found = USES.find((u) => u.id === id);
  if (!found) throw new Error(`unknown use: ${id}`);
  return found;
}
