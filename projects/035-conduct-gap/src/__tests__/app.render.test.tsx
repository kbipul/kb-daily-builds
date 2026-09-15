// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { CLAUSES } from '../engine/corpus';

afterEach(cleanup);

const scoreOf = (v: string) =>
  Number(within(screen.getByTestId(`score-${v}`)).getByText(/^\d+$/).textContent);

describe('the page', () => {
  it('mounts and renders every clause in the corpus', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Conduct Gap' })).toBeTruthy();
    for (const c of CLAUSES) expect(screen.getByTestId(`clause-${c.id}`), c.id).toBeTruthy();
  });

  it('opens a clause to its verbatim text and its test procedure', () => {
    render(<App />);
    const row = screen.getByTestId('clause-c30');
    fireEvent.click(within(row).getByRole('button'));
    expect(within(row).getByText(/will not actively deceive/)).toBeTruthy();
    expect(within(row).getByText(/Resolve every citation\./)).toBeTruthy();
  });

  it('shows a withheld reason instead of a procedure for the child-safety constraint', () => {
    render(<App />);
    const row = screen.getByTestId('clause-c13');
    fireEvent.click(within(row).getByRole('button'));
    expect(within(row).getByText(/No procedure is published here/)).toBeTruthy();
    expect(within(row).queryByText('How to test it')).toBeNull();
  });

  it('starts on the enterprise tenant and shows seven checkable commitments', () => {
    render(<App />);
    expect(scoreOf('checkable') + scoreOf('checkable-configurable')).toBe(7);
    expect(screen.getByTestId('readout').textContent).toMatch(/catch a violation of\s*7\s*of 42/);
  });

  it('moves the numbers when you take on the harness', () => {
    render(<App />);
    const before = scoreOf('checkable');
    fireEvent.click(screen.getByTestId('preset-platform'));
    expect(scoreOf('checkable')).toBeGreaterThan(before);
  });

  it('detaches every clause when the surface runs a model the document does not govern', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('preset-foundry'));
    expect(scoreOf('out-of-scope')).toBe(CLAUSES.length);
    expect(scoreOf('checkable')).toBe(0);
    expect(screen.getByTestId('scope-basis').textContent).toMatch(/does not extend to other models/);
  });

  it('carries the caveat on a mixed surface and drops it on a single-family one', () => {
    render(<App />);
    expect(screen.getByTestId('scope-caveat').textContent).toMatch(/unknown share of requests/);
    fireEvent.click(screen.getByTestId('scope-mai-direct'));
    expect(screen.queryByTestId('scope-caveat')).toBeNull();
  });

  it('labels the two zero-value accesses as zero before you click them', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('preset-reader'));
    expect(within(screen.getByTestId('evidence-attestation')).getByText('+0')).toBeTruthy();
    expect(within(screen.getByTestId('evidence-config')).getByText('+0')).toBeTruthy();
    expect(within(screen.getByTestId('evidence-traces')).getByText(/^\+[1-9]/)).toBeTruthy();
  });

  it('leaves the scoreboard unchanged when an attestation is taken on', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('preset-platform'));
    const before = scoreOf('checkable') + scoreOf('checkable-configurable');
    fireEvent.click(screen.getByTestId('evidence-attestation'));
    expect(scoreOf('checkable') + scoreOf('checkable-configurable')).toBe(before);
  });

  it('toggles a single access on and off again', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('preset-reader'));
    const before = scoreOf('checkable');
    const traces = screen.getByTestId('evidence-traces');
    fireEvent.click(traces);
    expect(scoreOf('checkable')).toBeGreaterThan(before);
    fireEvent.click(screen.getByTestId('evidence-traces'));
    expect(scoreOf('checkable')).toBe(before);
  });

  it('reaches every clause but two only at the evaluator preset', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('preset-ceiling'));
    expect(scoreOf('needs-access')).toBe(8);
    fireEvent.click(screen.getByTestId('preset-evaluator'));
    expect(scoreOf('needs-access')).toBe(0);
    expect(scoreOf('unfalsifiable')).toBe(2);
  });

  it('shows the document describing its own standing, unscored', () => {
    render(<App />);
    const panel = screen.getByTestId('self-description');
    expect(within(panel).getByText(/not using it to train our models today/)).toBeTruthy();
    expect(within(panel).getByText(/not a guarantee of present-day performance/)).toBeTruthy();
  });

  it('says on the page which parts are quoted and which are judged', () => {
    render(<App />);
    const honesty = screen.getByTestId('honesty');
    expect(honesty.textContent).toMatch(/quoted verbatim/);
    expect(honesty.textContent).toMatch(/this project's judgement/);
    expect(honesty.textContent).toMatch(/No claim is made that any model has violated any clause/);
  });
});
