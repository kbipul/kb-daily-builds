/**
 * Segmentation.
 *
 * Splits a response into segments: fenced code blocks stay whole, prose is cut
 * into sentences. Markdown list markers and headings are kept with their
 * sentence so the numbering check can see them.
 */

export interface RawSegment {
  text: string;
  isCode: boolean;
  numbered: boolean;
  /**
   * Ordinal of the numbered list item this segment belongs to, or -1. A step
   * written as three sentences is still one step, and the bounded-steps rule
   * needs to count steps rather than sentences.
   */
  stepId: number;
}

const FENCE = /^\s*```/;

/** Abbreviations that end in a period but do not end a sentence. */
const ABBREVIATIONS = [
  'e.g.',
  'i.e.',
  'etc.',
  'vs.',
  'approx.',
  'no.',
  'fig.',
  'cf.',
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'st.',
];

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function isNumberedLine(line: string): boolean {
  return /^\s*(\d+[.)]|[-*+]\s*\d+[.)])\s+/.test(line);
}

/**
 * Sentence splitting without a full NLP dependency. Splits on . ! ? followed by
 * whitespace and a capital/digit/backtick, holding back known abbreviations and
 * decimal numbers.
 */
export function splitSentences(prose: string): string[] {
  const out: string[] = [];
  let current = '';

  const chars = [...prose];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    current += ch;

    if (ch !== '.' && ch !== '!' && ch !== '?') continue;

    // Decimal number or version: 1.5, v2.0.1
    const prev = chars[i - 1];
    const next = chars[i + 1];
    if (ch === '.' && prev && /\d/.test(prev) && next && /\d/.test(next)) continue;

    // Known abbreviation
    const lowerTail = current.toLowerCase();
    if (ABBREVIATIONS.some((a) => lowerTail.endsWith(a))) continue;

    // Must be followed by whitespace (or end of input)
    if (next !== undefined && !/\s/.test(next)) continue;

    // Peek at the first non-space character after the break
    let j = i + 1;
    while (j < chars.length && /\s/.test(chars[j])) j += 1;
    const opener = chars[j];
    if (opener !== undefined && !/[A-Z0-9`"'(\-*#]/.test(opener)) continue;

    out.push(current.trim());
    current = '';
  }

  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

/**
 * Splits a whole response. Code fences are extracted first so their contents
 * never reach the sentence splitter.
 */
export function segmentResponse(input: string): RawSegment[] {
  const lines = input.split(/\r?\n/);
  const segments: RawSegment[] = [];

  let proseBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let inCode = false;
  let stepCounter = 0;

  const flushProse = () => {
    const block = proseBuffer.join('\n');
    proseBuffer = [];
    // Work paragraph by paragraph so list items do not run into each other.
    for (const para of block.split(/\n{2,}/)) {
      for (const line of para.split(/\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const numbered = isNumberedLine(line);
        let stepId = -1;
        if (numbered) {
          stepCounter += 1;
          stepId = stepCounter;
        }
        for (const sentence of splitSentences(trimmed)) {
          segments.push({ text: sentence, isCode: false, numbered, stepId });
        }
      }
    }
  };

  for (const line of lines) {
    if (FENCE.test(line)) {
      if (inCode) {
        codeBuffer.push(line);
        segments.push({ text: codeBuffer.join('\n'), isCode: true, numbered: false, stepId: -1 });
        codeBuffer = [];
        inCode = false;
      } else {
        flushProse();
        codeBuffer = [line];
        inCode = true;
      }
      continue;
    }

    if (inCode) codeBuffer.push(line);
    else proseBuffer.push(line);
  }

  if (inCode && codeBuffer.length) {
    // Unterminated fence: still treat what we have as code.
    segments.push({ text: codeBuffer.join('\n'), isCode: true, numbered: false, stepId: -1 });
  }
  flushProse();

  return segments;
}
