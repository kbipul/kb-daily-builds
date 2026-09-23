import { CATALOGUE, type Action, type ActionId } from './action';
import { digest } from './digest';
import type { Profile } from './profiles';

/**
 * The two routes the Loopjacking paper names.
 *
 *  - 'representation': B is already encoded at approval time, but omitted or
 *    misrepresented by the card the reviewer reads.
 *  - 'post-approval': the reviewer sees the correct A, and mutable workflow
 *    state later replaces it with B.
 *  - 'none': the workflow is not under attack. Included so the same pipeline
 *    produces the honest trace too.
 */
export type Route = 'none' | 'representation' | 'post-approval';

/** What the approval card put in front of the reviewer. */
export type Card = {
  fields: { name: string; value: string }[];
  /** Fields of the proposed action the card did not render at all. */
  omitted: string[];
};

export type ApprovalRecord = {
  /** How this record refers to what was approved. */
  binding: Profile['binding'];
  /** Present for 'value' and 'bound'. */
  snapshot?: Action;
  /** Present for 'bound'. */
  digest?: string;
  /** Always present: the id the record is filed against. */
  actionId: string;
};

export type Stage = {
  name: string;
  detail: string;
};

export type Outcome =
  /** The action that ran is the action the reviewer understood. */
  | { kind: 'faithful'; executed: Action }
  /** Something else ran, and the reviewer had no way to see it. */
  | { kind: 'loopjacked'; executed: Action; route: Route; why: string }
  /** The binding check fired and nothing ran. */
  | { kind: 'aborted'; why: string };

export type Trace = {
  proposed: Action;
  card: Card;
  record: ApprovalRecord;
  /** Workflow state as the executor found it. */
  stateAtExecute: Action;
  stages: Stage[];
  outcome: Outcome;
};

const FIELD_ORDER = ['label', 'tool', 'args', 'reversible'] as const;

function renderField(a: Action, name: (typeof FIELD_ORDER)[number]): string {
  switch (name) {
    case 'label':
      return a.label;
    case 'tool':
      return a.tool;
    case 'args':
      return Object.entries(a.args)
        .map(([k, v]) => k + ': ' + v)
        .join(', ');
    case 'reversible':
      return a.reversible ? 'reversible' : 'NOT reversible';
  }
}

export function buildCard(a: Action, profile: Profile): Card {
  const fields = profile.cardFields.map((name) => ({
    name,
    value: renderField(a, name),
  }));
  const omitted = FIELD_ORDER.filter((f) => !profile.cardFields.includes(f));
  return { fields, omitted };
}

/**
 * Run one approval-gated turn and return the full trace.
 *
 * `shown` is the action the reviewer is meant to be approving. `substitute` is
 * the action an attacker wants executed instead. Which one is proposed, and
 * when the swap happens, is what the route decides.
 */
export function runTurn(opts: {
  shown: ActionId;
  substitute: ActionId;
  route: Route;
  profile: Profile;
}): Trace {
  const { route, profile } = opts;
  const benign = CATALOGUE[opts.shown];
  const hostile = CATALOGUE[opts.substitute];
  const stages: Stage[] = [];

  // Stage 1 — propose. On the representation route the consequential action is
  // ALREADY the proposal; nothing changes later.
  const proposed = route === 'representation' ? hostile : benign;
  stages.push({
    name: 'propose',
    detail:
      route === 'representation'
        ? 'Agent proposes the consequential action. It is encoded in args from the start.'
        : 'Agent proposes the benign action.',
  });

  // Stage 2 — render the card from the profile's field projection.
  const card = buildCard(proposed, profile);
  stages.push({
    name: 'render',
    detail:
      'Card renders ' +
      profile.cardFields.join(', ') +
      (card.omitted.length ? '. Omits ' + card.omitted.join(', ') + '.' : '.'),
  });

  // Stage 3 — the human approves. What the record commits to is the profile's
  // business, and it is the whole game.
  const record: ApprovalRecord = { binding: profile.binding, actionId: proposed.id };
  if (profile.binding === 'value' || profile.binding === 'bound') {
    record.snapshot = structuredClone(proposed);
  }
  if (profile.binding === 'bound') {
    record.digest = digest(proposed);
  }
  stages.push({
    name: 'approve',
    detail:
      profile.binding === 'reference'
        ? 'Approval filed against id "' + proposed.id + '". No copy of the action is kept.'
        : profile.binding === 'value'
          ? 'Approval keeps a copy of the action as it stood.'
          : 'Approval keeps a copy and digest ' + record.digest + '.',
  });

  // Stage 3b — mutable workflow state. On the post-approval route the state the
  // executor will read is rewritten here, after the human has already clicked.
  const stateAtExecute = route === 'post-approval' ? hostile : proposed;
  if (route === 'post-approval') {
    stages.push({
      name: 'mutate',
      detail: 'Workflow state for this turn is rewritten after approval, before execution.',
    });
  }

  // Stage 4 — execute.
  //  - 'reference' re-resolves from live state and trusts it.
  //  - 'value' executes the copy it kept, ignoring live state.
  //  - 'bound' re-resolves from live state too, then re-checks the digest. It
  //    does not avoid re-resolution; it verifies it.
  const resolved: Action =
    profile.binding === 'value' ? (record.snapshot as Action) : stateAtExecute;

  if (profile.binding === 'bound') {
    const now = digest(resolved);
    if (now !== record.digest) {
      stages.push({
        name: 'execute',
        detail: 'Digest re-check failed: ' + record.digest + ' ≠ ' + now + '. Nothing ran.',
      });
      return {
        proposed,
        card,
        record,
        stateAtExecute,
        stages,
        outcome: {
          kind: 'aborted',
          why: 'The approval was bound to a digest of the whole action and execution re-checked it.',
        },
      };
    }
  }

  stages.push({ name: 'execute', detail: 'Executor calls ' + resolved.tool + '.' });

  // Did the reviewer have the information to tell? Only the rendered fields
  // were ever in front of them.
  const understood = renderCardValues(benign, profile);
  const actual = renderCardValues(resolved, profile);
  const cardWouldHaveShownIt = understood !== actual;

  if (resolved.id === benign.id) {
    return { proposed, card, record, stateAtExecute, stages, outcome: { kind: 'faithful', executed: resolved } };
  }

  return {
    proposed,
    card,
    record,
    stateAtExecute,
    stages,
    outcome: {
      kind: 'loopjacked',
      executed: resolved,
      route,
      why: cardWouldHaveShownIt
        ? 'The card did carry the difference, and it was rendered before the swap.'
        : 'Every field the card rendered is identical for both actions.',
    },
  };
}

function renderCardValues(a: Action, profile: Profile): string {
  return profile.cardFields.map((f) => renderField(a, f)).join('␟');
}
