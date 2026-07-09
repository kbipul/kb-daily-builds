// Thin wrapper around a transformers.js text-classification pipeline.
// The model (DistilBERT fine-tuned on SST-2) is downloaded once from the
// Hugging Face CDN, cached by the browser, and then runs fully on-device.
// The pipeline is imported dynamically and given a narrow local type so the
// app paints instantly and the tests never touch the network.
import { toSigned, type RawResult } from "./text";

const MODEL_ID = "Xenova/distilbert-base-uncased-finetuned-sst-2-english";

type Classifier = (text: string) => Promise<RawResult[]>;

let pipePromise: Promise<Classifier> | null = null;

export type ProgressCallback = (status: string, pct: number) => void;

/** Lazily construct (and cache) the sentiment pipeline. */
export function getSentiment(onProgress?: ProgressCallback): Promise<Classifier> {
  pipePromise ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const pipe = await pipeline("text-classification", MODEL_ID, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (onProgress) onProgress(p.status ?? "", Math.round(p.progress ?? 0));
      },
    });
    return pipe as unknown as Classifier;
  })();
  return pipePromise;
}

/** Classify one sentence and return a signed sentiment in [-1, 1]. */
export async function scoreSentence(text: string): Promise<number> {
  const pipe = await getSentiment();
  const out = await pipe(text);
  return toSigned(out[0]);
}
