// Thin wrapper around a transformers.js zero-shot-classification pipeline.
// A small DeBERTa model fine-tuned on NLI is downloaded once from the Hugging
// Face CDN, cached by the browser, and then runs fully on-device. "Zero-shot"
// means it classifies into labels it was never trained on, by framing each
// label as a natural-language entailment hypothesis. The pipeline is imported
// dynamically and given a narrow local type to keep the app light and tests
// network-free.
import { normalizeResult, type RawZeroShot, type Scored } from "./labels";

const MODEL_ID = "Xenova/nli-deberta-v3-xsmall";

type ZeroShot = (
  text: string,
  labels: string[],
  opts: { multi_label: boolean },
) => Promise<RawZeroShot>;

let pipePromise: Promise<ZeroShot> | null = null;

export type ProgressCallback = (status: string, pct: number) => void;

/** Lazily construct (and cache) the zero-shot pipeline. */
export function getClassifier(onProgress?: ProgressCallback): Promise<ZeroShot> {
  pipePromise ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    // Cast past the huge task-keyed overload union (TS2590) to a loose builder.
    const build = pipeline as unknown as (
      task: string,
      model: string,
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    const pipe = await build("zero-shot-classification", MODEL_ID, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (onProgress) onProgress(p.status ?? "", Math.round(p.progress ?? 0));
      },
    });
    return pipe as ZeroShot;
  })();
  return pipePromise;
}

/**
 * Classify `text` against `labels`.
 * @param multiLabel when true, each label is scored independently (scores need
 *   not sum to 1); otherwise the model returns a single softmax distribution.
 */
export async function classify(
  text: string,
  labels: string[],
  multiLabel: boolean,
): Promise<Scored[]> {
  const pipe = await getClassifier();
  const out = await pipe(text, labels, { multi_label: multiLabel });
  return normalizeResult(out);
}
