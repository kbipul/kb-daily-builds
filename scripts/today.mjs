#!/usr/bin/env node
// What should this run build? Read-only. Run from the hub root:
//   node scripts/today.mjs            human-readable plan
//   node scripts/today.mjs --json     machine-readable plan
//
// A "slot" is one IST calendar date. Every date gets at most one build, and the
// date's weekday decides the lane. A run fills the open slots between the last
// filled slot and today, oldest first, at most MAX_BUILDS_PER_RUN, and never
// reaching back further than CATCHUP_WINDOW_DAYS. Older gaps are reported as
// missed, never backfilled (no fake streaks).
//
// A slot someone else claimed less than CLAIM_TTL_HOURS ago is not open: that
// is how two schedulers stop building the same day (7 collisions, Sep 15-21).
import {
  readJson, STATE, CLAIMS, LANES, istDate, addDays, slotOf, laneForDate,
  CLAIM_TTL_HOURS, CATCHUP_WINDOW_DAYS, MAX_BUILDS_PER_RUN,
} from "./lib.mjs";

const asJson = process.argv.includes("--json");
const nowArg = process.argv.find(a => a.startsWith("--now="));
const now = nowArg ? new Date(nowArg.slice(6)) : new Date();
const today = istDate(now);

const state = readJson(STATE);
const claims = readJson(CLAIMS, {});
const lanes = readJson(LANES);

const filled = new Map();
for (const p of state.projects) {
  const s = slotOf(p);
  if (s && (p.status === "built" || p.status === "published")) filled.set(s, p.day);
}
const lastFilled = [...filled.keys()].sort().pop() || addDays(today, -1);
const maxDay = Math.max(0, ...state.projects.map(p => p.day || 0));

const open = [], missed = [], claimed = [];
const windowStart = addDays(today, -(CATCHUP_WINDOW_DAYS - 1));
for (let d = addDays(lastFilled, 1); d <= today; d = addDays(d, 1)) {
  if (filled.has(d)) continue;
  if (d < windowStart) { missed.push(d); continue; }
  const c = claims[d];
  const ageH = c ? (now - new Date(c.claimedAt)) / 3.6e6 : Infinity;
  if (c && ageH < CLAIM_TTL_HOURS) { claimed.push({ slot: d, ...c, ageHours: +ageH.toFixed(2) }); continue; }
  open.push(d);
}
// Today's slot already done by someone else? Then there is nothing to do.
const toBuild = open.slice(0, MAX_BUILDS_PER_RUN).map((slot, i) => {
  const lane = laneForDate(lanes, slot);
  return { slot, day: maxDay + 1 + i, lane: lane.key, laneName: lane.name };
});

// Lane coverage: what the portfolio actually looks like.
const live = state.projects.filter(p => p.status === "built" || p.status === "published");
const recentFrom = addDays(today, -13);
const coverage = lanes.lanes.map(l => ({
  lane: l.key,
  allTime: live.filter(p => p.lane === l.key).length,
  last14: live.filter(p => p.lane === l.key && (slotOf(p) || "") >= recentFrom).length,
}));

// Carry-limit enforcement: pool items that keep losing on the same dimension.
const limit = lanes.carryLimit?.maxLossesOnSameWeakest ?? 3;
const retire = [];
for (const l of lanes.lanes) for (const it of l.pool) {
  if (it.status !== "unbuilt") continue;
  const counts = {};
  for (const h of it.history || []) if (h.day > (it.reangledAtDay ?? -1)) counts[h.weakest] = (counts[h.weakest] || 0) + 1;
  const [dim, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  if (n >= limit) retire.push({ lane: l.key, slug: it.slug, weakest: dim, losses: n });
}

const plan = { now: now.toISOString(), today, lastFilled, toBuild, claimed, missed, coverage, retire };

if (asJson) { console.log(JSON.stringify(plan, null, 2)); process.exit(0); }

console.log(`today (IST): ${today}   last filled slot: ${lastFilled}   next day number: ${maxDay + 1}`);
if (claimed.length) for (const c of claimed)
  console.log(`CLAIMED  ${c.slot} as Day ${c.day} by ${c.by} ${c.ageHours}h ago - another run owns it; do not build it.`);
if (missed.length) console.log(`MISSED   ${missed.length} slot(s) older than ${CATCHUP_WINDOW_DAYS} days: ${missed.join(", ")} (report, do not backfill)`);
if (!toBuild.length) console.log("BUILD    nothing - every slot up to today is filled or claimed. Stand down.");
for (const b of toBuild) console.log(`BUILD    Day ${String(b.day).padStart(3, "0")} for slot ${b.slot} -> lane "${b.lane}" (${b.laneName})`);
console.log("\nlane coverage   all-time  last-14d");
for (const c of coverage) console.log(`  ${c.lane.padEnd(12)} ${String(c.allTime).padStart(8)}  ${String(c.last14).padStart(8)}`);
if (retire.length) {
  console.log(`\nCARRY LIMIT (${limit}+ losses on one dimension) - mark retired via record-slate or re-angle:`);
  for (const r of retire) console.log(`  ${r.lane}/${r.slug}: ${r.losses}x weakest on ${r.weakest}`);
}
