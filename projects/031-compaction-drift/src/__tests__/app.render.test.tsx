// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { SESSIONS } from '../engine/sessions';
import { POLICIES } from '../engine/policies';

afterEach(cleanup);

describe('App', () => {
  it('mounts and shows the thesis', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /compaction drift/i })).toBeTruthy();
    expect(document.body.textContent).toContain('needs to continue');
  });

  it('offers every scenario and switches between them', () => {
    render(<App />);
    for (const s of SESSIONS) {
      expect(screen.getByRole('button', { name: new RegExp(s.name, 'i') })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: new RegExp(SESSIONS[2].name, 'i') }));
    expect(document.body.textContent).toContain(SESSIONS[2].blurb.slice(0, 40));
  });

  it('renders every rule in the loaded scenario with its own timeline row', () => {
    render(<App />);
    for (const fact of SESSIONS[0].facts) {
      expect(screen.getAllByText(fact.label).length).toBeGreaterThan(0);
    }
  });

  it('renders every governed action with a verdict', () => {
    render(<App />);
    const list = screen.getByRole('heading', { name: /moments that matter/i })
      .parentElement as HTMLElement;
    for (const action of SESSIONS[0].actions) {
      expect(within(list).getByText(action.label)).toBeTruthy();
    }
  });

  it('shows at least one ungoverned action on the default view', () => {
    render(<App />);
    expect(screen.getAllByText(/rule was gone/i).length).toBeGreaterThan(0);
  });

  it('restating every few turns clears every failure', () => {
    render(<App />);
    expect(screen.queryAllByText(/rule was gone/i).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/restatement cadence/i), { target: { value: '6' } });
    expect(screen.queryAllByText(/rule was gone/i).length).toBe(0);
    expect(document.body.textContent).toContain('First rule lost');
  });

  it('switching to the no-compaction baseline surfaces the overflow warning', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/compaction policy/i), { target: { value: 'none' } });
    expect(screen.getByRole('status').textContent).toMatch(/no longer fits the window/i);
  });

  it('lists every policy in the dropdown with its mechanism', () => {
    render(<App />);
    const select = screen.getByLabelText(/compaction policy/i) as HTMLSelectElement;
    expect(select.options).toHaveLength(POLICIES.length);
    for (const p of POLICIES) {
      fireEvent.change(select, { target: { value: p.id } });
      expect(document.body.textContent).toContain(p.mechanism.slice(0, 40));
    }
  });

  it('user-verbatim compaction visibly rescues the rule the operator typed', () => {
    render(<App />);
    const before = screen.getAllByText(/rule was gone/i).length;
    fireEvent.change(screen.getByLabelText(/compaction policy/i), {
      target: { value: 'user-verbatim' },
    });
    expect(screen.getAllByText(/rule was gone/i).length).toBeLessThan(before);
  });

  it('turning off constraint forwarding breaks every delegated action', () => {
    render(<App />);
    const forward = screen.getByLabelText(/forward the rules/i) as HTMLInputElement;
    expect(forward.checked).toBe(true);
    fireEvent.click(forward);
    expect(document.body.textContent).toMatch(/each subagent keeps its own context/i);
  });

  it('writing a rule to durable storage changes nothing until the policy re-reads it', () => {
    render(<App />);
    const freeze = SESSIONS[0].facts.find((f) => f.id === 'freeze')!;
    const freezeBox = screen.getByLabelText(
      new RegExp(`Write "${freeze.label}" to durable storage`, 'i'),
    ) as HTMLInputElement;
    expect(freezeBox.checked).toBe(false);
    fireEvent.click(freezeBox);
    expect(
      (screen.getByLabelText(
        new RegExp(`Write "${freeze.label}" to durable storage`, 'i'),
      ) as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText(/compaction policy/i), {
      target: { value: 'externalised' },
    });
    expect(document.body.textContent).toContain('re-read after each compaction');
  });

  it('states plainly that no vendor summariser is being simulated', () => {
    render(<App />);
    expect(document.body.textContent).toMatch(/has not published how its summariser works/i);
    expect(document.body.textContent).toMatch(/engineering judgement, not measurement/i);
  });

  it('lets the reader edit the retention assumptions', () => {
    render(<App />);
    const slider = screen.getByLabelText(/retention for carve-out/i) as HTMLInputElement;
    expect(slider.value).toBe('0.55');
    fireEvent.change(slider, { target: { value: '0.95' } });
    expect(screen.getByText('reset')).toBeTruthy();
  });

  it('keeps the headline count consistent with the listed verdicts', () => {
    render(<App />);
    const gone = screen.getAllByText(/rule was gone/i).length;
    const headline = document.querySelector('.headline .big')!.textContent!;
    expect(headline.startsWith(String(gone))).toBe(true);
  });
});
