/**
 * Top-level analysis: text in, Analysis out. Pure, synchronous, no model.
 */

import { classify } from './classify';
import { runRules } from './rules';
import { countWords, segmentResponse } from './segment';
import { ANSWER_ROLES, ANTI_PATTERN_ROLES, type Analysis, type Segment } from './types';

export function analyze(input: string): Analysis {
  const raw = segmentResponse(input);

  let cumulative = 0;
  const segments: Segment[] = raw.map((r, index) => {
    const { role, cue, markers } = classify(r.text, r.isCode);
    const words = countWords(r.text);
    const seg: Segment = {
      index,
      text: r.text,
      role,
      words,
      wordsBefore: cumulative,
      cue,
      markers,
      numbered: r.numbered,
      stepId: r.stepId,
    };
    cumulative += words;
    return seg;
  });

  const totalWords = cumulative;
  const firstAnswer = segments.find((s) => ANSWER_ROLES.includes(s.role));
  const firstAnswerIndex = firstAnswer ? firstAnswer.index : -1;
  const burialDepth = firstAnswer ? firstAnswer.wordsBefore : -1;
  const burialRatio =
    totalWords === 0 ? 0 : burialDepth < 0 ? 1 : burialDepth / totalWords;

  const removableWords = segments
    .filter((s) => ANTI_PATTERN_ROLES.includes(s.role))
    .reduce((n, s) => n + s.words, 0);

  const rules = runRules(segments, burialDepth, totalWords);
  const applicable = rules.filter((r) => r.status !== 'n/a');

  const trimmed = segments
    .filter((s) => !ANTI_PATTERN_ROLES.includes(s.role))
    .map((s) => s.text)
    .join('\n\n')
    .trim();

  return {
    segments,
    totalWords,
    burialDepth,
    firstAnswerIndex,
    burialRatio,
    removableWords,
    rules,
    rulesApplicable: applicable.length,
    rulesPassed: applicable.filter((r) => r.status === 'pass').length,
    trimmed,
  };
}
