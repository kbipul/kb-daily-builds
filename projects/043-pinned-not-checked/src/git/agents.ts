export type AgentId = 'claude-code' | 'codex' | 'github-copilot' | 'gemini-cli';

/** The two disclosed install shapes. */
export type InstallShape = 'clone-then-checkout-pin' | 'clone-fetch-checkout-fetch-head';

export type PatchState = 'patched' | 'no-patch' | 'deprecated' | 'contested';

export interface AgentProfile {
  id: AgentId;
  label: string;
  vendor: string;
  shape: InstallShape;
  patchState: PatchState;
  /** Quoted or closely paraphrased from the disclosure's mitigation section. */
  patchNote: string;
  /** null where the disclosure does not say. */
  autoUpdateIsDefault: boolean | null;
  autoUpdateNote: string;
}

export const AGENTS: AgentProfile[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    vendor: 'Anthropic',
    shape: 'clone-then-checkout-pin',
    patchState: 'patched',
    patchNote: 'Anthropic patched it after our disclosure, in 2.1.179. Timeline entry: 2026-06-17.',
    autoUpdateIsDefault: true,
    autoUpdateNote: 'Background plugin auto-update is the default, so the swap reaches already-installed plugins with no user action.',
  },
  {
    id: 'codex',
    label: 'Codex',
    vendor: 'OpenAI',
    shape: 'clone-then-checkout-pin',
    patchState: 'patched',
    patchNote: 'OpenAI patched it after our disclosure, in 0.146.0. Timeline entry: Codex 0.146.0 verified fixed 2026-08-12.',
    autoUpdateIsDefault: true,
    autoUpdateNote: 'Background plugin auto-update is the default, so the swap reaches already-installed plugins with no user action.',
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    vendor: 'Microsoft',
    shape: 'clone-then-checkout-pin',
    patchState: 'contested',
    patchNote:
      'The disclosure says Microsoft "has not shipped a fix, so users have no patch". Secondary coverage the same week reports GitHub asserting a mitigation exists and the researchers disputing its scope. Both readings are recorded here; neither was verified against a shipped build.',
    autoUpdateIsDefault: null,
    autoUpdateNote: 'The disclosure names Claude Code and Codex as auto-updating by default and does not say either way for this agent.',
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    vendor: 'Google',
    shape: 'clone-fetch-checkout-fetch-head',
    patchState: 'deprecated',
    patchNote:
      'Google has deprecated the Gemini CLI and will not patch it, so every install stays vulnerable for good. Users are directed to Antigravity, which has no marketplace plugin SHA pinning to bypass. Timeline entry: 2026-08-04.',
    autoUpdateIsDefault: null,
    autoUpdateNote: 'The disclosure names Claude Code and Codex as auto-updating by default and does not say either way for this agent.',
  },
];

export function getAgent(id: AgentId): AgentProfile {
  const a = AGENTS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown agent: ${id}`);
  return a;
}

export const PATCH_LABEL: Record<PatchState, string> = {
  patched: 'Patched',
  'no-patch': 'No patch',
  deprecated: 'Deprecated, will not be patched',
  contested: 'Contested',
};
