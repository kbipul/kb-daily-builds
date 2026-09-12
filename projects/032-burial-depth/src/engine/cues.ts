/**
 * Cue lexicons.
 *
 * Every entry is a phrase that, when it opens a sentence (or appears anywhere,
 * for the roles marked `anywhere`), is strong evidence of a role. These are
 * deliberately conservative: a cue earns its place only if it is hard to write
 * by accident in a sentence that is genuinely answering something.
 *
 * The vocabulary is drawn from the output conventions that agent-output skills
 * have converged on - lead with the answer, drop the preamble, drop the closer,
 * bound each step, give time in units - restated here as detectable patterns.
 */

export interface CueSet {
  /** Matched only at the start of a segment. */
  opening: string[];
  /** Matched anywhere in a segment. */
  anywhere: string[];
}

export const PREAMBLE: CueSet = {
  opening: [
    'great question',
    'good question',
    'excellent question',
    'that is a great',
    "that's a great",
    'sure thing',
    'sure!',
    'of course',
    'absolutely',
    'happy to help',
    'i can definitely help',
    'i can help',
    "i'd be happy to",
    'i would be happy to',
    'no problem',
    'thanks for',
    'thank you for',
    'i understand you',
    'i see what you',
    'let me help',
    'let me assist',
    'before we begin',
    'before we dive',
    'before diving in',
    'to answer your question',
    'as an ai',
  ],
  anywhere: [],
};

export const SCAFFOLD: CueSet = {
  opening: [
    "let me walk you through",
    "let's walk through",
    "let me explain",
    "let me start by",
    "let's start by",
    "let's begin by",
    "let me first",
    "let's first",
    "i'll walk you through",
    "i will walk you through",
    "i'll start by",
    "i'll begin by",
    "i'm going to",
    "i am going to",
    "what i'll do is",
    "here's what i'll do",
    "here is what i will do",
    "first, let me",
    "first i'll",
    "first i will",
    "now let me",
    "now i'll",
    "now let's",
    "next, let me",
    "let me take a look",
    "let me check",
    "looking at your",
    "having reviewed",
    "after reviewing",
    "i've analysed",
    "i've analyzed",
    "i have reviewed",
  ],
  anywhere: [],
};

export const RECAP: CueSet = {
  opening: [
    'to summarise',
    'to summarize',
    'in summary',
    'to recap',
    'recapping',
    'to sum up',
    'summing up',
    'in conclusion',
    'to conclude',
    'so in short',
    'in short,',
    'so to wrap up',
    'to wrap up',
    'wrapping up',
    'as mentioned above',
    'as discussed above',
    'as we saw above',
    'as i explained above',
    'putting it all together',
    'bringing it all together',
    'so, to answer your original',
  ],
  anywhere: [],
};

export const CLOSER: CueSet = {
  opening: [
    'hope this helps',
    'hope that helps',
    'i hope this helps',
    'i hope that helps',
    'hope this is helpful',
    'let me know if',
    'just let me know',
    'feel free to',
    'do let me know',
    'happy to elaborate',
    'happy to dig',
    'happy to go deeper',
    'if you have any questions',
    'any other questions',
    'good luck',
    'best of luck',
    'is there anything else',
    'would you like me to',
    'want me to',
    'shall i',
    'let me know how it goes',
  ],
  anywhere: [],
};

/**
 * Hedges are counted anywhere, not just at the opening: a hedge buried
 * mid-sentence still removes the commitment from the sentence around it.
 */
export const HEDGE: CueSet = {
  opening: ['it depends', 'that depends', 'well, it', 'generally speaking'],
  anywhere: [
    'it depends',
    'depends on your',
    'you may want to',
    'you might want to',
    'you could consider',
    'you may wish to',
    'one option would be',
    'one approach would be',
    'there are several ways',
    'there are many ways',
    'there are a few ways',
    'it varies',
    'in some cases',
    'in most cases',
    'generally speaking',
    'broadly speaking',
    'typically, though',
    'as a rule of thumb',
    'your mileage may vary',
    'it is worth noting',
    "it's worth noting",
    'it is important to note',
    "it's important to note",
    'keep in mind that',
    'bear in mind that',
    'that said,',
    'having said that',
    'of course, this',
  ],
};

/**
 * Durations with no unit. The convention asks for concrete units, so these are
 * flagged wherever they qualify an amount of time or effort.
 */
export const VAGUE_TIME: string[] = [
  'soon',
  'shortly',
  'in a while',
  'in a bit',
  'a while',
  'quickly',
  'in no time',
  'before long',
  'at some point',
  'eventually',
  'fairly quickly',
  'relatively quickly',
  'a short time',
  'a long time',
  'takes a moment',
  'in a moment',
  'momentarily',
  'a few moments',
];

/** Units that satisfy the concrete-time rule. */
export const TIME_UNITS: string[] = [
  'second',
  'seconds',
  'sec',
  'secs',
  'minute',
  'minutes',
  'min',
  'mins',
  'hour',
  'hours',
  'hr',
  'hrs',
  'day',
  'days',
  'week',
  'weeks',
  'ms',
];

/**
 * Imperative openers. A sentence that starts with one of these is telling the
 * reader to do something, which is the most direct form of an answer.
 */
export const IMPERATIVES: string[] = [
  'run',
  'open',
  'set',
  'add',
  'remove',
  'delete',
  'change',
  'replace',
  'rename',
  'move',
  'copy',
  'install',
  'uninstall',
  'upgrade',
  'downgrade',
  'check',
  'verify',
  'confirm',
  'use',
  'call',
  'import',
  'export',
  'create',
  'edit',
  'update',
  'restart',
  'stop',
  'start',
  'enable',
  'disable',
  'pin',
  'revert',
  'roll',
  'drop',
  'point',
  'switch',
  'wrap',
  'split',
  'merge',
  'clear',
  'flush',
  'rebuild',
  'redeploy',
  'deploy',
  'apply',
  'bump',
];

/** Phrases that mark a committed verdict or a named cause. */
export const COMMITMENT: string[] = [
  'the problem is',
  'the issue is',
  'the cause is',
  'the root cause',
  'the fix is',
  'the answer is',
  'the reason is',
  'this fails because',
  'it fails because',
  'because',
  'caused by',
  'is thrown',
  'throws',
  'returns',
  'yes,',
  'yes -',
  'no,',
  'no -',
  'do not',
  "don't",
  'never',
  'always',
  'must',
  'cannot',
  "can't",
];

/** Words that signal an error is under discussion, for the error-shape rule. */
export const ERROR_WORDS: string[] = [
  'error',
  'errors',
  'exception',
  'traceback',
  'stack trace',
  'stacktrace',
  'fails',
  'failing',
  'failed',
  'failure',
  'crash',
  'crashes',
  'crashed',
  'throws',
  'thrown',
  'broken',
  'breaks',
  'bug',
  'panic',
  'segfault',
];

/** Location markers: where the error is. */
export const LOCATION_WORDS: string[] = [
  'line',
  'file',
  'module',
  'function',
  'method',
  'class',
  'component',
  'handler',
  'endpoint',
  'in `',
  'at `',
  '.ts',
  '.tsx',
  '.js',
  '.py',
  '.cs',
  '.json',
  '.yml',
  '.yaml',
];

/** Cause markers: why the error happens. */
export const CAUSE_WORDS: string[] = [
  'because',
  'caused by',
  'the cause',
  'root cause',
  'due to',
  'since it',
  'as a result of',
  'happens when',
  'fails when',
  'triggered by',
  'reason',
];

/** Fix markers: what to do about it. */
export const FIX_WORDS: string[] = [
  'fix',
  'fixes',
  'to resolve',
  'resolve',
  'solution',
  'workaround',
  'change it to',
  'replace it with',
  'instead use',
  'use instead',
  'add a',
  'remove the',
  'set it to',
  'upgrade to',
  'downgrade to',
  'patch',
];
