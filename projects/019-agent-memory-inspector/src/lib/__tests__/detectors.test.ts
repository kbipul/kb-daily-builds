import { describe, it, expect } from "vitest";
import { normalize } from "../parse";
import {
  DEFAULT_OPTIONS,
  detectExpired,
  detectStale,
  detectScopeLeaks,
  detectContradictions,
  detectPII,
  detectDuplicates,
  detectProvenance,
  detectUnboundedGrowth,
  extractAssertions,
} from "../detectors";
import { MemoryRecord } from "../types";

const opts = DEFAULT_OPTIONS;

function norm(recs: MemoryRecord[]) {
  return normalize(recs);
}

describe("detectExpired", () => {
  it("flags a memory whose TTL has elapsed", () => {
    const m = norm([
      { id: "a", scope: "session", content: "x", createdAt: "2026-04-01T00:00:00Z", ttlSeconds: 604800 },
    ]);
    const f = detectExpired(m, opts);
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("high");
  });

  it("does not flag a still-valid TTL", () => {
    const m = norm([
      { id: "a", scope: "session", content: "x", createdAt: "2026-07-25T00:00:00Z", ttlSeconds: 604800 },
    ]);
    expect(detectExpired(m, opts)).toHaveLength(0);
  });

  it("ignores memories without any expiry", () => {
    const m = norm([{ id: "a", scope: "user", content: "x", createdAt: "2020-01-01T00:00:00Z" }]);
    expect(detectExpired(m, opts)).toHaveLength(0);
  });
});

describe("detectStale", () => {
  it("flags an old memory with no TTL", () => {
    const m = norm([{ id: "a", scope: "user", content: "x", createdAt: "2026-01-01T00:00:00Z" }]);
    expect(detectStale(m, opts)).toHaveLength(1);
  });

  it("does not flag a recent memory", () => {
    const m = norm([{ id: "a", scope: "user", content: "x", createdAt: "2026-07-20T00:00:00Z" }]);
    expect(detectStale(m, opts)).toHaveLength(0);
  });

  it("does not double-count a TTL'd memory as stale", () => {
    const m = norm([
      { id: "a", scope: "session", content: "x", createdAt: "2026-01-01T00:00:00Z", ttlSeconds: 3600 },
    ]);
    expect(detectStale(m, opts)).toHaveLength(0);
  });
});

describe("detectScopeLeaks", () => {
  it("flags a durable fact stored in session scope", () => {
    const m = norm([{ id: "a", scope: "session", content: "The user's timezone is IST." }]);
    const f = detectScopeLeaks(m);
    expect(f.some((x) => x.detector === "scope-durable-in-session")).toBe(true);
  });

  it("flags transient state stored in user scope", () => {
    const m = norm([{ id: "a", scope: "user", content: "User is currently on a trial." }]);
    const f = detectScopeLeaks(m);
    expect(f.some((x) => x.detector === "scope-ephemeral-in-user")).toBe(true);
  });

  it("leaves correctly-scoped memories alone", () => {
    const m = norm([
      { id: "a", scope: "session", content: "User is comparing two plans right now." },
      { id: "b", scope: "user", content: "Account tier is Team." },
    ]);
    // 'right now' in a *session* memory is fine; user 'Account tier' is durable & correct
    expect(detectScopeLeaks(m).filter((x) => x.memoryIds.includes("b"))).toHaveLength(0);
  });
});

describe("extractAssertions / detectContradictions", () => {
  it("extracts an is-assertion", () => {
    const [m] = norm([{ id: "a", scope: "user", content: "User timezone is PST." }]);
    const a = extractAssertions(m);
    expect(a[0].subject).toBe("user timezone");
    expect(a[0].value).toBe("pst");
  });

  it("normalizes possessive and articles so subjects match", () => {
    const m = norm([
      { id: "a", scope: "user", content: "The user's timezone is IST." },
      { id: "b", scope: "user", content: "User timezone is PST." },
    ]);
    const f = detectContradictions(m, opts);
    expect(f).toHaveLength(1);
    expect(f[0].memoryIds.sort()).toEqual(["a", "b"]);
    expect(f[0].severity).toBe("high");
  });

  it("does not flag when both memories agree", () => {
    const m = norm([
      { id: "a", scope: "user", content: "User timezone is IST." },
      { id: "b", scope: "user", content: "The user's timezone is IST." },
    ]);
    expect(detectContradictions(m, opts)).toHaveLength(0);
  });

  it("ignores an expired memory when judging contradictions", () => {
    const m = norm([
      { id: "a", scope: "user", content: "User timezone is PST." },
      {
        id: "b",
        scope: "session",
        content: "User timezone is IST.",
        createdAt: "2026-01-01T00:00:00Z",
        ttlSeconds: 3600,
      },
    ]);
    expect(detectContradictions(m, opts)).toHaveLength(0);
  });

  it("handles a prefers-assertion", () => {
    const m = norm([
      { id: "a", scope: "user", content: "User prefers dark mode." },
      { id: "b", scope: "user", content: "User prefers light mode." },
    ]);
    const f = detectContradictions(m, opts);
    expect(f).toHaveLength(1);
  });
});

describe("detectPII", () => {
  it("flags an email and phone", () => {
    const m = norm([
      { id: "a", scope: "user", content: "email is a.b@example.com and phone +91 98765 43210" },
    ]);
    const f = detectPII(m);
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/email/);
    expect(f[0].message).toMatch(/persists across runs/);
  });

  it("flags a Luhn-valid card but not a random number", () => {
    const good = norm([{ id: "a", scope: "user", content: "card 4111 1111 1111 1111" }]);
    const bad = norm([{ id: "b", scope: "user", content: "order 1234 5678 9012 3456" }]);
    expect(detectPII(good)).toHaveLength(1);
    expect(detectPII(bad)).toHaveLength(0);
  });

  it("flags provider secrets without embedding a literal secret in source", () => {
    // Built at runtime so no committed file contains a real-looking token.
    const key = "sk-" + "A".repeat(24);
    const m = norm([{ id: "a", scope: "procedural", content: `stored key ${key}` }]);
    const f = detectPII(m);
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/API key/);
  });

  it("does not flag clean content", () => {
    const m = norm([{ id: "a", scope: "user", content: "User likes concise answers." }]);
    expect(detectPII(m)).toHaveLength(0);
  });
});

describe("detectDuplicates", () => {
  it("clusters near-duplicate memories", () => {
    const m = norm([
      { id: "a", scope: "procedural", content: "To issue a refund open the billing panel and click refund" },
      { id: "b", scope: "procedural", content: "To issue a refund open the billing panel then click refund" },
      { id: "c", scope: "user", content: "totally unrelated content about languages" },
    ]);
    const f = detectDuplicates(m, opts);
    expect(f).toHaveLength(1);
    expect(f[0].memoryIds.sort()).toEqual(["a", "b"]);
  });

  it("does not cluster distinct memories", () => {
    const m = norm([
      { id: "a", scope: "user", content: "the sky is blue today" },
      { id: "b", scope: "user", content: "refund policy runbook steps" },
    ]);
    expect(detectDuplicates(m, opts)).toHaveLength(0);
  });
});

describe("detectProvenance", () => {
  it("flags a memory missing source and createdAt", () => {
    const m = norm([{ id: "a", scope: "user", content: "x" }]);
    const f = detectProvenance(m);
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/source and createdAt/);
  });

  it("passes a fully-provenanced memory", () => {
    const m = norm([
      { id: "a", scope: "user", content: "x", createdAt: "2026-07-01T00:00:00Z", source: "conv:1" },
    ]);
    expect(detectProvenance(m)).toHaveLength(0);
  });
});

describe("detectUnboundedGrowth", () => {
  it("flags a scope over the record cap", () => {
    const recs: MemoryRecord[] = [];
    for (let i = 0; i < 45; i++) recs.push({ id: `s${i}`, scope: "session", content: `turn ${i}` });
    const f = detectUnboundedGrowth(norm(recs), opts);
    expect(f.some((x) => x.message.includes("SESSION"))).toBe(true);
  });

  it("flags a scope over the token cap even under the record cap", () => {
    const big = "word ".repeat(6000);
    const f = detectUnboundedGrowth(norm([{ id: "a", scope: "user", content: big }]), opts);
    expect(f.some((x) => x.message.includes("tokens"))).toBe(true);
  });

  it("stays quiet for a small store", () => {
    const f = detectUnboundedGrowth(norm([{ id: "a", scope: "user", content: "small" }]), opts);
    expect(f).toHaveLength(0);
  });
});
