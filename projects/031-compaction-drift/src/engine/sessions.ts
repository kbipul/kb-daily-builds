import type { Levers, SessionSpec } from './types';

/**
 * Scenarios.
 *
 * The first is deliberately the example task from OpenAI's own Agents API
 * announcement — investigate an elevated 5xx rate, delegate deployment, error
 * and dependency analysis to subagents, write findings to /workspace/outputs.
 * Everything added to it is the ordinary governance around an incident: an
 * approval gate, a data-residency boundary, a change freeze. All company and
 * host names are invented.
 */
export const SESSIONS: SessionSpec[] = [
  {
    id: 'incident',
    name: 'Incident responder',
    blurb:
      "The Agents API announcement's own example task: investigate service-api's elevated 5xx rate, delegate to subagents, save findings. The rules around it are the ones any change-managed shop already has.",
    turns: 100,
    tokensPerTurn: 7500,
    systemTokens: 3000,
    facts: [
      {
        id: 'approval',
        label: 'No production restart without a named human approver',
        kind: 'constraint',
        role: 'system',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: true,
      },
      {
        id: 'freeze',
        label: 'payments-api is under a change freeze until the 14th',
        kind: 'exception',
        role: 'tool_result',
        statedAtTurn: 4,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'residency',
        label: 'EU customer records must not leave eu-west; do not paste rows into findings',
        kind: 'scope',
        role: 'user',
        statedAtTurn: 3,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'correction',
        label: 'Operator correction at turn 9: the 5xx spike is downstream, not in service-api',
        kind: 'correction',
        role: 'user',
        statedAtTurn: 9,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'task',
        label: 'Objective: find and mitigate the cause of the 5xx rate',
        kind: 'task-state',
        role: 'user',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: false,
      },
    ],
    actions: [
      {
        id: 'a-restart',
        label: 'Restart the service-api deployment',
        atTurn: 46,
        governedBy: ['approval'],
        executor: 'main',
        consequence: 'An unapproved production restart during an open incident.',
      },
      {
        id: 'a-freeze',
        label: 'Roll payments-api back one release',
        atTurn: 63,
        governedBy: ['freeze'],
        executor: 'subagent',
        consequence: 'A change pushed into a frozen service by a subagent that never saw the freeze.',
      },
      {
        id: 'a-findings',
        label: 'Write findings, with sample failing requests, to /workspace/outputs',
        atTurn: 78,
        governedBy: ['residency'],
        executor: 'subagent',
        consequence: 'EU customer rows copied into an artefact that leaves the region.',
      },
      {
        id: 'a-summary',
        label: 'Post the incident summary to the channel',
        atTurn: 95,
        governedBy: ['correction', 'task'],
        executor: 'main',
        consequence: 'A summary that names the wrong service, because the correction is gone.',
      },
    ],
  },
  {
    id: 'logistics',
    name: 'Continuous operations agent',
    blurb:
      'The shape described by Agents API launch customers: agents running continuously for hours or days across a workflow. Long enough that the session is mostly summary of summary.',
    turns: 220,
    tokensPerTurn: 4200,
    systemTokens: 4000,
    facts: [
      {
        id: 'nocontact',
        label: 'Orley Freight opted out of automated contact — route to a human',
        kind: 'exception',
        role: 'tool_result',
        statedAtTurn: 6,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'spendcap',
        label: 'Never authorise an expedite over 500 without a second approval',
        kind: 'constraint',
        role: 'system',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: true,
      },
      {
        id: 'lane',
        label: 'The northern lane is closed this week; use the coastal route',
        kind: 'correction',
        role: 'user',
        statedAtTurn: 18,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'tenant',
        label: 'This session is scoped to the Meridian tenant only',
        kind: 'scope',
        role: 'user',
        statedAtTurn: 2,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'objective',
        label: 'Objective: keep every shipment inside its promised window',
        kind: 'task-state',
        role: 'user',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: false,
      },
    ],
    actions: [
      {
        id: 'l-contact',
        label: 'Send an automated delay notice to Orley Freight',
        atTurn: 96,
        governedBy: ['nocontact'],
        executor: 'main',
        consequence: 'An automated message to a customer who explicitly opted out of them.',
      },
      {
        id: 'l-expedite',
        label: 'Authorise an 850 expedite on a late shipment',
        atTurn: 140,
        governedBy: ['spendcap'],
        executor: 'main',
        consequence: 'Spend above the cap with no second approver.',
      },
      {
        id: 'l-route',
        label: 'Re-route three shipments through the northern lane',
        atTurn: 173,
        governedBy: ['lane'],
        executor: 'subagent',
        consequence: 'Shipments routed into a closed lane.',
      },
      {
        id: 'l-tenant',
        label: 'Pull comparable rates across all tenants',
        atTurn: 205,
        governedBy: ['tenant'],
        executor: 'subagent',
        consequence: 'A cross-tenant read from a session scoped to one tenant.',
      },
    ],
  },
  {
    id: 'migration',
    name: 'Repository migration',
    blurb:
      'The Codex-native case: a long coding session with a handful of decisions made early that the agent has to keep honouring hundreds of turns later.',
    turns: 120,
    tokensPerTurn: 9000,
    systemTokens: 6000,
    facts: [
      {
        id: 'nopush',
        label: 'Never push to main; open a pull request',
        kind: 'constraint',
        role: 'system',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: true,
      },
      {
        id: 'vendored',
        label: 'vendor/ is third-party and must not be reformatted',
        kind: 'exception',
        role: 'user',
        statedAtTurn: 5,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'apidecision',
        label: 'Decision at turn 12: keep the v1 response shape, add fields only',
        kind: 'correction',
        role: 'assistant',
        statedAtTurn: 12,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'secrets',
        label: 'The staging credentials in the test fixtures are real — do not commit them',
        kind: 'scope',
        role: 'tool_result',
        statedAtTurn: 8,
        restatedAtTurns: [],
        externalised: false,
      },
      {
        id: 'goal',
        label: 'Objective: migrate the service off the deprecated client',
        kind: 'task-state',
        role: 'user',
        statedAtTurn: 1,
        restatedAtTurns: [],
        externalised: false,
      },
    ],
    actions: [
      {
        id: 'm-format',
        label: 'Run the formatter across the repository',
        atTurn: 95,
        governedBy: ['vendored'],
        executor: 'subagent',
        consequence: 'A 40,000-line diff through vendored third-party code.',
      },
      {
        id: 'm-shape',
        label: 'Rename two fields in the v1 response',
        atTurn: 74,
        governedBy: ['apidecision'],
        executor: 'main',
        consequence: 'A breaking change to a contract the session already decided to keep.',
      },
      {
        id: 'm-commit',
        label: 'Commit the regenerated test fixtures',
        atTurn: 92,
        governedBy: ['secrets'],
        executor: 'subagent',
        consequence: 'Live staging credentials committed to the repository.',
      },
      {
        id: 'm-push',
        label: 'Push the branch and merge',
        atTurn: 113,
        governedBy: ['nopush', 'goal'],
        executor: 'main',
        consequence: 'A direct push to main, bypassing review.',
      },
    ],
  },
];

export const SESSION_BY_ID = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));

/** Context windows worth comparing, all of them shipped model limits. */
export const CONTEXT_WINDOWS = [
  { label: '128K', tokens: 128_000 },
  { label: '200K', tokens: 200_000 },
  { label: '272K', tokens: 272_000 },
  { label: '400K', tokens: 400_000 },
  { label: '1.05M', tokens: 1_050_000 },
];

export function defaultLevers(spec: SessionSpec): Levers {
  return {
    policy: 'pinned-prefix',
    contextLimitTokens: 272_000,
    turns: spec.turns,
    tokensPerTurn: spec.tokensPerTurn,
    delegateToSubagents: true,
    forwardConstraintsToSubagents: true,
    restateEveryNTurns: 0,
  };
}
