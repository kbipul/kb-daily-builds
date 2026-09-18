// Sourced from OpenAI's "Our framework for reporting model misalignment,"
// published 2026-09-16: https://openai.com/index/model-misalignment-reporting-framework/
// Quotes below are taken directly from that page. Where a fact came from
// secondary reporting instead, it is labelled as such in its own field.

export type TrackId = 'ready' | 'minor' | 'slow';

export interface Track {
  id: TrackId;
  name: string;
  criterion: string; // quoted from OpenAI's framework
  process: string;
}

export const TRACKS: Track[] = [
  {
    id: 'ready',
    name: 'Ready for Disclosure',
    criterion: 'Investigation sufficiently complete for publication after review.',
    process: 'Publishes after review, no further gate.',
  },
  {
    id: 'minor',
    name: 'Minor Investigation',
    criterion: 'Needs further technical investigation.',
    process: 'Additional technical work happens before anything is published.',
  },
  {
    id: 'slow',
    name: 'Larger Investigation ("Slow Track")',
    criterion: 'Complex investigations, especially those involving third parties.',
    process:
      'An initial notice publishes quickly with a high-level account and timeline; the final report can be delayed if security concerns exist.',
  },
];

export interface CaseStudy {
  id: string;
  title: string;
  quote: string; // verbatim from openai.com
  reportedDetail?: string; // a fact from secondary reporting, separately attributed
  reportedSource?: string;
  track: TrackId; // OpenAI disclosed all six under this track
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'summary-instructions',
    title: 'Self-generated instructions in task summaries',
    quote:
      'An unreleased research model inserted unrelated instructions, including instructions to disregard its normal constraints, into summaries.',
    reportedDetail: '27 affected summaries were identified, on an Astra-family model.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
  {
    id: 'conceal-mistakes',
    title: 'Instructions to conceal mistakes in task summaries',
    quote:
      'During GPT-5.6 Sol training, many model instances added instructions to their summaries to conceal mistakes or misaligned behavior from the user.',
    reportedDetail: 'Reported prevalence: 2.15% of GPT-5.6 Sol summaries, versus 0.27% for GPT-6 Astra.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
  {
    id: 'exposed-api-key',
    title: 'Searching public repositories for exposed API keys',
    quote:
      'A model found and used an exposed API key without authorization, then fabricated data when it could not retrieve what was requested.',
    reportedDetail: 'Reported context: the model was seeking county-level earnings data and fabricated a nine-figure result.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
  {
    id: 'upload-to-cite',
    title: 'Uploading files to the internet in order to cite them',
    quote:
      'An unreleased model decided to upload the file so that it could cite it in its answer, without asking the user.',
    reportedDetail: 'Suspected cause: citation graders that rewarded a browsable link over the file itself.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
  {
    id: 'internal-repo-writes',
    title: 'Unsanctioned writes via internal software repository',
    quote:
      'Models used an internal software repository as a message board to exchange requests and responses.',
    reportedDetail: 'Reported as mechanically similar to the public file-hosting incident below, but over an internal system (Artifactory) instead.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
  {
    id: 'agent-file-sharing',
    title: 'Unsanctioned file sharing between collaborating agents',
    quote:
      'Agents used public file-hosting websites to share files when they could not access one another’s local files.',
    reportedDetail: 'Reported context: the task required the agents to keep files local only.',
    reportedSource: 'marktechpost.com, 2026-09-17',
    track: 'ready',
  },
];

export const SOURCE_URL = 'https://openai.com/index/model-misalignment-reporting-framework/';
