// Thin wrapper around a transformers.js feature-extraction pipeline. The model
// (all-MiniLM-L6-v2, ~23MB) is downloaded once from the Hugging Face CDN,
// cached by the browser, and then runs fully on-device — no API key, no server.
// It maps each passage/query to a 384-dim, L2-normalized embedding so cosine
// similarity is meaningful. Imported dynamically with a narrow local type so
// the pure math in vec.ts stays network-free and testable.
// (Embedding-pipeline shape reused from my earlier build, Day 005 "Similar or Not".)
import type { Vec } from "./vec";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

interface Tensorish {
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

/** Embed a batch of texts into L2-normalized vectors. */
export async function embed(
  texts: string[],
  onProgress?: ProgressCallback,
): Promise<Vec[]> {
  const pipe = await getEmbedder(onProgress);
  const out = await pipe(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}
