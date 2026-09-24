// Shared helpers for the kb-daily-builds loop scripts. Run everything from the
// hub repo root. No dependencies beyond Node 18+.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export const STATE = "state/state.json";
export const CLAIMS = "state/claims.json";
export const LANES = "backlog/lanes.json";

/** First day number judged under rubric v2 and the lane system. */
export const V2_FROM_DAY = 46;
export const DIMENSIONS = ["decision", "timeliness", "demo", "distinct"];
export const CLAIM_TTL_HOURS = 3;
export const CATCHUP_WINDOW_DAYS = 7;
export const MAX_BUILDS_PER_RUN = 2;

export const readJson = (p, fallback) => {
  if (!existsSync(p)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${p} not found (run from the hub repo root)`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
};
export const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

/** YYYY-MM-DD for an instant, in India Standard Time. */
export const istDate = (d = new Date()) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD calendar date (TZ-independent). */
export const weekdayOf = ymd => new Date(`${ymd}T12:00:00Z`).getUTCDay();

export const addDays = (ymd, n) => {
  const t = new Date(`${ymd}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** The calendar slot a project filled: explicit slotDate, else the IST day it was built/published. */
export const slotOf = p => p.slotDate || (p.builtAt || p.publishedAt || p.date ? istDate(p.builtAt || p.publishedAt || p.date) : null);

export const laneForDate = (lanes, ymd) => lanes.lanes.find(l => l.weekday === weekdayOf(ymd));

export const manifest = folder => {
  const f = `projects/${folder}/project.json`;
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};
