import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title and all six case studies', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ready for Disclosure', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Self-generated instructions in task summaries')).toBeInTheDocument();
    expect(screen.getByText('Unsanctioned file sharing between collaborating agents')).toBeInTheDocument();
  });

  it('renders all three tracks with their quoted criteria', () => {
    render(<App />);
    expect(screen.getByText(/Investigation sufficiently complete for publication after review\./)).toBeInTheDocument();
    expect(screen.getByText(/Complex investigations, especially those involving third parties\./)).toBeInTheDocument();
  });

  it('classifies a complete investigation as Ready for Disclosure', () => {
    render(<App />);
    const group = screen.getByRole('group', { name: 'investigation complete' });
    fireEvent.click(within(group).getByText('Yes'));
    expect(screen.getAllByText('Ready for Disclosure').length).toBeGreaterThan(0);
  });

  it('classifies an incomplete, complex case as the Slow Track and flags it as illustrative', () => {
    render(<App />);
    const q1 = screen.getByRole('group', { name: 'investigation complete' });
    fireEvent.click(within(q1).getByText('No'));
    const q2 = screen.getByRole('group', { name: 'complex or third party' });
    fireEvent.click(within(q2).getByText('Yes'));
    expect(screen.getAllByText(/Larger Investigation/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Illustrative scenario/)).toBeInTheDocument();
  });
});

function within(el: HTMLElement) {
  return {
    getByText: (text: string) => {
      const match = Array.from(el.querySelectorAll('button')).find((b) => b.textContent === text);
      if (!match) throw new Error(`No button with text ${text} found in group`);
      return match;
    },
  };
}
