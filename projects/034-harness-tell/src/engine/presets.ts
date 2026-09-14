import type { Env } from './types';

/**
 * Environment presets. Only the variables that matter to detection are
 * modelled, plus a few ordinary ones so the panel does not look empty. Where a
 * real value is shown it comes from a cited source; otherwise the value is `1`
 * or an obviously synthetic token, because for a `*` pattern the value never
 * matters — only that it is non-empty.
 */
export interface Preset {
  id: string;
  label: string;
  /** Who is actually typing. */
  who: 'human' | 'agent';
  blurb: string;
  env: Env;
  source?: string;
}

const BASE: Env = { HOME: '/Users/dev', SHELL: '/bin/zsh', LANG: 'en_US.UTF-8', TERM: 'xterm-256color' };

export const PRESETS: Preset[] = [
  {
    id: 'terminal',
    label: 'macOS Terminal, human',
    who: 'human',
    blurb: 'A person in Apple Terminal running a script. Nothing agent-like is set.',
    env: { ...BASE, TERM_PROGRAM: 'Apple_Terminal' },
    source: 'TERM_PROGRAM value from the issue #4860 comparison table',
  },
  {
    id: 'warp',
    label: 'Warp terminal, human',
    who: 'human',
    blurb: 'Same person, same script, but the terminal app is Warp. No agent is running.',
    env: {
      ...BASE,
      TERM_PROGRAM: 'WarpTerminal',
      TERM_PROGRAM_VERSION: 'v0.2026.09.02.08.27.stable_01',
      WARP_IS_LOCAL_SHELL_SESSION: '1',
      WARP_HONOR_PS1: '1',
    },
    source: 'env dump quoted in issue huggingface_hub#4860 (plain, human-driven Warp shell)',
  },
  {
    id: 'cursor-human',
    label: 'Cursor editor terminal, human',
    who: 'human',
    blurb: 'A person typing in the integrated terminal of the Cursor editor. The AI panel is closed.',
    env: { ...BASE, TERM_PROGRAM: 'vscode', CURSOR_TRACE_ID: 'c0ffee-synthetic' },
    source: 'CURSOR_TRACE_ID per the registry; the registry\'s own comment says child processes of the editor terminal inherit it',
  },
  {
    id: 'zed-human',
    label: 'Zed integrated terminal, human',
    who: 'human',
    blurb: 'A person in Zed\'s built-in terminal.',
    env: { ...BASE, ZED_TERM: 'true' },
  },
  {
    id: 'replit-human',
    label: 'Replit workspace shell, human',
    who: 'human',
    blurb: 'A person in a Replit workspace shell. REPL_ID is set for every workspace.',
    env: { ...BASE, REPL_ID: 'a1b2c3-synthetic' },
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    who: 'agent',
    blurb: 'Claude Code running a shell command.',
    env: { ...BASE, TERM_PROGRAM: 'Apple_Terminal', CLAUDECODE: '1' },
    source: 'CLAUDECODE per the registry and huggingface_hub\'s own test fixture',
  },
  {
    id: 'claude-in-cursor',
    label: 'Claude Code inside Cursor',
    who: 'agent',
    blurb: 'Claude Code launched from the Cursor editor terminal — both markers present.',
    env: { ...BASE, TERM_PROGRAM: 'vscode', CURSOR_TRACE_ID: 'c0ffee-synthetic', CLAUDECODE: '1' },
  },
  {
    id: 'gemini-in-warp',
    label: 'Gemini CLI inside Warp',
    who: 'agent',
    blurb: 'Gemini CLI launched from a Warp shell — agent marker plus terminal identity.',
    env: { ...BASE, TERM_PROGRAM: 'WarpTerminal', GEMINI_CLI: '1' },
  },
  {
    id: 'codex-ci',
    label: 'Codex in CI',
    who: 'agent',
    blurb: 'OpenAI Codex running non-interactively in a pipeline.',
    env: { ...BASE, CI: 'true', CODEX_CI: '1' },
  },
  {
    id: 'copilot-actions',
    label: 'GitHub Actions + Copilot',
    who: 'agent',
    blurb: 'A GitHub Actions job where the Copilot coding agent has exported its token.',
    env: { ...BASE, CI: 'true', GITHUB_ACTIONS: 'true', COPILOT_GITHUB_TOKEN: 'redacted-synthetic' },
  },
  {
    id: 'cowork',
    label: 'Cowork',
    who: 'agent',
    blurb: 'Anthropic\'s Cowork, which is built on Claude Code — both markers set.',
    env: { ...BASE, CLAUDECODE: '1', CLAUDE_CODE_IS_COWORK: '1' },
  },
  {
    id: 'kiro',
    label: 'Kiro (AWS IDE)',
    who: 'agent',
    blurb: 'Kiro driving a command. Its marker is the generic AGENT_CONTEXT_OUT.',
    env: { ...BASE, AGENT_CONTEXT_OUT: '/tmp/ctx-synthetic' },
  },
  {
    id: 'agent-var',
    label: 'Custom bot with AGENT=build-bot',
    who: 'agent',
    blurb: 'An in-house automation that exports the standard var with a name the registry does not know.',
    env: { ...BASE, AGENT: 'build-bot' },
  },
  {
    id: 'agent-devin',
    label: 'AGENT=devin with CLAUDECODE set',
    who: 'agent',
    blurb: 'A standard var naming Devin while a Claude Code marker is also present — the two eras disagree on who this is.',
    env: { ...BASE, AGENT: 'devin', CLAUDECODE: '1' },
  },
];

export function preset(id: string): Preset {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown preset ${id}`);
  return p;
}
