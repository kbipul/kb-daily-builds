#!/usr/bin/env node
// Pre-push gate for state/state.json. Run from the hub repo root:
//   node scripts/validate-state.mjs
// Exit 0 = safe to push. Exit 1 = publish.yml or the profile board would
// misbehave; fix before pushing.
//
// History of what this catches, so nobody deletes a check that looks fussy:
// - no "folder": publish.yml skips the project silently. Days 021 (killed the
//   whole fan-out on 2026-07-28), 026 and 033.
// - no "tagline": blank "What it does" cell on the public profile board.
//   Days 021, 023, 032, 033, 044, 045 (found 2026-09-24).
// - description > 120 chars: GitHub truncates the repo About line. 26 of 45
//   projects were over on 2026-09-24.
// - rubric v2 fields (Day 046+): lane, slotDate, per-dimension scores with a
//   one-clause note each, and at least one primary source. Scores that are
//   not written down cannot be audited, and 16 of the 20 winners before the
//   lane system scored a flat 12/12.
import { existsSync, readFileSync } from "node:fs";
import { readJson, STATE, LANES, V2_FROM_DAY, DIMENSIONS, manifest } from "./lib.mjs";

const DEMOS = new Set(["pages", "byok", "cli", "none"]);
const STATUSES = new Set(["built", "published", "parked", "failed"]);
const errors = [];
const warnings = [];

let s;
try { s = JSON.parse(readFileSync(STATE, "utf8")); }
catch (e) { console.error(`FATAL: ${STATE} is not valid JSON - ${e.message}`); process.exit(1); }
const laneKeys = new Set(readJson(LANES).lanes.map(l => l.key));

const projects = Array.isArray(s.projects) ? s.projects : [];
if (!projects.length) errors.push("state.json has no projects array");

const seenRepo = new Map();
const seenDay = new Map();
const seenSlot = new Map();

for (const p of projects) {
  const tag = `day ${p.day ?? "?"} (${p.repo ?? "no repo"})`;
  const live = p.status === "built" || p.status === "published";

  if (typeof p.day !== "number") errors.push(`${tag}: "day" must be a number`);
  if (!STATUSES.has(p.status)) errors.push(`${tag}: unknown status ${JSON.stringify(p.status)}`);
  if (typeof p.repo !== "string" || !p.repo.trim()) errors.push(`${tag}: missing "repo"`);
  if (typeof p.title !== "string" || !p.title.trim()) warnings.push(`${tag}: missing "title"`);
  if (!DEMOS.has(p.demo)) errors.push(`${tag}: "demo" must be one of ${[...DEMOS].join("|")} (got ${JSON.stringify(p.demo)})`);

  if (live) {
    // The load-bearing check: publish.yml skips entries without a folder.
    if (typeof p.folder !== "string" || !p.folder.trim()) {
      errors.push(`${tag}: status "${p.status}" but no "folder" field - publish.yml WILL SKIP this project. Add "folder": "NNN-<slug>".`);
    } else {
      const folder = p.folder.trim();
      if (!existsSync(`projects/${folder}`)) errors.push(`${tag}: folder "${folder}" does not exist under projects/`);
      const m = /^(\d{3})-/.exec(folder);
      if (!m) errors.push(`${tag}: folder "${folder}" must start with a zero-padded day, e.g. "026-my-slug"`);
      else if (Number(m[1]) !== p.day) errors.push(`${tag}: folder "${folder}" is prefixed ${m[1]} but day is ${p.day}`);

      if (p.demo === "pages") {
        const cfg = `projects/${folder}/vite.config.ts`;
        if (existsSync(cfg)) {
          if (!readFileSync(cfg, "utf8").includes(`/${p.repo}/`))
            errors.push(`${tag}: ${cfg} has no base "/${p.repo}/" - the Pages demo will 404 on its assets`);
        } else warnings.push(`${tag}: demo is "pages" but ${cfg} is missing`);
      }

      const man = manifest(folder);
      if (!man) errors.push(`${tag}: projects/${folder}/project.json is missing`);
      else {
        if (man.day !== p.day) errors.push(`${tag}: project.json day is ${man.day}`);
        const desc = man.description || "";
        if (!desc || desc.length > 120)
          errors.push(`${tag}: project.json description is ${desc.length} chars - must be 1-120 (it becomes the GitHub About line)`);
      }
    }

    if (typeof p.tagline !== "string" || !p.tagline.trim())
      errors.push(`${tag}: status "${p.status}" but no "tagline" - the profile board's "What it does" cell will be blank. Use scripts/upsert-entry.mjs.`);
    if (!laneKeys.has(p.lane))
      errors.push(`${tag}: "lane" must be one of ${[...laneKeys].join("|")} (got ${JSON.stringify(p.lane)})`);

    if (p.status === "published") {
      if (!p.repoUrl) warnings.push(`${tag}: published but no "repoUrl" - the board row's title falls back to the slug`);
      if (p.demo === "pages" && !p.demoUrl) warnings.push(`${tag}: published "pages" demo but no "demoUrl"`);
    }

    // Rubric v2 and the lane system start at Day 046.
    if (p.day >= V2_FROM_DAY) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.slotDate || "")) errors.push(`${tag}: "slotDate" (YYYY-MM-DD, IST) is required from Day ${V2_FROM_DAY}`);
      else if (seenSlot.has(p.slotDate)) errors.push(`${tag}: slot ${p.slotDate} is already filled by day ${seenSlot.get(p.slotDate)}`);
      else seenSlot.set(p.slotDate, p.day);

      const sc = p.scores || {};
      const bad = DIMENSIONS.filter(k => !Number.isInteger(sc[k]) || sc[k] < 0 || sc[k] > 3);
      if (bad.length) errors.push(`${tag}: "scores" needs integer 0-3 for ${DIMENSIONS.join(", ")} (bad: ${bad.join(", ")})`);
      else {
        const sum = DIMENSIONS.reduce((a, k) => a + sc[k], 0);
        if (p.valueScore !== sum) errors.push(`${tag}: valueScore ${p.valueScore} != sum of scores ${sum}`);
      }
      const notes = p.scoreNotes || {};
      const missingNotes = DIMENSIONS.filter(k => typeof notes[k] !== "string" || notes[k].trim().length < 8);
      if (missingNotes.length) errors.push(`${tag}: "scoreNotes" needs a one-clause justification for ${missingNotes.join(", ")}`);
      if (!Array.isArray(p.sources) || !p.sources.some(u => /^https?:\/\//.test(String(u))))
        errors.push(`${tag}: "sources" must list at least one primary-source URL`);
      if (typeof p.signal !== "string" || !p.signal.trim()) warnings.push(`${tag}: no "signal" recorded`);
      if (typeof p.rationale !== "string" || !p.rationale.trim()) errors.push(`${tag}: no "rationale" recorded`);
    }
  }

  if (typeof p.repo === "string" && live) {
    if (seenRepo.has(p.repo)) errors.push(`${tag}: repo "${p.repo}" also used by day ${seenRepo.get(p.repo)}`);
    else seenRepo.set(p.repo, p.day);
  }
  if (typeof p.day === "number") {
    if (seenDay.has(p.day)) errors.push(`duplicate day ${p.day}`);
    else seenDay.set(p.day, true);
  }
}

const maxDay = Math.max(0, ...projects.map(p => (typeof p.day === "number" ? p.day : 0)));
if (s.dayCounter !== maxDay) errors.push(`dayCounter is ${s.dayCounter} but the highest project day is ${maxDay}`);

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  console.error(`\nvalidate-state: ${errors.length} error(s) - DO NOT PUSH\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-state: OK - ${projects.length} projects, dayCounter ${s.dayCounter}, ${seenRepo.size} live repos, ${warnings.length} warning(s).`);
