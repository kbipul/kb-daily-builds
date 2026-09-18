// A direct encoding of the decision rule OpenAI describes in its misalignment
// reporting framework: three questions, asked in order, each one quoting the
// actual criterion for that track (see src/data/framework.ts).
import type { TrackId } from '../data/framework';

export interface ClassifyInput {
  investigationComplete: boolean;
  complexOrThirdParty: boolean;
}

export interface ClassifyResult {
  track: TrackId;
  reason: string;
}

export function classify(input: ClassifyInput): ClassifyResult {
  if (input.investigationComplete) {
    return {
      track: 'ready',
      reason: 'Investigation is sufficiently complete for publication after review.',
    };
  }
  if (input.complexOrThirdParty) {
    return {
      track: 'slow',
      reason: 'Not yet complete, and it is complex or involves a third party.',
    };
  }
  return {
    track: 'minor',
    reason: 'Not yet complete, but simple enough to stay on the fast internal path.',
  };
}

// Every one of OpenAI's six disclosed incidents was, by the time it was
// published, a completed investigation -- so under this rule every one
// resolves to 'ready'. That is a real, checkable claim: see classify.test.ts.
export const ALL_SIX_WERE_COMPLETE_INVESTIGATIONS = true;
