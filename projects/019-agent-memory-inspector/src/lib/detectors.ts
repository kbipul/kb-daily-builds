import { Finding, NormalizedMemory, Scope } from "./types";
import { estimateTokens, jaccard, normPhrase } from "./tokens";

export interface DetectorOptions {
  /** epoch ms treated as "now" for TTL / staleness. */
  now: number;
  /** A memory with no TTL older than this many days is flagged stale. */
  staleDays: number;
  /** Near-duplicate Jaccard threshold. */
  dupThreshold: number;
  /** Per-scope record-count cap before "unbounded growth" fires. */
  recordCap: number;
  /** Per-scope rough-token cap before "unbounded growth" fires. */
  tokenCap: number;
}

export const DEFAULT_OPTIONS: DetectorOptions = {
  now: Date.parse("2026-07-26T00:00:00Z"),
  staleDays: 90,
  dupThreshold: 0.8,
  recordCap: 40,
  tokenCap: 6000,
};

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function detectExpired(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  const out: Finding[] = [];
  for (const m of mem) {
    if (m.expiresAtMs !== null && o.now >= m.expiresAtMs) {
      const daysAgo = Math.floor((o.now - m.expiresAtMs) / DAY_MS);
      out.push({
        detector: "expired",
        severity: "high",
        memoryIds: [m.id],
        message: `Memory "${m.id}" (${m.scope}) expired ${daysAgo} day(s) ago but is still in the store — a live retrieval could surface stale state.`,
      });
    }
  }
  return out;
}

export function detectStale(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  const out: Finding[] = [];
  for (const m of mem) {
    if (m.expiresAtMs !== null) continue; // TTL'd memories are handled by expired
    if (m.createdAtMs === null) continue; // provenance detector handles this
    const ageDays = (o.now - m.createdAtMs) / DAY_MS;
    if (ageDays > o.staleDays) {
      out.push({
        detector: "stale",
        severity: "low",
        memoryIds: [m.id],
        message: `Memory "${m.id}" (${m.scope}) is ${Math.floor(ageDays)} days old with no TTL — no expiry policy means it lives forever. Advisory.`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scope hygiene
// ---------------------------------------------------------------------------

// Phrases that signal a durable fact (belongs in user/procedural, not session).
const DURABLE_RE =
  /\b(prefers?|preferred|always|never|my name is|the user'?s? name|timezone is|speaks|based in|works at|role is|default|policy is)\b/i;
// Phrases that signal ephemeral state (should NOT persist in user/procedural).
const EPHEMERAL_RE =
  /\b(currently|right now|today|this session|for now|temporarily|just now|at the moment|in progress|logged in from)\b/i;

export function detectScopeLeaks(mem: NormalizedMemory[]): Finding[] {
  const out: Finding[] = [];
  for (const m of mem) {
    if (m.scope === "session" && DURABLE_RE.test(m.content)) {
      out.push({
        detector: "scope-durable-in-session",
        severity: "medium",
        memoryIds: [m.id],
        message: `Memory "${m.id}" reads like a durable fact but sits in SESSION scope — it will be forgotten when the session ends. Consider promoting to user scope.`,
      });
    }
    if ((m.scope === "user" || m.scope === "procedural") && EPHEMERAL_RE.test(m.content)) {
      out.push({
        detector: "scope-ephemeral-in-user",
        severity: "medium",
        memoryIds: [m.id],
        message: `Memory "${m.id}" reads like transient state but sits in ${m.scope.toUpperCase()} scope — it will wrongly persist across future runs. Consider session scope or a TTL.`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contradiction — structured assertions only; never claims to grasp meaning
// ---------------------------------------------------------------------------

interface Assertion {
  subject: string;
  value: string;
  id: string;
}

const ARTICLE_RE = /^(the|a|an)\s+/i;

function normSubject(s: string): string {
  // Strip the possessive BEFORE punctuation removal (which would delete the
  // apostrophe and leave a bare "s"), so "the user's timezone" and "user
  // timezone" collapse to the same subject.
  return s
    .toLowerCase()
    .replace(/['\u2019]s\b/g, "")
    .replace(/[.!?,;:'"\u2019]+/g, "")
    .replace(/[\s_]+/g, " ")
    .trim()
    .replace(ARTICLE_RE, "")
    .trim();
}

/** Pull "<subject> is/are/=/: <value>" and "<x> prefers <value>" assertions. */
export function extractAssertions(m: NormalizedMemory): Assertion[] {
  const res: Assertion[] = [];
  const clauses = m.content.split(/[.;\n]/);
  for (const raw of clauses) {
    const clause = raw.trim();
    if (!clause) continue;

    let mm = clause.match(/^(.{2,50}?)\s+prefers?\s+(.{1,40})$/i);
    if (mm) {
      res.push({ subject: normSubject(mm[1]) + " preference", value: normPhrase(mm[2]), id: m.id });
      continue;
    }
    mm = clause.match(/^(.{2,50}?)\s*(?:=|:)\s*(.{1,40})$/);
    if (mm) {
      res.push({ subject: normSubject(mm[1]), value: normPhrase(mm[2]), id: m.id });
      continue;
    }
    mm = clause.match(/^(.{2,50}?)\s+(?:is|are)\s+(.{1,40})$/i);
    if (mm) {
      res.push({ subject: normSubject(mm[1]), value: normPhrase(mm[2]), id: m.id });
      continue;
    }
  }
  return res.filter((a) => a.subject.length >= 3 && a.value.length >= 1 && a.subject.split(" ").length <= 6);
}

export function detectContradictions(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  // Only consider currently-valid memories: an expired memory contradicting a
  // live one is an expiry problem, not a contradiction.
  const live = mem.filter((m) => m.expiresAtMs === null || o.now < m.expiresAtMs);
  const bySubject = new Map<string, Assertion[]>();
  for (const m of live) {
    for (const a of extractAssertions(m)) {
      const list = bySubject.get(a.subject) ?? [];
      list.push(a);
      bySubject.set(a.subject, list);
    }
  }
  const out: Finding[] = [];
  for (const [subject, asserts] of bySubject) {
    const values = new Map<string, string[]>(); // value -> memory ids
    for (const a of asserts) {
      const ids = values.get(a.value) ?? [];
      if (!ids.includes(a.id)) ids.push(a.id);
      values.set(a.value, ids);
    }
    if (values.size >= 2) {
      const ids = Array.from(new Set(asserts.map((a) => a.id)));
      const rendered = Array.from(values.keys()).map((v) => `"${v}"`).join(" vs ");
      out.push({
        detector: "contradiction",
        severity: "high",
        memoryIds: ids,
        message: `Conflicting values for "${subject}": ${rendered}. The agent holds both as current — retrieval order decides which one wins. (Pattern match, not a semantic judgement.)`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Candidate PII / secrets — pattern-based, labelled as candidates
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// A phone is a 7-12 digit run; longer digit runs are card/order-like and are
// handled by the Luhn card check instead, so the two never fight.
function looksLikePhone(text: string): boolean {
  const runs = text.match(/\+?\d[\d\s().-]{5,}\d/g);
  if (!runs) return false;
  return runs.some((r) => {
    const d = r.replace(/\D/g, "");
    return d.length >= 7 && d.length <= 12;
  });
}
const CARD_RE = /\b(?:\d[ -]?){13,16}\b/;
// Provider secret prefixes. Built so this source file never embeds a literal
// token that would trip the repo's own mechanical secret scan.
const SECRET_RES: RegExp[] = [
  new RegExp("sk-[A-Za-z0-9]{16,}"),
  new RegExp("ghp" + "_[A-Za-z0-9]{20,}"),
  new RegExp("AKIA[0-9A-Z]{16}"),
  new RegExp("AIza[A-Za-z0-9_-]{20,}"),
];

function luhnOk(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectPII(mem: NormalizedMemory[]): Finding[] {
  const out: Finding[] = [];
  for (const m of mem) {
    const kinds: string[] = [];
    if (EMAIL_RE.test(m.content)) kinds.push("email address");
    if (looksLikePhone(m.content)) kinds.push("phone number");
    const card = m.content.match(CARD_RE);
    if (card && luhnOk(card[0])) kinds.push("card-like number (passes Luhn)");
    if (SECRET_RES.some((re) => re.test(m.content))) kinds.push("API key / secret");
    if (kinds.length) {
      const persists = m.scope === "user" || m.scope === "procedural";
      out.push({
        detector: "pii",
        severity: "high",
        memoryIds: [m.id],
        message: `Memory "${m.id}" (${m.scope}) contains candidate ${kinds.join(", ")}${persists ? " in a scope that persists across runs" : ""}. Verify before storing PII/secrets in agent memory.`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Duplicates & bloat
// ---------------------------------------------------------------------------

export function detectDuplicates(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  const n = mem.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (jaccard(mem[i].content, mem[j].content) >= o.dupThreshold) union(i, j);
    }
  }
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = clusters.get(r) ?? [];
    list.push(i);
    clusters.set(r, list);
  }
  const out: Finding[] = [];
  for (const idxs of clusters.values()) {
    if (idxs.length >= 2) {
      const ids = idxs.map((i) => mem[i].id);
      out.push({
        detector: "duplicate",
        severity: "low",
        memoryIds: ids,
        message: `${ids.length} near-duplicate memories (${ids.join(", ")}) — memory bloat inflates retrieval cost and can double-count a fact. Consider de-duplicating.`,
      });
    }
  }
  return out;
}

export function detectProvenance(mem: NormalizedMemory[]): Finding[] {
  const out: Finding[] = [];
  for (const m of mem) {
    const missing: string[] = [];
    if (!m.source) missing.push("source");
    if (m.createdAtMs === null) missing.push("createdAt");
    if (missing.length) {
      out.push({
        detector: "missing-provenance",
        severity: "low",
        memoryIds: [m.id],
        message: `Memory "${m.id}" is missing ${missing.join(" and ")} — it cannot be audited or aged out. Advisory.`,
      });
    }
  }
  return out;
}

export function detectUnboundedGrowth(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  const scopes: Scope[] = ["procedural", "user", "session"];
  const out: Finding[] = [];
  for (const s of scopes) {
    const inScope = mem.filter((m) => m.scope === s);
    const tokens = inScope.reduce((acc, m) => acc + estimateTokens(m.content), 0);
    if (inScope.length > o.recordCap) {
      out.push({
        detector: "unbounded-growth",
        severity: "medium",
        memoryIds: inScope.map((m) => m.id),
        message: `${s.toUpperCase()} scope holds ${inScope.length} memories (cap ${o.recordCap}) — unbounded growth degrades retrieval precision and cost. Add pruning/TTL.`,
      });
    } else if (tokens > o.tokenCap) {
      out.push({
        detector: "unbounded-growth",
        severity: "medium",
        memoryIds: inScope.map((m) => m.id),
        message: `${s.toUpperCase()} scope is ~${tokens} tokens (cap ${o.tokenCap}) — large stores blow the context budget when injected. Add pruning/TTL.`,
      });
    }
  }
  return out;
}

export function runAllDetectors(mem: NormalizedMemory[], o: DetectorOptions): Finding[] {
  return [
    ...detectExpired(mem, o),
    ...detectStale(mem, o),
    ...detectScopeLeaks(mem),
    ...detectContradictions(mem, o),
    ...detectPII(mem),
    ...detectDuplicates(mem, o),
    ...detectProvenance(mem),
    ...detectUnboundedGrowth(mem, o),
  ];
}
