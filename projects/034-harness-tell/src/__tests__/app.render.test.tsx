// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { PRESETS } from '../engine/presets';
import { ENTRY_POINTS } from '../engine/entryPoints';
import { SNAPSHOT_REGISTRY, toWireJson } from '../engine/registry';

afterEach(cleanup);

const badge = () => screen.getByLabelText('Verdict').querySelector('.badge')!.textContent;
const ua = () => screen.getByLabelText('User-Agent header').textContent ?? '';
const toggle = (label: RegExp) => fireEvent.click(screen.getByLabelText(label));

describe('App', () => {
  it('mounts, states the thesis and cites the signal', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /harness tell/i })).toBeTruthy();
    expect(document.body.textContent).toContain('Sometimes it is just your terminal');
    expect(document.body.textContent).toContain('issue #4860');
  });

  it('opens on the Warp preset and reports agent/warp from a terminal identity', () => {
    render(<App />);
    expect(badge()).toBe('agent/warp');
    expect(document.body.textContent).toContain('a terminal / editor identity, not an agent marker');
    expect(ua()).toContain('agent/warp');
  });

  it('offers every preset and every entry point as a pressable button', () => {
    render(<App />);
    for (const p of PRESETS) expect(screen.getByRole('button', { name: p.label })).toBeTruthy();
    for (const e of ENTRY_POINTS) expect(screen.getByRole('button', { name: e.label })).toBeTruthy();
  });

  it('Apple Terminal reports nothing; Claude Code reports agent/claude-code', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'macOS Terminal, human' }));
    expect(badge()).toBe('no agent reported');
    expect(ua()).not.toContain('agent/');
    fireEvent.click(screen.getByRole('button', { name: 'Claude Code' }));
    expect(badge()).toBe('agent/claude-code');
    expect(document.body.textContent).toContain('an agent marker');
  });

  it('the timeline shows the registry GET before the model request', () => {
    render(<App />);
    const items = within(screen.getByLabelText('Request timeline')).getAllByRole('listitem');
    const titles = items.map((li) => li.textContent ?? '');
    const reg = titles.findIndex((t) => t.includes('GET /api/agent-harnesses'));
    const req = titles.findIndex((t) => t.includes('HEAD https://huggingface.co/'));
    expect(reg).toBeGreaterThan(-1);
    expect(req).toBeGreaterThan(reg);
  });

  it('HF_HUB_DISABLE_TELEMETRY removes the agent segment in the SDK path', () => {
    render(<App />);
    toggle(/HF_HUB_DISABLE_TELEMETRY/);
    expect(badge()).toBe('nothing read');
    expect(ua()).not.toContain('agent/');
    expect(document.body.textContent).toContain('never calls the detector');
  });

  it('…but the CLI still resolves the registry with telemetry disabled', () => {
    render(<App />);
    toggle(/HF_HUB_DISABLE_TELEMETRY/);
    fireEvent.click(screen.getByRole('button', { name: 'hf download (CLI)' }));
    expect(badge()).toBe('agent/warp');
    expect(ua()).not.toContain('agent/');
    expect(document.body.textContent).toContain('A GET /api/agent-harnesses left the process');
    expect(document.body.textContent).toContain('CLI output mode = agent');
  });

  it('HF_HUB_OFFLINE keeps the header from leaving and marks it unsent', () => {
    render(<App />);
    toggle(/HF_HUB_OFFLINE/);
    expect(document.body.textContent).toContain('OfflineModeIsEnabled');
    expect(ua()).toContain('built, never sent');
  });

  it('a client pinned below 1.9 reads nothing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '0.36 — before detection' }));
    expect(badge()).toBe('nothing read');
    expect(document.body.textContent).toContain('predates agent detection');
  });

  it('whisperx forces the 0.x client because of its <1.0.0 pin', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'whisperx' }));
    expect(badge()).toBe('nothing read');
    expect(document.body.textContent).toContain('huggingface-hub<1.0.0');
  });

  it('shows the era disagreement for AGENT=devin + CLAUDECODE', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'AGENT=devin with CLAUDECODE set' }));
    expect(badge()).toBe('agent/claude-code');
    expect(document.body.textContent).toContain('1.10–1.18');
    expect(document.body.textContent).toContain('agent/devin');
  });

  it('pasting an environment drives the verdict', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Environment to analyse'), { target: { value: 'HOME=/x\nCOPILOT_GITHUB_TOKEN=ghu_secret\nZED_TERM=true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this environment' }));
    // github-copilot sits above zed in the registry, so the token wins on priority…
    expect(badge()).toBe('agent/github-copilot');
    // …and its value is blanked everywhere except the textarea the visitor typed into.
    const chips = screen.getByLabelText('Watched variables').textContent ?? '';
    expect(chips).toContain('COPILOT_GITHUB_TOKEN=••••');
    expect(chips).not.toContain('ghu_secret');
    expect(document.body.textContent).toContain('3 variable(s) read');
  });

  it('pasting a registry without warp changes the Warp verdict and reports the diff', () => {
    render(<App />);
    const wire = JSON.parse(toWireJson(SNAPSHOT_REGISTRY));
    delete wire.harnesses.warp;
    fireEvent.change(screen.getByLabelText('Registry JSON'), { target: { value: JSON.stringify(wire) } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this registry' }));
    expect(badge()).toBe('no agent reported');
    expect(document.body.textContent).toContain('removed warp');
    fireEvent.click(screen.getByRole('button', { name: 'Back to snapshot' }));
    expect(badge()).toBe('agent/warp');
  });

  it('rejects a bad registry paste with a message', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Registry JSON'), { target: { value: '{"nope":1}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use this registry' }));
    expect(document.body.textContent).toContain('Expected "harnesses"');
  });

  it('renders all 26 registry rows and marks the reported one', () => {
    render(<App />);
    const rows = within(screen.getByLabelText('Harness registry')).getAllByRole('row');
    expect(rows.length).toBe(27); // header + 26
    expect(screen.getByLabelText('Harness registry').textContent).toContain('reported');
  });

  it('carries the honesty copy', () => {
    render(<App />);
    expect(document.body.textContent).toContain('It is not');
    expect(document.body.textContent).toContain('Not verified from here');
  });
});
