/**
 * Role classification.
 *
 * One segment, one role, decided by a fixed precedence. The precedence matters:
 * "Let me know if you want me to explain why the build fails" contains both a
 * closer cue and a commitment word, and it is a closer.
 *
 * Default is `answer` only when a substance marker is present. Prose with no
 * cue and no marker is `filler` - not an anti-pattern the conventions name, but
 * not something a reader can act on either, so it still counts as burial.
 */

import {
  CLOSER,
  COMMITMENT,
  CueSet,
  HEDGE,
  IMPERATIVES,
  PREAMBLE,
  RECAP,
  SCAFFOLD,
} from './cues';
import type { Role } from './types';

export interface Classification {
  role: Role;
  cue?: string;
  markers: string[];
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_>#]/g, '')
    .replace(/^\s*(\d+[.)]|[-+*])\s+/, '')
    .trim();
}

function matchOpening(norm: string, set: CueSet): string | undefined {
  return set.opening.find((cue) => norm.startsWith(cue));
}

function matchAnywhere(norm: string, set: CueSet): string | undefined {
  return set.anywhere.find((cue) => norm.includes(cue));
}

/** Counts every hedge cue occurrence in the segment. */
export function countHedges(text: string): string[] {
  const norm = normalise(text);
  const found: string[] = [];
  for (const cue of HEDGE.anywhere) {
    if (norm.includes(cue)) found.push(cue);
  }
  for (const cue of HEDGE.opening) {
    if (norm.startsWith(cue) && !found.includes(cue)) found.push(cue);
  }
  return found;
}

/**
 * Substance markers: the concrete things that make a sentence actionable.
 * Returns the marker names found, so the UI can explain the verdict rather
 * than just assert it.
 */
export function substanceMarkers(text: string): string[] {
  const markers: string[] = [];
  const norm = normalise(text);

  if (/`[^`]+`/.test(text)) markers.push('inline code');
  if (/(^|\s)[\w~.-]*\/[\w./-]+/.test(text) || /\.\w{2,4}\b/.test(norm)) {
    markers.push('path or filename');
  }
  if (/\d/.test(norm)) markers.push('number');

  const firstWord = norm.split(/[\s,.:;]+/)[0] ?? '';
  if (IMPERATIVES.includes(firstWord)) markers.push('imperative');

  const commitment = COMMITMENT.find((c) => norm.includes(c));
  if (commitment) markers.push('commitment');

  return markers;
}

export function classify(text: string, isCode: boolean): Classification {
  if (isCode) return { role: 'code', markers: ['code block'] };

  const norm = normalise(text);
  if (!norm) return { role: 'filler', markers: [] };

  // Precedence: the roles the conventions ask you to delete come first, so a
  // sentence that both signs off and mentions a file is still a sign-off.
  const closer = matchOpening(norm, CLOSER) ?? matchAnywhere(norm, CLOSER);
  if (closer) return { role: 'closer', cue: closer, markers: [] };

  const recap = matchOpening(norm, RECAP);
  if (recap) return { role: 'recap', cue: recap, markers: [] };

  const preamble = matchOpening(norm, PREAMBLE);
  if (preamble) return { role: 'preamble', cue: preamble, markers: [] };

  const scaffold = matchOpening(norm, SCAFFOLD);
  if (scaffold) return { role: 'scaffold', cue: scaffold, markers: [] };

  const markers = substanceMarkers(text);
  const hedges = countHedges(text);

  // A hedge only wins when it is doing the work of the sentence. A sentence
  // with a real instruction in it stays an answer even if it hedges on the way.
  const hedgeOpening = matchOpening(norm, HEDGE);
  if (hedgeOpening || (hedges.length > 0 && markers.length === 0)) {
    return { role: 'hedge', cue: hedgeOpening ?? hedges[0], markers };
  }

  if (markers.length === 0) return { role: 'filler', markers };

  return { role: 'answer', markers };
}
