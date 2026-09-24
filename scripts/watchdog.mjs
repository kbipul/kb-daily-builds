#!/usr/bin/env node
// Runs on GitHub (watchdog.yml), independent of any Mac or Claude session.
// Prints a JSON array of alerts; the workflow turns each into a GitHub Issue
// (labelled loop-alert, one per kind, @kbipul mentioned so it emails).
//
// Why: publishing was blocked for 36 days (27 Jul - 2 Sep) and the only alarm
// was a Markdown file on a laptop that nobody opened. The W35/W36/W37 audits
// and ACTION-REQUIRED.md all asked for an alarm channel.
import { existsSync, readFileSync } from "node:fs";
import { readJson, STATE, CLAIMS, istDate, slotOf, CLAIM_TTL_HOURS } from "./lib.mjs";

const now = new Date();
const state = readJson(STATE);
const claims = readJson(CLAIMS, {});
const alerts = [];

const live = state.projects.filter(p => p.status === "built" || p.status === "published");
const lastBuilt = live.map(p => p.builtAt || p.publishedAt || p.date).filter(Boolean).sort().pop();
const hoursSince = lastBuilt ? (now - new Date(lastBuilt)) / 3.6e6 : Infinity;
if (hoursSince > 30) {
  alerts.push({
    kind: "no-build",
    title: "Daily build loop: no build in over 30 hours",
    body: `The last build in state.json was at ${lastBuilt} (${hoursSince.toFixed(0)} hours ago, IST date ${lastBuilt ? istDate(lastBuilt) : "n/a"}).\n\nLikely causes, most common first: the Mac was asleep or the Claude app closed at 06:00 (local task), the cloud routine is paused or hit its run cap, a token expired, or a run failed its gates and correctly pushed nothing. Check the Scheduled panel and claude.ai/code/routines.`,
  });
}

const stuck = state.projects.filter(p => p.status === "built" && (now - new Date(p.builtAt || 0)) / 3.6e6 > 2);
if (stuck.length) {
  alerts.push({
    kind: "fanout-stuck",
    title: "Fan-out stuck: built projects not published",
    body: `These entries have been "built" for over 2 hours without publish.yml marking them published:\n\n${stuck.map(p => `- Day ${p.day} \`${p.repo}\` (folder \`${p.folder || "MISSING"}\`, built ${p.builtAt})`).join("\n")}\n\nOpen the latest "Publish daily project" run in Actions for the actual error.`,
  });
}

const staleClaims = Object.entries(claims).filter(([slot, c]) =>
  (now - new Date(c.claimedAt)) / 3.6e6 > CLAIM_TTL_HOURS && !live.some(p => slotOf(p) === slot));
if (staleClaims.length) {
  alerts.push({
    kind: "claim-abandoned",
    title: "A run claimed a slot and never finished it",
    body: `${staleClaims.map(([s, c]) => `- slot ${s} claimed as Day ${c.day} by ${c.by} at ${c.claimedAt}`).join("\n")}\n\nThe claim has expired, so the next run will take the slot. This usually means a session died mid-build (sleep, network, usage limit).`,
  });
}

if (existsSync("ACTION-REQUIRED.md")) {
  alerts.push({
    kind: "action-required",
    title: "A loop run is blocked and left ACTION-REQUIRED.md",
    body: readFileSync("ACTION-REQUIRED.md", "utf8").slice(0, 60000),
  });
}

console.log(JSON.stringify(alerts, null, 2));
