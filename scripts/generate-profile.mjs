#!/usr/bin/env node
// Generates the kbipul/kbipul profile README from state/state.json.
// Run from the hub repo root: node scripts/generate-profile.mjs > README.md

import { readFileSync, existsSync } from "node:fs";

const s = JSON.parse(readFileSync("state/state.json", "utf8"));
const pub = s.projects.filter(p => p.status === "published").sort((a, b) => b.day - a.day);
const total = pub.length;
const latest = pub[0];

// Streak: consecutive calendar days (IST) ending at the most recent publish
const istDay = iso => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const days = [...new Set(pub.map(p => istDay(p.publishedAt || p.date)))].sort().reverse();
let streak = days.length ? 1 : 0;
for (let i = 1; i < days.length; i++) {
  const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
  if (diff === 1) streak++; else break;
}

const logo = existsSync("brand/logo-primary.svg")
  ? `<img src="brand/logo-primary.svg" width="120" alt="kB. — Kumar Bipul" />`
  : "";

// The "What it does" column and the repo link must never come out blank.
// A state entry can be missing `tagline`, `repoUrl` or `demoUrl` — publish.yml
// writes the two URLs asynchronously, and the loop has forgotten `tagline` on
// six days (021, 023, 032, 033, 044, 045). Every project.json carries both a
// tagline and a <=120-char description, so fall back to the manifest on disk
// before falling back to nothing. Fixed 2026-09-24 after the blanks reached the
// public profile board.
const manifest = p => {
  if (!p.folder) return {};
  const f = `projects/${p.folder}/project.json`;
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; }
};

const blurb = p => {
  const m = manifest(p);
  const text = p.tagline || m.tagline || m.description || p.description || "";
  return String(text).replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
};

const repoLink = p => {
  const url = p.repoUrl || (p.repo ? `https://github.com/kbipul/${p.repo}` : "");
  return url ? `[${p.title}](${url})` : p.title;
};

const demoLink = p => {
  const url = p.demoUrl || (p.demo === "pages" && p.repo ? `https://kbipul.github.io/${p.repo}/` : "");
  return url ? `[Live demo](${url})` : "—";
};

const rows = pub.slice(0, 30).map(p => {
  const date = istDay(p.publishedAt || p.date);
  return `| ${String(p.day).padStart(3, "0")} | ${repoLink(p)} | ${blurb(p)} | ${demoLink(p)} | ${date} |`;
}).join("\n");

console.log(`<div align="center">

${logo}

# Kumar Bipul

**IT Director → AI/ML Leader** · Building one AI project in public, every single day.

[Website](https://www.kumarbipul.com) · [Daily Builds Hub](https://github.com/${s.owner}/${s.series})

![Projects shipped](https://img.shields.io/badge/projects_shipped-${total}-9B0000?style=for-the-badge)
![Current streak](https://img.shields.io/badge/current_streak-${streak}_day${streak === 1 ? "" : "s"}-0A0A0A?style=for-the-badge)

</div>

## 🔴 Latest build${latest ? ` — Day ${String(latest.day).padStart(3, "0")}` : ""}

${latest ? `**${repoLink(latest)}** — ${blurb(latest)}${demoLink(latest) === "—" ? "" : `\n\n▶ **[Try it live](${latest.demoUrl || `https://kbipul.github.io/${latest.repo}/`})**`}` : "_First build ships tomorrow at 6:00 AM IST._"}

## 📅 The daily board (last 30 days)

| Day | Project | What it does | Demo | Shipped |
|----:|---------|--------------|------|---------|
${rows || "| — | _Coming soon_ | | | |"}

${total > 30 ? `\n_…and ${total - 30} more in the [full index](https://github.com/${s.owner}/${s.series})._\n` : ""}

## 🧭 What this is

One new AI/ML project shipped daily — designed, built, tested, and deployed
through an automated engineering loop I run with Claude. Microsoft-first
stack: **React · TypeScript · C# / .NET · Azure AI**. Every repo has a
README, CI, and a live demo where the browser allows it.

The system that publishes these is itself public: [kb-daily-builds](https://github.com/${s.owner}/${s.series}).

---

<div align="center"><sub>KNOWLEDGE BASE OF THE TECH WORLD · <a href="https://www.kumarbipul.com">kumarbipul.com</a></sub></div>
`);
