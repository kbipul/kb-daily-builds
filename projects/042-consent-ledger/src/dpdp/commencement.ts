import type { ProvisionId } from './provisions';

/**
 * Most write-ups give "November 2026" and "May 2027" as if they were printed
 * in the Gazette. They are not. The commencement notification states periods —
 * "one year" and "eighteen months" from publication — and does not say how the
 * period is counted. Every date below is arithmetic on a printed masthead date,
 * and is labelled as such.
 */

/** Printed masthead date of Gazette issue No. 757, carrying G.S.R. 843(E). */
export const PUBLICATION = '2025-11-13';

/**
 * The eGazette record for the same issue carries a code embedding 14112025.
 * Taking that as the publication date moves every computed date by one day.
 */
export const ALTERNATE_PUBLICATION = '2025-11-14';

export type GroupId = 'one-year' | 'eighteen-months';

export interface Group {
  id: GroupId;
  /** The words the notification actually uses. */
  period: string;
  computed: string;
  /** Same arithmetic from the alternate publication date. */
  computedAlternate: string;
  /** Plain description of what arrives in this group. */
  brings: string;
  clause: ProvisionId;
}

export const GROUPS: Group[] = [
  {
    id: 'one-year',
    period: 'one year from the date of publication of this gazette',
    computed: '2026-11-13',
    computedAlternate: '2026-11-14',
    brings:
      'Section 6(9) — Consent Manager registration with the Board — and section 27(1)(d). Not the consent duties themselves.',
    clause: 'gsr843_b',
  },
  {
    id: 'eighteen-months',
    period: 'eighteen months from the date of publication of this gazette',
    computed: '2027-05-13',
    computedAlternate: '2027-05-14',
    brings:
      'Sections 3 to 5, section 6(1) to (8) and (10), and sections 7 to 17. This is the group carrying every consent, purpose-limitation and erasure duty this app models.',
    clause: 'gsr843_c',
  },
];

const DAY_MS = 86_400_000;

function utcDays(from: Date, toIso: string): number {
  const to = Date.parse(`${toIso}T00:00:00Z`);
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((to - start) / DAY_MS);
}

export interface Countdown {
  group: Group;
  daysAway: number;
  /** Days away if the alternate publication date is the right one. */
  daysAwayAlternate: number;
  arrived: boolean;
}

export function countdown(now: Date, group: Group): Countdown {
  const daysAway = utcDays(now, group.computed);
  return {
    group,
    daysAway,
    daysAwayAlternate: utcDays(now, group.computedAlternate),
    arrived: daysAway <= 0,
  };
}

export function countdowns(now: Date): Countdown[] {
  return GROUPS.map((g) => countdown(now, g));
}

/**
 * What a reader should take away about today specifically: none of the duties
 * this app models are in force yet, and saying otherwise is the common error.
 */
export function inForceToday(now: Date): boolean {
  return countdown(now, GROUPS[1]).arrived;
}
