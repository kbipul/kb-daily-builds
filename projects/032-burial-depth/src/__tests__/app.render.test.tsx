// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { SAMPLES } from '../engine/samples';

afterEach(cleanup);

const textarea = () => screen.getByLabelText(/response to analyse/i) as HTMLTextAreaElement;

const retype = (value: string) => {
  fireEvent.change(textarea(), { target: { value } });
};

describe('App', () => {
  it('mounts and states the thesis', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /burial depth/i })).toBeTruthy();
    expect(document.body.textContent).toContain('Rules are assertions');
  });

  it('loads a sample by default', () => {
    render(<App />);
    expect(textarea().value.length).toBeGreaterThan(0);
  });

  it('offers every sample and switches between them', () => {
    render(<App />);
    for (const s of SAMPLES) {
      const btn = screen.getByRole('button', { name: s.name });
      fireEvent.click(btn);
      expect(textarea().value).toBe(s.text);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('shows the sample note when a sample is loaded', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: SAMPLES[2].name }));
    expect(document.body.textContent).toContain(SAMPLES[2].note);
  });

  it('drops the sample note once the text is edited by hand', () => {
    render(<App />);
    retype('Run `npm ci`.');
    expect(document.body.textContent).not.toContain(SAMPLES[0].note);
  });

  it('recomputes the headline number as the text changes', () => {
    render(<App />);
    retype('Run `npm ci`.');
    const meter = screen.getByLabelText(/burial depth/i, { selector: 'section' });
    expect(within(meter).getByText('0')).toBeTruthy();
    expect(meter.textContent).toContain('Answer first');

    retype('Great question! Run `npm ci`.');
    expect(meter.textContent).toContain('Shallow');
  });

  it('renders the answer marker at the right depth', () => {
    render(<App />);
    retype('Great question! Run `npm ci`.');
    expect(document.body.textContent).toContain('the answer starts here — 2 words in');
  });

  it('renders one ribbon entry per segment with its role', () => {
    render(<App />);
    retype('Great question! Run `npm ci`. Hope this helps!');
    const list = document.querySelectorAll('.ribbon__list > li');
    expect(list).toHaveLength(3);
    expect(list[0].className).toContain('seg--preamble');
    expect(list[1].className).toContain('seg--answer');
    expect(list[2].className).toContain('seg--closer');
  });

  it('renders a code segment as a code block', () => {
    render(<App />);
    retype('Do this.\n\n```sh\nnpm ci\n```');
    expect(document.querySelector('.seg__code')?.textContent).toContain('npm ci');
  });

  it('highlights evidence when a failing rule is clicked, and clears it again', () => {
    render(<App />);
    retype('Great question! Run `npm ci`.');
    const trigger = screen.getByRole('button', { name: /No preamble/i });
    fireEvent.click(trigger);
    expect(document.querySelectorAll('.seg--focused').length).toBeGreaterThan(0);
    fireEvent.click(trigger);
    expect(document.querySelectorAll('.seg--focused')).toHaveLength(0);
  });

  it('disables the rule button when a rule has no evidence to show', () => {
    render(<App />);
    retype('Run `npm ci`.');
    const passing = screen.getByRole('button', { name: /No preamble/i }) as HTMLButtonElement;
    expect(passing.disabled).toBe(true);
  });

  it('shows the trimmed response with the deletable roles gone', () => {
    render(<App />);
    retype('Great question! Run `npm ci`. Hope this helps!');
    const body = document.querySelector('.trimmed__body');
    expect(body?.textContent).toContain('npm ci');
    expect(body?.textContent).not.toContain('Great question');
    expect(body?.textContent).not.toContain('Hope this helps');
  });

  it('prompts for input when the box is emptied', () => {
    render(<App />);
    retype('');
    expect(document.body.textContent).toContain('Paste a response above');
  });

  it('does not crash on input that is only whitespace', () => {
    render(<App />);
    expect(() => retype('   \n\n   ')).not.toThrow();
  });

  it('states its own limits on the page', () => {
    render(<App />);
    expect(document.body.textContent).toContain('cannot tell whether the answer is correct');
  });
});
