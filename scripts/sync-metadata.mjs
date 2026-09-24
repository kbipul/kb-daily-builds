#!/usr/bin/env node
// Make every published repo's GitHub metadata match its project.json:
// description (About line), homepage (the live demo), topics. Also the hub.
// Runs in publish.yml with GH_TOKEN = PUBLISH_TOKEN. Idempotent.
//
// Why: publish.yml only set a description when it CREATED a repo, so every
// later fix to project.json (26 over-long descriptions, two false "azure"
// tags) never reached GitHub.
import { execFileSync } from "node:child_process";
import { readJson, STATE, manifest } from "./lib.mjs";

const OWNER = process.env.OWNER || "kbipul";
const gh = (args, input) => execFileSync("gh", args, { input, stdio: ["pipe", "pipe", "pipe"] });
let ok = 0, failed = 0;

const sync = (repo, description, homepage, topics) => {
  try {
    gh(["api", "-X", "PATCH", `repos/${OWNER}/${repo}`, "-f", `description=${description}`, "-f", `homepage=${homepage}`, "--silent"]);
    gh(["api", "-X", "PUT", `repos/${OWNER}/${repo}/topics`, "--input", "-", "--silent"], JSON.stringify({ names: topics.slice(0, 20) }));
    ok++;
  } catch (e) {
    failed++;
    console.log(`::warning::metadata sync failed for ${repo}: ${String(e.stderr || e.message).trim().slice(0, 200)}`);
  }
};

for (const p of readJson(STATE).projects.filter(p => p.status === "published" && p.folder)) {
  const m = manifest(p.folder);
  if (!m) continue;
  const repo = (p.repoUrl || "").split("/").pop() || p.repo;
  const homepage = p.demoUrl || (m.demo === "pages" ? `https://${OWNER}.github.io/${repo}/` : "https://www.kumarbipul.com");
  sync(repo, m.description, homepage, m.topics || []);
}
sync("kb-daily-builds",
  "One sharp, tested AI tool a day across Azure, M365, multi-cloud and India, plus the automated loop that ships them.",
  "https://github.com/kbipul",
  ["ai", "llm", "azure", "microsoft-365", "copilot", "ai-governance", "india", "typescript", "react", "automation"]);
console.log(`metadata sync: ${ok} repo(s) updated, ${failed} failed`);
