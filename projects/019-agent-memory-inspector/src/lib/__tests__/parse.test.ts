import { describe, it, expect } from "vitest";
import { parseMemories, normalize } from "../parse";

describe("parseMemories", () => {
  it("parses a top-level array", () => {
    const { records, errors } = parseMemories('[{"scope":"user","content":"hi"}]');
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("m1");
    expect(errors).toHaveLength(0);
  });

  it("parses an object with a memories array", () => {
    const { records } = parseMemories('{"memories":[{"scope":"session","content":"x"}]}');
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe("session");
  });

  it("reports invalid JSON without throwing", () => {
    const { records, errors } = parseMemories("{not json");
    expect(records).toHaveLength(0);
    expect(errors[0]).toMatch(/Invalid JSON/);
  });

  it("rejects a non-array, non-memories shape", () => {
    const { records, errors } = parseMemories('{"foo":1}');
    expect(records).toHaveLength(0);
    expect(errors[0]).toMatch(/Expected a JSON array/);
  });

  it("skips rows without content but keeps the rest", () => {
    const { records, errors } = parseMemories('[{"scope":"user"},{"scope":"user","content":"ok"}]');
    expect(records).toHaveLength(1);
    expect(errors.some((e) => /missing "content"/.test(e))).toBe(true);
  });

  it("defaults an unknown scope to session with an error", () => {
    const { records, errors } = parseMemories('[{"scope":"global","content":"x"}]');
    expect(records[0].scope).toBe("session");
    expect(errors.some((e) => /not one of/.test(e))).toBe(true);
  });

  it("keeps only string tags", () => {
    const { records } = parseMemories('[{"scope":"user","content":"x","tags":["a",2,"b"]}]');
    expect(records[0].tags).toEqual(["a", "b"]);
  });
});

describe("normalize", () => {
  it("derives expiresAt from ttlSeconds + createdAt", () => {
    const [n] = normalize([
      { id: "a", scope: "session", content: "x", createdAt: "2026-01-01T00:00:00Z", ttlSeconds: 3600 },
    ]);
    expect(n.expiresAtMs).toBe(Date.parse("2026-01-01T01:00:00Z"));
  });

  it("prefers explicit expiresAt over ttlSeconds", () => {
    const [n] = normalize([
      {
        id: "a",
        scope: "session",
        content: "x",
        createdAt: "2026-01-01T00:00:00Z",
        ttlSeconds: 3600,
        expiresAt: "2026-02-01T00:00:00Z",
      },
    ]);
    expect(n.expiresAtMs).toBe(Date.parse("2026-02-01T00:00:00Z"));
  });

  it("leaves expiry null when there is neither ttl nor expiresAt", () => {
    const [n] = normalize([{ id: "a", scope: "user", content: "x", createdAt: "2026-01-01T00:00:00Z" }]);
    expect(n.expiresAtMs).toBeNull();
    expect(n.createdAtMs).toBe(Date.parse("2026-01-01T00:00:00Z"));
  });

  it("marks an unparseable createdAt as null", () => {
    const [n] = normalize([{ id: "a", scope: "user", content: "x", createdAt: "not-a-date" }]);
    expect(n.createdAtMs).toBeNull();
  });
});
