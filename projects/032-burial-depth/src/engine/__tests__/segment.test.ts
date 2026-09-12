import { describe, expect, it } from 'vitest';
import { countWords, segmentResponse, splitSentences } from '../segment';

describe('countWords', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(countWords('  one   two  ')).toBe(2);
  });

  it('returns 0 for empty input', () => {
    expect(countWords('   ')).toBe(0);
  });
});

describe('splitSentences', () => {
  it('splits on terminal punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('does not split decimal numbers', () => {
    expect(splitSentences('Upgrade to 5.2 now.')).toEqual(['Upgrade to 5.2 now.']);
  });

  it('does not split known abbreviations', () => {
    const out = splitSentences('Use a bundler, e.g. Vite. Then rebuild.');
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('e.g. Vite.');
  });

  it('does not split on a period inside a filename', () => {
    expect(splitSentences('Edit vite.config.ts now.')).toHaveLength(1);
  });

  it('returns an empty array for empty input', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('segmentResponse', () => {
  it('keeps a fenced code block as one segment', () => {
    const out = segmentResponse('Do this.\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n\nDone.');
    const code = out.filter((s) => s.isCode);
    expect(code).toHaveLength(1);
    expect(code[0].text).toContain('const a = 1;');
    expect(code[0].text).toContain('const b = 2;');
  });

  it('preserves document order across prose and code', () => {
    const out = segmentResponse('First.\n\n```\nx\n```\n\nLast.');
    expect(out.map((s) => s.isCode)).toEqual([false, true, false]);
    expect(out[0].text).toBe('First.');
    expect(out[2].text).toBe('Last.');
  });

  it('never sends code contents to the sentence splitter', () => {
    const out = segmentResponse('```\na. b. c.\n```');
    expect(out).toHaveLength(1);
    expect(out[0].isCode).toBe(true);
  });

  it('flags numbered list items', () => {
    const out = segmentResponse('1. Run the build.\n2. Deploy it.');
    expect(out.every((s) => s.numbered)).toBe(true);
  });

  it('gives every sentence of one step the same stepId', () => {
    const out = segmentResponse('1. Clone it. Then check it.\n2. Build it.');
    const first = out.filter((s) => s.text.includes('Clone') || s.text.includes('check'));
    expect(new Set(first.map((s) => s.stepId)).size).toBe(1);
    const second = out.find((s) => s.text.includes('Build'));
    expect(second?.stepId).not.toBe(first[0].stepId);
  });

  it('gives non-step segments a stepId of -1', () => {
    const out = segmentResponse('Run the build.');
    expect(out[0].stepId).toBe(-1);
  });

  it('does not flag ordinary prose as numbered', () => {
    const out = segmentResponse('Run the build.');
    expect(out[0].numbered).toBe(false);
  });

  it('handles an unterminated fence without losing content', () => {
    const out = segmentResponse('Try:\n\n```sh\nnpm ci');
    expect(out.some((s) => s.isCode && s.text.includes('npm ci'))).toBe(true);
  });

  it('returns nothing for empty input', () => {
    expect(segmentResponse('   \n  ')).toEqual([]);
  });
});
