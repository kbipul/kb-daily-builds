#!/usr/bin/env node
// Mechanical half of the Step 3 gates for ONE project folder. Run from the hub root:
//   node scripts/check-project.mjs projects/046-rcd-reality-check
// Exit 0 = every check passed. Exit 1 = do not push; the failing lines say why.
// Judgement calls (is the finding true, are sources quoted fairly, is the demo
// sharp) stay with the run and the be-human pass. Everything that can be
// counted is counted here, so no run has to remember to count it.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readJson, LANES } from "./lib.mjs";

const dir = (process.argv[2] || "").replace(/\/$/, "");
if (!dir || !existsSync(dir)) { console.error("usage: check-project.mjs projects/NNN-slug"); process.exit(2); }

const results = [];
const check = (ok, label, why = "") => results.push({ ok: !!ok, label, why });
const read = p => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : "");

const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "dist" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// ── manifest ────────────────────────────────────────────────────────────
let m = {};
try { m = JSON.parse(read("project.json")); check(true, "project.json parses"); }
catch (e) { check(false, "project.json parses", e.message); }
const lanes = readJson(LANES);
const laneKeys = lanes.lanes.map(l => l.key);
check(typeof m.day === "number", "project.json has numeric day");
check(/^[a-z0-9-]+$/.test(m.repo || ""), "repo slug is lowercase-kebab");
check(dir.endsWith(`${String(m.day).padStart(3, "0")}-${m.repo}`), "folder name is NNN-<repo>", `expected ...${String(m.day).padStart(3, "0")}-${m.repo}`);
check(laneKeys.includes(m.lane), "project.json lane is a known lane", `got ${JSON.stringify(m.lane)}; one of ${laneKeys.join("|")}`);
check((m.description || "").length > 0 && m.description.length <= 120, "description is 1-120 chars", `${(m.description || "").length} chars`);
check((m.tagline || "").length > 0 && m.tagline.length <= 140, "tagline is 1-140 chars", `${(m.tagline || "").length} chars`);
check(Array.isArray(m.topics) && m.topics.length >= 3 && m.topics.length <= 12, "3-12 topics");
check(m.demo === "pages", 'demo is "pages" (React-only series)');

// ── repo contents ───────────────────────────────────────────────────────
for (const f of ["README.md", "LICENSE", ".gitignore", "index.html", "package.json", "package-lock.json", "vite.config.ts", ".github/workflows/ci.yml"])
  check(existsSync(join(dir, f)), `has ${f}`);
check(read("LICENSE").includes("MIT License"), "LICENSE is MIT");
check(read("vite.config.ts").includes(`base: '/${m.repo}/'`) || read("vite.config.ts").includes(`base: "/${m.repo}/"`), `vite base is /${m.repo}/`);
const html = read("index.html");
check(/<title>[^<]{10,}<\/title>/.test(html), "index.html has a real <title>");
check(/<meta name="description" content="[^"]{20,}"/.test(html), "index.html has a meta description");
check(read(".github/workflows/ci.yml").includes("screenshot"), "CI keeps the screenshot job");

// ── tests ───────────────────────────────────────────────────────────────
const srcFiles = existsSync(join(dir, "src")) ? walk(join(dir, "src")) : [];
const testFiles = srcFiles.filter(f => /\.test\.tsx?$/.test(f));
const testCount = testFiles.reduce((n, f) => n + (readFileSync(f, "utf8").match(/\b(it|test)\(\s*['"`]/g) || []).length, 0);
check(testCount >= 20, "at least 20 tests", `${testCount} found in ${testFiles.length} file(s)`);

// ── README structure (template v2) ──────────────────────────────────────
const md = read("README.md");
for (const h of ["## What it does", "## Who it's for", "## The finding", "## Try it", "## How it works", "## Build notes", "## Sources", "## Stack"])
  check(md.includes(h), `README has "${h}"`);
check(!/\{\{[A-Z_]+/.test(md), "README has no unfilled {{PLACEHOLDERS}}");
check(md.includes(`https://kbipul.github.io/${m.repo}/`), "README links the live demo");
check(md.includes("docs/demo.png"), "README references docs/demo.png");
const sources = (md.split("## Sources")[1] || "").split(/\n## /)[0];
check(/https?:\/\//.test(sources), "Sources section has at least one link");
const dashes = (md.match(/—/g) || []).length;
check(dashes <= 8, "em dashes <= 8", `${dashes}`);
const boldLeads = md.split("\n").filter(l => /^\*\*[^*]*\*\*/.test(l)).length;
check(boldLeads <= 2, "bold-lead lines <= 2", `${boldLeads}`);
const notXbutY = (md.match(/\bnot [^.\n]{1,60}? but\b/gi) || []).length;
check(notXbutY <= 1, 'at most one "not X but Y"', `${notXbutY}`);
const boiler = ["Three decisions carry the whole thing", "No model, no network, no key"];
for (const b of boiler) check(!md.includes(b), `no series boilerplate: "${b}"`);

// ── secrets ─────────────────────────────────────────────────────────────
const secretRe = /(ghp_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)/;
const leaks = walk(dir).filter(f => !f.endsWith("package-lock.json") && secretRe.test(readFileSync(f, "utf8")));
check(leaks.length === 0, "secret scan clean", leaks.join(", "));

// ── report ──────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${!r.ok && r.why ? `  (${r.why})` : ""}`);
console.log(`\ncheck-project: ${results.length - failed.length}/${results.length} passed${failed.length ? " - DO NOT PUSH" : ""}`);
process.exit(failed.length ? 1 : 0);
