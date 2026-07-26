import { describe, it, expect } from "vitest";
import { bm25Rank, simulateRetrieval } from "../retrieval";
import { runAllDetectors, DEFAULT_OPTIONS } from "../detectors";
import { normalize } from "../parse";
import { MemoryRecord } from "../types";

const NOW = DEFAULT_OPTIONS.now;

describe("bm25Rank", () => {
  it("ranks the memory that matches the query terms first", () => {
    const mem = normalize([
      { id: "a", scope: "user", content: "the user's timezone is IST" },
      { id: "b", scope: "user", content: "the user prefers dark mode" },
      { id: "c", scope: "user", content: "refund runbook steps" },
    ]);
    const r = bm25Rank(mem, "what timezone is the user in", 3);
    expect(r[0].id).toBe("a");
  });

  it("returns nothing for a query with no term overlap", () => {
    const mem = normalize([{ id: "a", scope: "user", content: "alpha beta" }]);
    expect(bm25Rank(mem, "zzz qqq", 3)).toHaveLength(0);
  });

  it("returns an empty list for an empty store", () => {
    expect(bm25Rank([], "anything", 3)).toHaveLength(0);
  });
});

describe("simulateRetrieval", () => {
  const store: MemoryRecord[] = [
    { id: "a", scope: "session", content: "The user's timezone is IST." },
    { id: "b", scope: "user", content: "User timezone is PST." },
  ];

  it("warns when two recalled memories contradict each other", () => {
    const mem = normalize(store);
    const findings = runAllDetectors(mem, DEFAULT_OPTIONS);
    const res = simulateRetrieval(mem, findings, "what timezone is the user in", NOW, 5);
    expect(res.hits.length).toBeGreaterThanOrEqual(2);
    expect(res.warnings.some((w) => /CONTRADICT/.test(w))).toBe(true);
  });

  it("warns when the top recalled memory is expired", () => {
    const expiredStore: MemoryRecord[] = [
      {
        id: "a",
        scope: "session",
        content: "deployment target is Azure",
        createdAt: "2026-01-01T00:00:00Z",
        ttlSeconds: 3600,
      },
    ];
    const mem = normalize(expiredStore);
    const findings = runAllDetectors(mem, DEFAULT_OPTIONS);
    const res = simulateRetrieval(mem, findings, "what is the deployment target", NOW, 5);
    expect(res.warnings.some((w) => /EXPIRED/.test(w))).toBe(true);
  });

  it("warns when a recalled memory carries PII", () => {
    const piiStore: MemoryRecord[] = [
      { id: "a", scope: "user", content: "user email is a.b@example.com" },
    ];
    const mem = normalize(piiStore);
    const findings = runAllDetectors(mem, DEFAULT_OPTIONS);
    const res = simulateRetrieval(mem, findings, "what is the user email", NOW, 5);
    expect(res.warnings.some((w) => /PII/.test(w))).toBe(true);
  });

  it("notes when nothing matches", () => {
    const mem = normalize(store);
    const res = simulateRetrieval(mem, [], "unrelated zzzq", NOW, 5);
    expect(res.hits).toHaveLength(0);
    expect(res.warnings[0]).toMatch(/No memory matches/);
  });
});
