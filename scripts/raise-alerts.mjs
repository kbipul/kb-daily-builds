#!/usr/bin/env node
// Turn alert JSON into GitHub Issues on this repo (the loop's alarm channel):
//   node scripts/raise-alerts.mjs --scope no-build,fanout-stuck,... a.json [b.json ...]
// - one open issue per alert kind (label loop-alert), @kbipul mentioned so it emails
// - a still-firing alert gets at most one reminder comment per 20 hours
// - open issues whose kind is in --scope but no longer firing are closed
// Needs GH_TOKEN (the workflow's own github.token is enough) and GITHUB_REPOSITORY.
import { readFileSync, existsSync } from "node:fs";

export async function raise({ alerts, scope, api, now = new Date() }) {
  const log = [];
  await api("POST", "/labels", { name: "loop-alert", color: "d93f0b", description: "Raised automatically by the daily build loop" }).catch(() => {});
  const open = (await api("GET", "/issues?state=open&labels=loop-alert&per_page=100")) || [];
  const kindOf = i => (/\[loop-alert:([a-z-]+)\]/.exec(i.body || "") || [])[1];
  for (const a of alerts) {
    const existing = open.find(i => kindOf(i) === a.kind);
    if (!existing) {
      await api("POST", "/issues", { title: a.title, labels: ["loop-alert"], body: `@kbipul ${a.body}\n\n<sub>[loop-alert:${a.kind}] raised ${now.toISOString()}</sub>` });
      log.push(`opened ${a.kind}`);
    } else {
      const last = new Date(existing.updated_at || 0);
      if ((now - last) / 3.6e6 >= 20) {
        await api("POST", `/issues/${existing.number}/comments`, { body: `Still firing at ${now.toISOString()}.\n\n${a.body}` });
        log.push(`reminded ${a.kind} #${existing.number}`);
      } else log.push(`quiet ${a.kind} #${existing.number} (updated <20h ago)`);
    }
  }
  const firing = new Set(alerts.map(a => a.kind));
  for (const i of open) {
    const k = kindOf(i);
    if (k && scope.includes(k) && !firing.has(k)) {
      await api("POST", `/issues/${i.number}/comments`, { body: `Resolved: condition cleared at ${now.toISOString()}.` });
      await api("PATCH", `/issues/${i.number}`, { state: "closed" });
      log.push(`closed ${k} #${i.number}`);
    }
  }
  return log;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const si = args.indexOf("--scope");
  const scope = si >= 0 ? args[si + 1].split(",") : [];
  const files = args.filter((_, i) => i !== si && i !== si + 1);
  const alerts = files.flatMap(f => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8") || "[]") : []));
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
  if (!repo || !token) { console.error("GITHUB_REPOSITORY and GH_TOKEN are required"); process.exit(2); }
  const api = async (method, path, body) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "kb-daily-builds-watchdog" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok && !(method === "POST" && path === "/labels")) throw new Error(`${method} ${path} -> HTTP ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  };
  const log = await raise({ alerts, scope, api });
  console.log(log.join("\n") || "no alerts, nothing to close");
}
