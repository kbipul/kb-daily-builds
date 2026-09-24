#!/usr/bin/env node
// The ONLY way a run should write its project into state/state.json:
//   git pull --rebase
//   node scripts/upsert-entry.mjs /tmp/entry-046.json
//
// Why a script (2026-09-24): hand-written entries forgot "folder" three times
// (Days 021/026/033, each one a silent fan-out skip), forgot "tagline" six
// times (blank board cells), and a hand-resolved rebase conflict on
// 2026-09-23 dropped the repoUrl/demoUrl that publish.yml had just written for
// Day 044. This script fills everything derivable from project.json, never
// deletes a field publish.yml owns, and clears the slot claim.
//
// Rebase conflict on state.json? Take the upstream copy and re-run this:
//   git checkout --ours state/state.json      (during a rebase "ours" = upstream)
//   node scripts/upsert-entry.mjs /tmp/entry-NNN.json
//   git add state/state.json && git rebase --continue
import { readJson, writeJson, STATE, CLAIMS, manifest } from "./lib.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: upsert-entry.mjs <entry.json>"); process.exit(2); }
const entry = readJson(file);
if (!Number.isInteger(entry.day)) { console.error("entry.day must be an integer"); process.exit(2); }
if (!entry.folder) { console.error('entry.folder is required, e.g. "046-rcd-reality-check"'); process.exit(2); }

const m = manifest(entry.folder);
if (!m) { console.error(`projects/${entry.folder}/project.json not found`); process.exit(2); }

// Derived from the manifest unless the entry says otherwise.
for (const k of ["repo", "title", "tagline", "description", "demo", "lane", "stack"]) {
  if (entry[k] === undefined && m[k] !== undefined) entry[k] = m[k];
}
if (m.day !== entry.day) { console.error(`project.json day ${m.day} != entry day ${entry.day}`); process.exit(2); }
entry.status ??= "built";
entry.builtAt ??= new Date().toISOString();

// Fields only publish.yml may set or change.
const PUBLISH_OWNED = ["publishedAt", "refreshedAt", "repoUrl", "demoUrl"];

const state = readJson(STATE);
const i = state.projects.findIndex(p => p.day === entry.day);
if (i === -1) {
  for (const k of PUBLISH_OWNED) delete entry[k];
  state.projects.push(entry);
} else {
  const prev = state.projects[i];
  const merged = { ...prev, ...entry };
  for (const k of PUBLISH_OWNED) if (prev[k] !== undefined) merged[k] = prev[k];
  // A published project stays published unless this is an explicit re-queue.
  if (prev.status === "published" && !entry.requeue) merged.status = "published";
  delete merged.requeue;
  state.projects[i] = merged;
}
state.projects.sort((a, b) => a.day - b.day);
state.dayCounter = Math.max(...state.projects.map(p => p.day));
writeJson(STATE, state);

if (entry.slotDate) {
  const claims = readJson(CLAIMS, {});
  if (claims[entry.slotDate]) { delete claims[entry.slotDate]; writeJson(CLAIMS, claims); }
}
console.log(`upserted Day ${entry.day} (${entry.repo}) status=${state.projects.find(p => p.day === entry.day).status}; dayCounter=${state.dayCounter}`);
