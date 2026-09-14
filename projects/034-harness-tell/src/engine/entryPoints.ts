import type { EntryKind } from './types';
import { eraForVersion, type DetectorEra } from './detect';

/**
 * Libraries that pull `huggingface_hub` in without the caller importing it.
 *
 * Every `requires` string below was read from the package's PyPI metadata
 * (Requires-Dist) on 2026-09-14 for the version shown. Nothing is inferred:
 * if a library is not here, it was not checked, not "does not depend".
 */
export interface EntryPoint {
  id: string;
  kind: EntryKind;
  label: string;
  /** What the visitor's code looks like. */
  call: string;
  /** The direct dependency line, verbatim from PyPI, or null for the CLI / no direct dependency. */
  requires: string | null;
  version: string; // version of the library whose metadata was read
  /** Newest huggingface_hub the constraint admits, given 1.31.0 is the latest release. */
  resolves: string;
  note?: string;
}

export const LATEST_HF_HUB = '1.31.0';

export const ENTRY_POINTS: EntryPoint[] = [
  {
    id: 'transformers',
    kind: 'sdk',
    label: 'transformers',
    call: 'AutoModel.from_pretrained("…")',
    requires: 'huggingface-hub<2.0,>=1.5.0',
    version: '5.17.0',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'sentence-transformers',
    kind: 'sdk',
    label: 'sentence-transformers',
    call: 'SentenceTransformer("all-MiniLM-L6-v2")',
    requires: 'huggingface-hub<2.0.0,>=1.3.0',
    version: '6.0.1',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'faster-whisper',
    kind: 'sdk',
    label: 'faster-whisper',
    call: 'WhisperModel("large-v3")',
    requires: 'huggingface-hub>=0.21',
    version: '1.2.1',
    resolves: LATEST_HF_HUB,
    note: 'The library named in the r/LocalLLaMA report. Its own dependency, ctranslate2 4.8.2, does not require huggingface_hub — the tag rides in on faster-whisper alone.',
  },
  {
    id: 'diffusers',
    kind: 'sdk',
    label: 'diffusers',
    call: 'DiffusionPipeline.from_pretrained("…")',
    requires: 'huggingface-hub<2.0,>=1.23.0',
    version: '0.40.0',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'datasets',
    kind: 'sdk',
    label: 'datasets',
    call: 'load_dataset("…")',
    requires: 'huggingface-hub<2.0,>=0.25.0',
    version: '5.0.1',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'peft',
    kind: 'sdk',
    label: 'peft',
    call: 'PeftModel.from_pretrained(base, "…")',
    requires: 'huggingface-hub>=0.25.0',
    version: '0.20.0',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'timm',
    kind: 'sdk',
    label: 'timm',
    call: 'timm.create_model("…", pretrained=True)',
    requires: 'huggingface_hub',
    version: '1.0.29',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'gradio',
    kind: 'sdk',
    label: 'gradio',
    call: 'gr.load("models/…")',
    requires: 'huggingface-hub<2.0,>=1.16.0',
    version: '6.27.0',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'smolagents',
    kind: 'sdk',
    label: 'smolagents',
    call: 'InferenceClientModel()',
    requires: 'huggingface-hub>=0.31.2',
    version: '1.26.0',
    resolves: LATEST_HF_HUB,
  },
  {
    id: 'whisperx',
    kind: 'sdk',
    label: 'whisperx',
    call: 'whisperx.load_model("large-v2")',
    requires: 'huggingface-hub<1.0.0',
    version: '3.8.6',
    resolves: '0.36.x',
    note: 'Pinned below 1.0 — this resolver never installs a client with agent detection. The version constraint, not any opt-out, is what keeps whisperx users untagged.',
  },
  {
    id: 'trl',
    kind: 'sdk',
    label: 'trl',
    call: 'SFTTrainer(...)',
    requires: null,
    version: '1.13.0',
    resolves: LATEST_HF_HUB,
    note: 'No direct requirement on huggingface_hub — it arrives through transformers.',
  },
  {
    id: 'hf-download',
    kind: 'cli',
    label: 'hf download (CLI)',
    call: 'hf download <repo> <file>',
    requires: null,
    version: LATEST_HF_HUB,
    resolves: LATEST_HF_HUB,
    note: 'The CLI resolves the registry at startup to pick its output mode, before any command runs.',
  },
  {
    id: 'hf-env',
    kind: 'hf-env',
    label: 'hf env (CLI)',
    call: 'hf env',
    requires: null,
    version: LATEST_HF_HUB,
    resolves: LATEST_HF_HUB,
    note: 'Prints "Run by AI agent ? Yes/No" — the one place the SDK tells you what it decided.',
  },
];

export function entryPoint(id: string): EntryPoint {
  const e = ENTRY_POINTS.find((x) => x.id === id);
  if (!e) throw new Error(`unknown entry point ${id}`);
  return e;
}

export function eraForEntry(e: EntryPoint): DetectorEra {
  return eraForVersion(e.resolves);
}

/** Client versions the visitor can pin, with what each one does. */
export const HF_HUB_VERSIONS: { version: string; label: string; era: DetectorEra }[] = [
  { version: '0.36.0', label: '0.36 — before detection', era: 'none' },
  { version: '1.8.0', label: '1.8 — before detection', era: 'none' },
  { version: '1.10.0', label: '1.10 — hardcoded list', era: 'legacy' },
  { version: '1.18.0', label: '1.18 — hardcoded list', era: 'legacy' },
  { version: '1.19.0', label: '1.19 — dynamic registry', era: 'registry' },
  { version: '1.31.0', label: '1.31 — latest (10 Sep 2026)', era: 'registry' },
];
