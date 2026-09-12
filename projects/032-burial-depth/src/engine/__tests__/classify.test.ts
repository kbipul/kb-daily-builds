import { describe, expect, it } from 'vitest';
import { classify, countHedges, substanceMarkers } from '../classify';

const roleOf = (t: string) => classify(t, false).role;

describe('classify', () => {
  it('marks code as code', () => {
    expect(classify('```\nnpm ci\n```', true).role).toBe('code');
  });

  it('detects preamble', () => {
    expect(roleOf('Great question! This comes up a lot.')).toBe('preamble');
    expect(roleOf("I'd be happy to help with that.")).toBe('preamble');
  });

  it('detects scaffold', () => {
    expect(roleOf("Let me walk you through what is happening here.")).toBe('scaffold');
    expect(roleOf("First, let me check the configuration.")).toBe('scaffold');
  });

  it('detects recap', () => {
    expect(roleOf('To summarise, the cache was cold.')).toBe('recap');
    expect(roleOf('In conclusion, it works.')).toBe('recap');
  });

  it('detects closer', () => {
    expect(roleOf('Hope this helps!')).toBe('closer');
    expect(roleOf('Let me know if you have any questions.')).toBe('closer');
  });

  it('prefers closer over a commitment marker in the same sentence', () => {
    // Contains "because" (a commitment word) but is still a sign-off.
    expect(roleOf('Let me know if it still fails because of the cache.')).toBe('closer');
  });

  it('detects a hedge that opens the sentence', () => {
    expect(roleOf('It depends on what you are optimising for.')).toBe('hedge');
  });

  it('does not downgrade an instruction that happens to hedge', () => {
    // "you may want to" is a hedge cue, but the sentence carries inline code.
    expect(roleOf('Set `base` to your repo name, though you may want to confirm it first.')).toBe(
      'answer',
    );
  });

  it('calls contentless prose filler, not an anti-pattern', () => {
    expect(roleOf('There are some things here worth thinking about.')).toBe('filler');
  });

  it('detects an answer via an imperative opener', () => {
    expect(roleOf('Run the migration.')).toBe('answer');
  });

  it('detects an answer via inline code', () => {
    expect(roleOf('The flag is `--force`.')).toBe('answer');
  });

  it('detects an answer via a named cause', () => {
    expect(roleOf('The build fails because the base path is wrong.')).toBe('answer');
  });

  it('treats a list marker as decoration, not content', () => {
    expect(roleOf('1. Run the build.')).toBe('answer');
  });

  it('returns filler for empty input', () => {
    expect(roleOf('   ')).toBe('filler');
  });
});

describe('substanceMarkers', () => {
  it('finds inline code', () => {
    expect(substanceMarkers('Use `npm ci`.')).toContain('inline code');
  });

  it('finds a filename', () => {
    expect(substanceMarkers('Open vite.config.ts.')).toContain('path or filename');
  });

  it('finds a number', () => {
    expect(substanceMarkers('It takes 30 seconds.')).toContain('number');
  });

  it('finds an imperative opener', () => {
    expect(substanceMarkers('Restart the service.')).toContain('imperative');
  });

  it('finds none in contentless prose', () => {
    expect(substanceMarkers('That is an interesting area to explore.')).toEqual([]);
  });
});

describe('countHedges', () => {
  it('counts each distinct hedge cue once', () => {
    const found = countHedges('It depends, and you may want to consider the alternatives.');
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it('finds none in a committed sentence', () => {
    expect(countHedges('Run the migration now.')).toEqual([]);
  });
});
