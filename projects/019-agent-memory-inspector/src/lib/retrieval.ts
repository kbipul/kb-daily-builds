import { Finding, NormalizedMemory, RetrievalHit, RetrievalResult } from "./types";
import { tokenize } from "./tokens";

// Okapi BM25 over the memory store — a faithful (if small) model of how an
// agent retrieves relevant memories for the next turn. Deterministic, no model
// download. k1/b are the standard defaults.
const K1 = 1.5;
const B = 0.75;

interface Indexed {
  mem: NormalizedMemory;
  terms: string[];
  len: number;
}

function docText(m: NormalizedMemory): string {
  return m.content + " " + (m.tags ? m.tags.join(" ") : "");
}

export function bm25Rank(mem: NormalizedMemory[], query: string, topK = 5): { id: string; score: number }[] {
  const docs: Indexed[] = mem.map((m) => {
    const terms = tokenize(docText(m));
    return { mem: m, terms, len: terms.length };
  });
  const N = docs.length;
  if (N === 0) return [];
  const avgdl = docs.reduce((a, d) => a + d.len, 0) / N || 1;

  // Document frequency per term.
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = (t: string): number => {
    const n = df.get(t) ?? 0;
    // BM25+ style idf, floored at a small positive so common terms still rank.
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  const qTerms = tokenize(query);
  const scored = docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let s = 0;
    for (const qt of qTerms) {
      const f = tf.get(qt) ?? 0;
      if (f === 0) continue;
      const num = f * (K1 + 1);
      const den = f + K1 * (1 - B + B * (d.len / avgdl));
      s += idf(qt) * (num / den);
    }
    return { id: d.mem.id, score: s };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, topK);
}

/**
 * Simulate what the agent would recall for a query, and — the point of the whole
 * tool — surface the CONSEQUENCE: if the memories it would actually use are
 * expired or contradict each other, the answer is poisoned before the model
 * even runs.
 */
export function simulateRetrieval(
  mem: NormalizedMemory[],
  findings: Finding[],
  query: string,
  now: number,
  topK = 5
): RetrievalResult {
  const ranked = bm25Rank(mem, query, topK);
  const byId = new Map(mem.map((m) => [m.id, m]));
  const hits: RetrievalHit[] = ranked.map((r) => {
    const memory = byId.get(r.id)!;
    const flags = findings.filter((f) => f.memoryIds.includes(r.id));
    return { id: r.id, score: r.score, memory, flags };
  });

  const warnings: string[] = [];
  if (hits.length === 0) {
    warnings.push("No memory matches this query — the agent would answer from the base model alone.");
    return { query, hits, warnings };
  }

  const top = hits[0];
  if (top.memory.expiresAtMs !== null && now >= top.memory.expiresAtMs) {
    warnings.push(`Top recalled memory "${top.id}" is EXPIRED — the agent would answer from stale state.`);
  }

  // Do any two recalled memories contradict each other?
  const recalledIds = new Set(hits.map((h) => h.id));
  for (const f of findings) {
    if (f.detector !== "contradiction") continue;
    const inPlay = f.memoryIds.filter((id) => recalledIds.has(id));
    if (inPlay.length >= 2) {
      warnings.push(`Recalled memories ${inPlay.join(" & ")} CONTRADICT each other — retrieval order alone decides the answer.`);
    }
  }

  const piiHit = hits.find((h) => h.flags.some((f) => f.detector === "pii"));
  if (piiHit) {
    warnings.push(`Recalled memory "${piiHit.id}" carries candidate PII/secrets into the prompt.`);
  }

  return { query, hits, warnings };
}
