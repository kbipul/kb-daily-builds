import { describe, expect, it } from 'vitest';
import { analyze } from '../analyze';
import { bandFor } from '../types';
import { SAMPLES } from '../samples';

describe('analyze - burial depth', () => {
  it('reports depth 0 when the first segment answers', () => {
    const a = analyze('Run `npm ci`. It rebuilds the lockfile.');
    expect(a.burialDepth).toBe(0);
    expect(a.firstAnswerIndex).toBe(0);
  });

  it('counts every word before the first answer', () => {
    const a = analyze('Great question! Run `npm ci`.');
    // "Great question!" is two words.
    expect(a.burialDepth).toBe(2);
    expect(a.firstAnswerIndex).toBe(1);
  });

  it('counts a code block as the answer arriving', () => {
    const a = analyze('Hope this helps.\n\n```sh\nnpm ci\n```');
    expect(a.firstAnswerIndex).toBe(1);
    expect(a.segments[1].role).toBe('code');
  });

  it('returns -1 when nothing answers', () => {
    const a = analyze('Great question! Hope this helps!');
    expect(a.burialDepth).toBe(-1);
    expect(a.firstAnswerIndex).toBe(-1);
    expect(a.burialRatio).toBe(1);
  });

  it('handles empty input without throwing', () => {
    const a = analyze('');
    expect(a.totalWords).toBe(0);
    expect(a.segments).toEqual([]);
    expect(a.burialRatio).toBe(0);
  });

  it('keeps wordsBefore monotonically increasing', () => {
    const a = analyze(SAMPLES[0].text);
    for (let i = 1; i < a.segments.length; i += 1) {
      expect(a.segments[i].wordsBefore).toBeGreaterThanOrEqual(a.segments[i - 1].wordsBefore);
    }
  });

  it('makes totalWords the sum of the segment word counts', () => {
    const a = analyze(SAMPLES[2].text);
    const sum = a.segments.reduce((n, s) => n + s.words, 0);
    expect(a.totalWords).toBe(sum);
  });

  it('keeps burialRatio between 0 and 1', () => {
    for (const s of SAMPLES) {
      const a = analyze(s.text);
      expect(a.burialRatio).toBeGreaterThanOrEqual(0);
      expect(a.burialRatio).toBeLessThanOrEqual(1);
    }
  });
});

describe('analyze - trimming', () => {
  it('removes preamble, scaffold, recap and closer', () => {
    const a = analyze('Great question! Run `npm ci`. Hope this helps!');
    expect(a.trimmed).toContain('npm ci');
    expect(a.trimmed).not.toContain('Great question');
    expect(a.trimmed).not.toContain('Hope this helps');
  });

  it('keeps hedges and filler, which are judgement calls rather than deletions', () => {
    const a = analyze('It depends on your setup. Run `npm ci`.');
    expect(a.trimmed).toContain('It depends');
  });

  it('counts the words it would remove', () => {
    const a = analyze('Great question! Run `npm ci`.');
    expect(a.removableWords).toBe(2);
  });

  it('leaves an already-clean response untouched', () => {
    const a = analyze('Run `npm ci`.');
    expect(a.removableWords).toBe(0);
    expect(a.trimmed).toBe('Run `npm ci`.');
  });
});

describe('analyze - rules', () => {
  it('returns all eight rules', () => {
    expect(analyze('Run `npm ci`.').rules).toHaveLength(8);
  });

  it('never counts an n/a rule as applicable', () => {
    const a = analyze('Run `npm ci`.');
    const na = a.rules.filter((r) => r.status === 'n/a').length;
    expect(a.rulesApplicable).toBe(8 - na);
  });

  it('never reports more passes than applicable rules', () => {
    for (const s of SAMPLES) {
      const a = analyze(s.text);
      expect(a.rulesPassed).toBeLessThanOrEqual(a.rulesApplicable);
    }
  });

  it('marks error-shape n/a when no error is discussed', () => {
    const r = analyze('Run `npm ci`.').rules.find((x) => x.id === 'error-shape');
    expect(r?.status).toBe('n/a');
  });

  it('fails error-shape when the cause and fix are missing', () => {
    const r = analyze('The build throws an error on line 12.').rules.find(
      (x) => x.id === 'error-shape',
    );
    expect(r?.status).toBe('fail');
    expect(r?.detail).toContain('cause');
  });

  it('passes error-shape when location, cause and fix are all present', () => {
    const r = analyze(
      'The build fails on line 12 of vite.config.ts because `base` is unset. The fix is to set it to your repo name.',
    ).rules.find((x) => x.id === 'error-shape');
    expect(r?.status).toBe('pass');
  });

  it('marks bounded-steps n/a without numbered steps', () => {
    const r = analyze('Run `npm ci`.').rules.find((x) => x.id === 'bounded-steps');
    expect(r?.status).toBe('n/a');
  });

  it('fails bounded-steps when one number hides two actions', () => {
    const r = analyze('1. Clone the repo and then install dependencies.').rules.find(
      (x) => x.id === 'bounded-steps',
    );
    expect(r?.status).toBe('fail');
  });

  it('counts one multi-sentence step as one step', () => {
    const r = analyze('1. Clone the repo. Check the branch.\n2. Install dependencies.').rules.find(
      (x) => x.id === 'bounded-steps',
    );
    expect(r?.status).toBe('pass');
    expect(r?.detail).toContain('2 numbered');
  });

  it('treats a code block as the fix for error-shape', () => {
    const r = analyze(
      'The handler fails on line 9 of app.ts because the key is unset.\n\n```sh\nexport KEY=1\n```',
    ).rules.find((x) => x.id === 'error-shape');
    expect(r?.status).toBe('pass');
  });

  it('treats an instruction as the fix for error-shape', () => {
    const r = analyze(
      'The handler crashes in app.ts because the key is unset. Set the environment variable.',
    ).rules.find((x) => x.id === 'error-shape');
    expect(r?.status).toBe('pass');
  });

  it('passes bounded-steps for single-action steps', () => {
    const r = analyze('1. Clone the repo.\n2. Install dependencies.').rules.find(
      (x) => x.id === 'bounded-steps',
    );
    expect(r?.status).toBe('pass');
  });

  it('fails concrete-time on a vague duration', () => {
    const r = analyze('Run `npm ci`. It should finish fairly quickly.').rules.find(
      (x) => x.id === 'concrete-time',
    );
    expect(r?.status).toBe('fail');
  });

  it('passes concrete-time on a duration with a unit', () => {
    const r = analyze('Run `npm ci`. It takes 40 seconds.').rules.find(
      (x) => x.id === 'concrete-time',
    );
    expect(r?.status).toBe('pass');
  });

  it('attaches evidence indices to every failing rule', () => {
    const a = analyze(SAMPLES[0].text);
    for (const rule of a.rules) {
      for (const i of rule.evidence) {
        expect(a.segments[i]).toBeDefined();
      }
    }
  });
});

describe('bandFor', () => {
  it('bands a clean opening', () => {
    expect(bandFor(0).band).toBe('clean');
  });

  it('bands a sentence of runway as shallow', () => {
    expect(bandFor(20).band).toBe('shallow');
  });

  it('bands a paragraph of runway as deep', () => {
    expect(bandFor(60).band).toBe('deep');
  });

  it('bands a long runway as buried', () => {
    expect(bandFor(200).band).toBe('buried');
  });

  it('bands a missing answer as buried', () => {
    expect(bandFor(-1).band).toBe('buried');
    expect(bandFor(-1).label).toBe('No answer found');
  });
});

describe('analyze - samples behave as advertised', () => {
  it('scores the buried sample worse than the answer-first sample', () => {
    const buried = analyze(SAMPLES[0].text);
    const clean = analyze(SAMPLES[1].text);
    expect(buried.burialDepth).toBeGreaterThan(clean.burialDepth);
    expect(clean.burialDepth).toBe(0);
  });

  it('flags the hedged sample on hedge density', () => {
    const r = analyze(SAMPLES[2].text).rules.find((x) => x.id === 'hedge-density');
    expect(r?.status).toBe('fail');
  });

  it('flags the unbounded-steps sample on bounded steps', () => {
    const r = analyze(SAMPLES[3].text).rules.find((x) => x.id === 'bounded-steps');
    expect(r?.status).toBe('fail');
  });

  it('gives every sample a stable id and non-empty text', () => {
    const ids = new Set(SAMPLES.map((s) => s.id));
    expect(ids.size).toBe(SAMPLES.length);
    expect(SAMPLES.every((s) => s.text.trim().length > 0)).toBe(true);
  });
});
