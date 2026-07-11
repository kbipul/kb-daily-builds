// Thin wrapper around a transformers.js feature-extraction pipeline. The model
// (all-MiniLM-L6-v2, ~23MB) is downloaded once from the Hugging Face CDN,
// cached by the browser, and then runs fully on-device. It maps each sentence
// to a 384-dim embedding; mean pooling + L2 normalization make cosine
// similarity meaningful. Imported dynamically with a narrow local type so the
// pure math in vec.ts stays network-free and testable.
import type { Vec } from "./vec";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

interface Tensorish {
  // transformers.js Tensor exposes tolist(); typed loosely on purpose.
  tolist: () => number[][];
}
type Embedder = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<Tensorish>;

let pipePromise: Promise<Embedder> | null = null;

export type ProgressCallback = (status: string, pct: number) => void;

/** Lazily construct (and cache) the embedding pipeline. */
export function getEmbedder(onProgress?: ProgressCallback): Promise<Embedder> {
  pipePromise ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const build = pipeline as unknown as (
      task: string,
      model: string,
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    const pipe = await build("feature-extraction", MODEL_ID, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (onProgress) onProgress(p.status ?? "", Math.round(p.progress ?? 0));
      },
    });
    return pipe as Embedder;
  })();
  return pipePromise;
}

/** Embed a batch of sentences into L2-normalized vectors. */
export async function embed(texts: string[]): Promise<Vec[]> {
  const pipe = await getEmbedder();
  const out = await pipe(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}
