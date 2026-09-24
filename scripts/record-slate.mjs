#!/usr/bin/env node
// Record the day's selection in backlog/lanes.json:
//   node scripts/record-slate.mjs /tmp/slate-046.json
//
// slate.json:
// { "day": 46, "lane": "m365", "winner": "rcd-reality-check",
//   "candidates": [
//     { "slug": "rcd-reality-check", "scores": {"decision":3,"timeliness":2,"demo":3,"distinct":3} },
//     { "slug": "label-inheritance", "scores": {...} },
//     { "slug": "new-idea", "scores": {...},
//       "fresh": { "idea": "...", "decision": "...", "groundIn": ["url"], "signal": "..." } } ] }
//
// Effects: the winner is marked built with its day; every losing pool item gets
// a history row {day, score, weakest}; fresh losers scoring >= 8 join the lane
// pool; items reaching the carry limit on one dimension are retired. This
// replaces hand-editing backlog.md, which grew to 650 lines and still let two
// ideas lose six times in a row.
import { readJson, writeJson, LANES, DIMENSIONS } from "./lib.mjs";

const slate = readJson(process.argv[2] || "");
const lanes = readJson(LANES);
const lane = lanes.lanes.find(l => l.key === slate.lane);
if (!lane) { console.error(`unknown lane ${slate.lane}`); process.exit(2); }
const limit = lanes.carryLimit?.maxLossesOnSameWeakest ?? 3;

const total = s => DIMENSIONS.reduce((a, k) => a + (s?.[k] ?? 0), 0);
const weakest = s => DIMENSIONS.reduce((w, k) => ((s?.[k] ?? 0) < (s?.[w] ?? 0) ? k : w), DIMENSIONS[0]);
const findItem = slug => { for (const l of lanes.lanes) { const it = l.pool.find(x => x.slug === slug); if (it) return it; } };

const log = [];
for (const c of slate.candidates || []) {
  const score = total(c.scores);
  let it = findItem(c.slug);
  if (c.slug === slate.winner) {
    if (!it) { it = { slug: c.slug, history: [], verified: [], ...(c.fresh || {}) }; lane.pool.push(it); }
    it.status = "built"; it.builtDay = slate.day;
    log.push(`WON   ${c.slug} ${score}/12`);
    continue;
  }
  if (!it) {
    if (c.fresh && score >= 8) {
      lane.pool.push({ slug: c.slug, status: "unbuilt", history: [{ day: slate.day, score, weakest: weakest(c.scores) }],
        idea: c.fresh.idea, decision: c.fresh.decision, groundIn: c.fresh.groundIn || [], verified: [],
        note: c.fresh.signal ? `Signal: ${c.fresh.signal}` : undefined });
      log.push(`ADDED ${c.slug} ${score}/12 to ${lane.key} pool`);
    } else log.push(`DROP  ${c.slug} ${score}/12 (fresh, below 8)`);
    continue;
  }
  (it.history ||= []).push({ day: slate.day, score, weakest: weakest(c.scores) });
  // Losses before a deliberate re-angle (reangledAtDay) do not count toward the limit.
  const n = it.history.filter(h => h.day > (it.reangledAtDay ?? -1) && h.weakest === weakest(c.scores)).length;
  if (n >= limit && it.status === "unbuilt") {
    it.status = "retired";
    lanes.retired.push({ slug: it.slug, reason: `Lost ${n}x on ${weakest(c.scores)} (carry limit ${limit}); retired on Day ${slate.day}.` });
    log.push(`RETIRE ${c.slug} (${n}x weakest on ${weakest(c.scores)})`);
  } else log.push(`LOST  ${c.slug} ${score}/12 weakest=${weakest(c.scores)}`);
}
writeJson(LANES, lanes);
console.log(log.join("\n"));
