#!/usr/bin/env node
// Claim a slot before spending an hour building it:
//   node scripts/claim-slot.mjs --slot 2026-09-25 --day 46 --by local
// Then commit ONLY state/claims.json with "[skip ci]" in the message and push.
// If that push is rejected, pull, re-run today.mjs, and stand down if the slot
// is now filled or claimed by someone else.
import { readJson, writeJson, CLAIMS } from "./lib.mjs";

const arg = k => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const slot = arg("slot"), day = Number(arg("day")), by = arg("by") || "unknown";
if (!/^\d{4}-\d{2}-\d{2}$/.test(slot || "") || !Number.isInteger(day)) {
  console.error("usage: claim-slot.mjs --slot YYYY-MM-DD --day N [--by local|cloud|dispatch]");
  process.exit(2);
}
const claims = readJson(CLAIMS, {});
claims[slot] = { day, by, claimedAt: new Date().toISOString() };
// Keep the file small: drop claims older than 14 days.
const cutoff = Date.now() - 14 * 86400000;
for (const [k, v] of Object.entries(claims)) if (new Date(v.claimedAt).getTime() < cutoff) delete claims[k];
writeJson(CLAIMS, claims);
console.log(`claimed ${slot} as Day ${day} (${by}). Commit state/claims.json with [skip ci] and push now.`);
