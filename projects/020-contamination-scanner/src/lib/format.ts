import { Verdict } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  exact: "Exact copy",
  ngram: "N-gram overlap",
  "near-dup": "Near-duplicate",
  clean: "Clean",
};

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}
