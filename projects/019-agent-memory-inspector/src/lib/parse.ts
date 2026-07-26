import { MemoryRecord, NormalizedMemory, ParseResult, Scope, SCOPES } from "./types";

function isScope(v: unknown): v is Scope {
  return typeof v === "string" && (SCOPES as string[]).includes(v);
}

/**
 * Parse a memory store from a JSON string. Accepts either a top-level array or
 * an object with a `memories` array (both shapes appear in the wild). Rows that
 * cannot be salvaged are skipped with an explanatory error rather than throwing,
 * so one bad record never blanks the whole report.
 */
export function parseMemories(input: string): ParseResult {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    return { records: [], errors: [`Invalid JSON: ${(e as Error).message}`] };
  }

  let rows: unknown[];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object" && Array.isArray((data as any).memories)) {
    rows = (data as any).memories;
  } else {
    return {
      records: [],
      errors: ["Expected a JSON array of memories, or an object with a `memories` array."],
    };
  }

  const records: MemoryRecord[] = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== "object") {
      errors.push(`Row ${i}: not an object — skipped.`);
      return;
    }
    const r = row as Record<string, unknown>;
    const content = typeof r.content === "string" ? r.content : "";
    if (!content) {
      errors.push(`Row ${i}: missing "content" — skipped.`);
      return;
    }
    let scope: Scope;
    if (isScope(r.scope)) {
      scope = r.scope;
    } else {
      scope = "session";
      errors.push(`Row ${i}: scope "${String(r.scope)}" not one of procedural/user/session — defaulted to session.`);
    }
    const rec: MemoryRecord = {
      id: typeof r.id === "string" && r.id ? r.id : `m${i + 1}`,
      scope,
      content,
    };
    if (typeof r.createdAt === "string") rec.createdAt = r.createdAt;
    if (typeof r.expiresAt === "string") rec.expiresAt = r.expiresAt;
    if (typeof r.ttlSeconds === "number" && isFinite(r.ttlSeconds)) rec.ttlSeconds = r.ttlSeconds;
    if (typeof r.source === "string") rec.source = r.source;
    if (Array.isArray(r.tags)) rec.tags = r.tags.filter((t): t is string => typeof t === "string");
    records.push(rec);
  });

  return { records, errors };
}

function parseTime(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return isNaN(t) ? null : t;
}

/** Resolve createdAt / ttl / expiresAt into absolute epoch-ms fields. */
export function normalize(records: MemoryRecord[]): NormalizedMemory[] {
  return records.map((r) => {
    const createdAtMs = parseTime(r.createdAt);
    let expiresAtMs = parseTime(r.expiresAt);
    if (expiresAtMs === null && createdAtMs !== null && typeof r.ttlSeconds === "number") {
      expiresAtMs = createdAtMs + r.ttlSeconds * 1000;
    }
    return { ...r, createdAtMs, expiresAtMs };
  });
}
