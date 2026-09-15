import type { EvidenceSourceId, ScopeId } from './types';

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  held: EvidenceSourceId[];
  scope: ScopeId;
}

/**
 * Access bundles that correspond to real positions, not to points on a scale.
 * "Everything a customer can buy" is the one that matters: it is the ceiling,
 * and the ceiling is lower than people expect.
 */
export const PRESETS: Preset[] = [
  {
    id: 'reader',
    label: 'Reader',
    blurb: 'A chat window and the published document. Where most readers of the coverage are standing.',
    held: ['endpoint'],
    scope: 'mai-direct',
  },
  {
    id: 'tenant',
    label: 'Enterprise tenant',
    blurb: 'You bought seats, you wrote a system prompt, you have not built a harness.',
    held: ['endpoint', 'config', 'attestation'],
    scope: 'mixed-surface',
  },
  {
    id: 'platform',
    label: 'Agent platform team',
    blurb: 'You run the harness, you hold the traces, you have people who can attack it.',
    held: ['endpoint', 'redteam', 'traces', 'config'],
    scope: 'mai-operator',
  },
  {
    id: 'ceiling',
    label: 'Everything a customer can buy',
    blurb: 'Every access a contract can get you. Independent-evaluator access is not on that list.',
    held: ['endpoint', 'redteam', 'traces', 'config', 'telemetry', 'attestation'],
    scope: 'mai-operator',
  },
  {
    id: 'evaluator',
    label: 'Independent evaluator',
    blurb:
      'Employee-level access, raw reasoning, the ability to run controlled comparisons. The commitment Anthropic made on 12 Sep 2026 and OpenAI matched.',
    held: ['endpoint', 'redteam', 'traces', 'config', 'cot', 'telemetry', 'evaluator'],
    scope: 'mai-direct',
  },
  {
    id: 'foundry',
    label: 'Third-party model on Azure',
    blurb: 'A capable team, pointed at a model this document does not govern.',
    held: ['endpoint', 'redteam', 'traces', 'config'],
    scope: 'third-party-hosted',
  },
];

export const DEFAULT_PRESET = 'tenant';
