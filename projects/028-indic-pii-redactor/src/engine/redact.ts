import type { Finding, RedactionMode } from './types';

/**
 * Build the replacement for one finding.
 * - `label`   [AADHAAR] — readable, and tells a reviewer what was removed.
 * - `block`   full-width blocks of the same length as the original.
 * - `partial` last four characters kept, which is what call-centre scripts
 *             and bank statements actually do. Note that partial masking is
 *             NOT anonymisation: last-4 plus context is often re-identifying.
 */
export function maskFor(finding: Finding, mode: RedactionMode): string {
  switch (mode) {
    case 'label':
      return `[${finding.label}]`;
    case 'block':
      return '█'.repeat(finding.raw.length);
    case 'partial': {
      const tail = finding.raw.slice(-4);
      const head = finding.raw.slice(0, Math.max(0, finding.raw.length - 4));
      return head.replace(/[^\s-]/g, 'X') + tail;
    }
  }
}

/**
 * Replace every finding in the original text. Findings must not overlap —
 * `resolveOverlaps` guarantees that. Applied right-to-left so earlier offsets
 * stay valid as the string changes length.
 */
export function redact(text: string, findings: Finding[], mode: RedactionMode): string {
  const ordered = [...findings].sort((a, b) => b.start - a.start);
  let out = text;
  for (const f of ordered) {
    out = out.slice(0, f.start) + maskFor(f, mode) + out.slice(f.end);
  }
  return out;
}

export interface Segment {
  text: string;
  finding: Finding | null;
}

/** Split text into alternating plain / matched segments for highlighting. */
export function segment(text: string, findings: Finding[]): Segment[] {
  const ordered = [...findings].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const f of ordered) {
    if (f.start > cursor) segments.push({ text: text.slice(cursor, f.start), finding: null });
    segments.push({ text: text.slice(f.start, f.end), finding: f });
    cursor = f.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), finding: null });
  return segments;
}
