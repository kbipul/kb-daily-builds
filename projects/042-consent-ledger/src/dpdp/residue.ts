import type { StoreId } from './uses';

/**
 * The part the consent UI never shows.
 *
 * Section 6(6) says cease processing. Section 8(7) says erase. Those are two
 * different asks, and a running system answers them with different levels of
 * confidence depending on which store the data landed in. This table is the
 * engineering answer, not the legal one: what a delete request can actually
 * reach.
 */

export type Reach =
  | 'erased'
  | 'erasable-if-instrumented'
  | 'contractual-only'
  | 'no-erase-primitive';

export interface ResidueRow {
  store: StoreId;
  label: string;
  reach: Reach;
  /** What a delete actually does to this store. */
  effect: string;
  /** What has to already be true for the delete to work at all. */
  precondition?: string;
}

export const RESIDUE: ResidueRow[] = [
  {
    store: 'none',
    label: 'Request/response in flight',
    reach: 'erased',
    effect: 'Nothing was written. Ceasing is the whole of the remedy.',
  },
  {
    store: 'transcript-store',
    label: 'Transcript store',
    reach: 'erased',
    effect: 'Row-level delete by principal id. This is the case the law was drafted imagining.',
  },
  {
    store: 'output-cache',
    label: 'Generation cache',
    reach: 'erasable-if-instrumented',
    effect: 'Evictable, but only for entries whose cache key still carries the principal id.',
    precondition: 'The cache key retained the principal id rather than hashing the prompt alone.',
  },
  {
    store: 'vector-index',
    label: 'Vector index',
    reach: 'erasable-if-instrumented',
    effect: 'Vectors can be deleted by id. Vectors written without a back-reference cannot be found.',
    precondition: 'Each vector kept a reverse mapping to the principal it came from.',
  },
  {
    store: 'processor-copy',
    label: "Processor's copy",
    reach: 'contractual-only',
    effect:
      'Section 8(7)(b) requires the fiduciary to cause the processor to erase. Whether it happened is a contract fact, not something the fiduciary can verify from its own systems.',
  },
  {
    store: 'model-weights',
    label: 'Model weights / adapter',
    reach: 'no-erase-primitive',
    effect:
      'There is no delete. Retraining without the record is the only operation that removes it, and machine unlearning has no accepted verification.',
  },
];

export function residueFor(store: StoreId): ResidueRow {
  const row = RESIDUE.find((r) => r.store === store);
  if (!row) throw new Error(`no residue row for store: ${store}`);
  return row;
}

const ORDER: Record<Reach, number> = {
  erased: 0,
  'erasable-if-instrumented': 1,
  'contractual-only': 2,
  'no-erase-primitive': 3,
};

/**
 * Given the stores a pipeline touched, the worst reach among them — because a
 * withdrawal is only honoured as well as its weakest store.
 */
export function weakestReach(stores: StoreId[]): Reach {
  if (stores.length === 0) return 'erased';
  return stores
    .map(residueFor)
    .reduce((worst, r) => (ORDER[r.reach] > ORDER[worst.reach] ? r : worst)).reach;
}

/** Stores a delete request cannot fully clear on its own. */
export function unreachableStores(stores: StoreId[]): ResidueRow[] {
  return stores.map(residueFor).filter((r) => ORDER[r.reach] >= 2);
}
