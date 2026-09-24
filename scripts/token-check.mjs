#!/usr/bin/env node
// Is PUBLISH_TOKEN alive, and when does it die? Prints a JSON array of alerts.
// Classic PATs report their expiry in the github-authentication-token-expiration
// response header. Runs on GitHub Actions only (the build sandbox cannot reach
// api.github.com). The last dead token cost 36 days of publishing.
const WARN_DAYS = 14;
const token = process.env.PUBLISH_TOKEN || "";
const alerts = [];
const fix = "Regenerate a classic PAT (scopes: repo, workflow), then update the Actions secret PUBLISH_TOKEN at https://github.com/kbipul/kb-daily-builds/settings/secrets/actions. Set a calendar reminder a week before the new expiry.";

if (!token) {
  alerts.push({ kind: "token-invalid", title: "PUBLISH_TOKEN secret is missing", body: `publish.yml cannot create repos or push without it.\n\n${fix}` });
} else {
  try {
    const r = await fetch("https://api.github.com/user", { headers: { Authorization: `token ${token}`, "User-Agent": "kb-daily-builds-watchdog" } });
    if (r.status === 401 || r.status === 403) {
      alerts.push({ kind: "token-invalid", title: `PUBLISH_TOKEN is rejected (HTTP ${r.status})`, body: `Nothing new will publish until this is fixed.\n\n${fix}` });
    } else {
      const exp = r.headers.get("github-authentication-token-expiration");
      if (exp) {
        const days = (new Date(exp.replace(" UTC", "Z").replace(/ ([+-]\d{4})$/, "$1")) - Date.now()) / 86400000;
        console.error(`PUBLISH_TOKEN expires ${exp} (${days.toFixed(1)} days)`);
        if (days < WARN_DAYS) alerts.push({ kind: "token-expiring", title: `PUBLISH_TOKEN expires in ${Math.max(0, Math.floor(days))} days`, body: `Expiry reported by GitHub: \`${exp}\`.\n\n${fix}` });
      } else console.error("PUBLISH_TOKEN has no expiry header (non-expiring or fine-grained token).");
    }
  } catch (e) {
    console.error(`token check could not reach GitHub: ${e.message}`);
  }
}
console.log(JSON.stringify(alerts));
