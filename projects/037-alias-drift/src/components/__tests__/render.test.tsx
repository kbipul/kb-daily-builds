import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../App';
import { CORPUS } from '../../lib/corpus';

describe('App', () => {
  it('mounts and shows the title and every provider group', () => {
    render(<App />);
    expect(screen.getByText('Alias Drift')).toBeInTheDocument();
    for (const provider of new Set(CORPUS.map((r) => r.provider))) {
      expect(screen.getAllByText(provider).length).toBeGreaterThan(0);
    }
  });

  it('renders one picker button per corpus row (example string appears at least once)', () => {
    render(<App />);
    for (const row of CORPUS) {
      expect(screen.getAllByText(row.example).length).toBeGreaterThan(0);
    }
  });

  it('selecting a different row from the table updates the drift card', () => {
    render(<App />);
    // The first corpus row (OpenAI's dated snapshot) is selected by default.
    expect(screen.getAllByText('gpt-5-2025-08-07').length).toBeGreaterThan(0);

    const dsExample = 'deepseek-v4-flash (retired 10 Sep 2026)';
    const table = document.querySelector('.drift-table')!;
    const dsCell = within(table as HTMLElement).getByText(dsExample);
    fireEvent.click(dsCell.closest('tr')!);

    // The drift card (a <code> element, not the table) should now show it.
    const codeEls = document.querySelectorAll('code.drift-example');
    const texts = Array.from(codeEls).map((el) => el.textContent);
    expect(texts).toContain(dsExample);
  });

  it('running the simulator reveals the three-beat timeline', () => {
    render(<App />);
    const runBtn = screen.getByText('Simulate the day this gets deprecated');
    fireEvent.click(runBtn);
    expect(screen.getByText('Steady state')).toBeInTheDocument();
    expect(screen.getAllByText('Deprecation day').length).toBeGreaterThan(0);
  });

  it('sorting the table by provider re-orders rows without losing any', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Sort by provider'));
    const table = document.querySelector('.drift-table')!;
    for (const row of CORPUS) {
      expect(within(table as HTMLElement).getAllByText(row.shape).length).toBeGreaterThan(0);
    }
  });

  it('shows the honesty panel', () => {
    render(<App />);
    expect(screen.getByText(/What this is and isn/)).toBeInTheDocument();
  });
});
