#!/usr/bin/env node
// Pre-push gate for state/state.json. Run from the hub repo root:
//   node scripts/validate-state.mjs
// Exit 0 = safe to push. Exit 1 = publish.yml would misbehave; fix before pushing.
//
// Why this exists (W36 audit): a state entry with status "built" but no
// "folder" field makes publish.yml skip the project silently from the loop's
// point of view — the push succeeds, the Action reports an error nobody reads,
// and the repo never appears. This landed twice: Day 021 (2026-07-28, which
// killed the whole fan-out) and again on Day 026 (2026-09-06, contained to one
// project by the W33 hardening but still needing a follow-up commit).
// publish.yml catches the malformed entry AFTER the push. This catches it
// before, which is the only place the loop can still do something about it.

import { readFileSync, existsSync } from "node:fs";

const DEMOS = new Set(["pages", "byok", "cli", "none"]);
const errors = [];
const warnings = [];

let s;
try {
  s = JSON.parse(readFileSync("state/state.json", "utf8"));
} catch (e) {
  console.error(`FATAL: state/state.json is not valid JSON — ${e.message}`);
  process.exit(1);
}

const projects = Array.isArray(s.projects) ? s.projects : [];
if (!projects.length) errors.push("state.json has no projects array");

const seenRepo = new Map();
const seenDay = new Map();

for (const p of projects) {
  const tag = `day ${p.day ?? "?"} (${p.repo ?? "no repo"})`;
  const live = p.status === "built" || p.status === "published";

  if (typeof p.day !== "number") errors.push(`${tag}: "day" must be a number`);
  if (typeof p.repo !== "string" || !p.repo.trim()) errors.push(`${tag}: missing "repo"`);
  if (typeof p.title !== "string" || !p.title.trim()) warnings.push(`${tag}: missing "title"`);
  if (!DEMOS.has(p.demo)) errors.push(`${tag}: "demo" must be one of ${[...DEMOS].join("|")} (got ${JSON.stringify(p.demo)})`);

  // The load-bearing check.
  if (live) {
    if (typeof p.folder !== "string" || !p.folder.trim()) {
      errors.push(`${tag}: status "${p.status}" but no "folder" field — publish.yml WILL SKIP this project. Add "folder": "NNN-<slug>".`);
    } else {
      const folder = p.folder.trim();
      if (!existsSync(`projects/${folder}`)) {
        errors.push(`${tag}: folder "${folder}" does not exist under projects/`);
      }
      const m = /^(\d{3})-/.exec(folder);
      if (!m) {
        errors.push(`${tag}: folder "${folder}" must start with a zero-padded day, e.g. "026-my-slug"`);
      } else if (Number(m[1]) !== p.day) {
        errors.push(`${tag}: folder "${folder}" is prefixed ${m[1]} but day is ${p.day}`);
      }
      // pages demos break on GitHub Pages without a matching Vite base path.
      if (p.demo === "pages") {
        const cfg = `projects/${folder}/vite.config.ts`;
        if (existsSync(cfg)) {
          const txt = readFileSync(cfg, "utf8");
          if (!txt.includes(`/${p.repo}/`)) {
            errors.push(`${tag}: ${cfg} has no base "/${p.repo}/" — the Pages demo will 404 on its assets`);
          }
        } else {
          warnings.push(`${tag}: demo is "pages" but ${cfg} is missing`);
        }
      }
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
if (s.dayCounter !== maxDay) {
  errors.push(`dayCounter is ${s.dayCounter} but the highest project day is ${maxDay}`);
}

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  console.error(`\nvalidate-state: ${errors.length} error(s) — DO NOT PUSH\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-state: OK — ${projects.length} projects, dayCounter ${s.dayCounter}, ${seenRepo.size} live repos, ${warnings.length} warning(s).`);
