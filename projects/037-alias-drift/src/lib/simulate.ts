import { BINDING_KINDS } from './corpus';
import type { IdentifierRow, SimulationStep } from './types';

const NO_NOTICE_KINDS = new Set(['alias-repoint', 'zero-notice-reroute']);

/**
 * Build the three-beat "Deprecation Day" narrative for one identifier row:
 * steady state -> notice (or its absence) -> what actually happens.
 *
 * Pure function of the row's data — every word traces back to
 * BINDING_KINDS[row.bindingKind] or the row's own notice/postEventBehavior
 * fields, so the simulator can never say something the corpus doesn't back.
 */
export function simulate(row: IdentifierRow): SimulationStep[] {
  const kind = BINDING_KINDS[row.bindingKind];

  const noticeTone = NO_NOTICE_KINDS.has(row.bindingKind) ? 'warn' : 'neutral';
  const eventTone = row.bindingKind === 'frozen-then-fails' ? 'fail' : 'warn';

  return [
    {
      t: 'Today',
      label: 'Steady state',
      detail: kind.steadyState,
      tone: 'neutral',
    },
    {
      t: 'Notice',
      label: NO_NOTICE_KINDS.has(row.bindingKind) ? 'What warning you get' : 'The warning window',
      detail: row.notice,
      tone: noticeTone,
    },
    {
      t: 'Deprecation day',
      label: 'What actually happens',
      detail: `${row.postEventBehavior} ${kind.onEvent}`,
      tone: eventTone,
    },
  ];
}

/** True if a caller could reasonably detect the change from inside their own
 * application (an error, a version banner) without instrumenting the
 * response content itself. Used to badge rows honestly in the UI. */
export function isSelfAnnouncing(row: IdentifierRow): boolean {
  return row.bindingKind === 'frozen-then-fails' || row.bindingKind === 'auto-upgrade-notice';
}
