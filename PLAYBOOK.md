# kb-daily-builds — LOOP PLAYBOOK (v2, 2026-09-24)

The single source of truth for the automated daily-project system. Scheduled
sessions: **follow this document exactly.** It assumes no memory of any
previous conversation. Read `KNOWN-ENVIRONMENT.md` once per run as well; it
lists the sandbox facts that previous runs lost time rediscovering.

## 1. What this system is

Owner: **Kumar Bipul** (github.com/**kbipul**, www.kumarbipul.com), an IT
Director building credibility as an AI/ML leader across Azure, Microsoft 365,
AWS, GCP and India's AI landscape. One sharp, tested, browser-based tool ships
to GitHub every day, fully automated, with a weekly audit.

```
Claude (06:00 IST)                           GitHub (cloud, automatic)
┌──────────────────────────────┐   push   ┌──────────────────────────────────┐
│ plan slot → claim → select   │─────────▶│ publish.yml: create repo, push,   │
│ in lane → build → gates →    │          │ Pages, sync About/topics, profile │
│ upsert entry → commit        │          │ board, alert issues on failure    │
└──────────────────────────────┘          │ watchdog.yml (10:00 IST daily):   │
                                          │ no-build / stuck / token alerts   │
                                          └──────────────────────────────────┘
```

**What changed in v2 and why** (from the 2026-09-24 review of all 45 builds):
the loop now builds by **weekday lane** because pure top-score selection
produced 20 AI-controls builds and zero M365, AWS or GCP builds in 45 days;
scores need **one written clause per dimension** because 16 of the last 20
winners scored a flat 12/12; every build must meet a **sharpness bar** (a named
decision, the user's own input, primary sources); state writes go through
**scripts** because hand edits broke publishing six times; and **GitHub Issues**
are the alarm channel because a 36-day outage went unnoticed.

Paths:
- Workspace: `…/Claude/Projects/GithHub Update/` (sandbox: `/sessions/<session>/mnt/GithHub Update/`)
- Hub repo: `https://github.com/kbipul/kb-daily-builds` (local mirror `hub/`, read-only)
- Token: `.secrets/github_token.txt` (never commit, never print)

## 2. The lanes

| IST weekday | Lane key | Lane | What qualifies |
|---|---|---|---|
| Monday | `azure` | Azure & Microsoft AI | Models a Microsoft-documented behaviour of Foundry, Azure OpenAI, AI Search, Content Safety, Entra for AI, Agent Framework |
| Tuesday | `controls` | Controls that don't hold | A control people believe they have over an AI system, and the documented reason it does not hold. Any vendor |
| Wednesday | `multicloud` | Azure × AWS × GCP | The same decision on three clouds, each from its own docs. Azure is always one of the three |
| Thursday | `m365` | M365, Copilot & Graph | Copilot readiness, oversharing, Purview, Graph permissions |
| Friday | `india` | India (flagship) | Indic languages, DPDP, IndiaAI models, DPI, global AI platforms seen from India |
| Saturday | `director` | Director's toolkit | A decision tool for cost, risk, reliability, eval budgets or build-vs-buy |
| Sunday | `open` | Open | Best candidate from any lane, or any fresh signal |

Candidate pools live in `backlog/lanes.json` (31 seeded items, 20 with facts
verified against primary sources on 2026-09-24). `backlog/backlog.md` is the
pre-v2 archive: do not read it during daily runs.

## 3. The daily loop — exact procedure

**Step 0 — Sync.** Work from a fresh clone, never from `hub/` (see KNOWN-ENVIRONMENT).

```bash
cd "/sessions/<session>/mnt/GithHub Update"
TOKEN=$(cat .secrets/github_token.txt | tr -d '\r\n ')
H=/tmp/hub-run-$(date +%s) && echo "$H" > ~/hubpath.txt
git clone -q "https://x-access-token:${TOKEN}@github.com/kbipul/kb-daily-builds.git" "$H"
```

Clone fails (bad token, no network): STOP and report. Token file missing:
report setup incomplete (SETUP-CHECKLIST.md). Cloud routine: see §9.

**Step 1 — Plan and claim.**

```bash
cd $H && node scripts/today.mjs
```

It prints one `BUILD` line per open slot (max 2, oldest first, never older than
7 days), the slot's lane, the next day number, lane coverage, and any pool items
that hit the carry limit. `nothing … Stand down.` means another run already
filled or claimed today: report that in one line and stop. For each `BUILD` line,
claim before building:

```bash
node scripts/claim-slot.mjs --slot <YYYY-MM-DD> --day <N> --by local   # or cloud / dispatch
git add state/claims.json && git commit -qm "claim: <slot> Day <NNN> [skip ci]"
git push -q "https://x-access-token:${TOKEN}@github.com/kbipul/kb-daily-builds.git" main
```

Push rejected: `git pull --rebase`, re-run `today.mjs`, and stand down if the
slot is now filled or claimed. A claim expires after 3 hours, so a run that dies
never blocks the next one.

**Step 2 — Select within the lane (~15 min).**

*A. Signal scan.* Always fetch `https://github.com/trending`. Then WebSearch the
last 7 days for the lane:

| Lane | Searches (add the current month and year) |
|---|---|
| azure | Azure AI Foundry / Azure OpenAI announcement; Microsoft Learn "what's new" for Foundry; `microsoft_docs_search` on the pool item's topic |
| controls | AI agent security disclosure; AI safety research; model release system card |
| multicloud | Amazon Bedrock new feature; Vertex AI / Gemini Enterprise new feature; Azure AI Foundry new feature |
| m365 | Microsoft 365 Copilot release notes; SharePoint Advanced Management; Purview for AI; Graph permissions change |
| india | IndiaAI Mission; DPDP Rules; Indian LLM release (Sarvam, BharatGen, Krutrim); MeitY AI advisory |
| director | AI FinOps; EU AI Act implementation date; enterprise AI adoption survey |
| open | all of the above, lightly |

Skip hosts listed as blocked in KNOWN-ENVIRONMENT; note them in the report and move on.

*B. Slate.* Every `unbuilt` item in the lane's pool in `lanes.json`, plus 1–3
fresh ideas from today's signals that fit the lane. Sunday (`open`): the two
strongest items from any lane plus fresh ideas.

*C. Score (rubric v2).* 0–3 per dimension, total /12. **Write one clause per
dimension**; a score without its clause does not count.

| Dimension | 3 | 2 | 1 |
|---|---|---|---|
| `decision` | A named role makes a named decision differently after 10 seconds with it | Informs a decision indirectly | Educational only |
| `timeliness` | Rides a primary-source event ≤7 days old, **date quoted from that source** | ≤30 days old, or a dated deadline ≤90 days away | Evergreen but current |
| `demo` | A stranger gets it in 10 s **and** it runs on their own input | Works on presets only | Needs reading first |
| `distinct` | Models a documented mechanic no one has shipped as a tool, and no overlap with any earlier build (check state.json titles and taglines) | New angle on covered ground | Me-too |

*Feasibility gate:* buildable to full quality in one run as a static React +
TypeScript + Vite app, zero paid APIs, zero keys. Fails the gate = disqualified.

*D. Decide.* Highest total wins. Tie → the pool item over a fresh idea.
**Off-lane override:** at most once per ISO week, only for a candidate from
another lane that has `timeliness` 3 and beats the lane winner by ≥3 points;
record `"override": true`. Otherwise an off-lane idea scoring ≥8 is added to its
own lane's pool via the slate file, with its signal date.

*E. Record the slate.*

```bash
node scripts/record-slate.mjs /tmp/slate-NNN.json
```

Format is in the script header. It marks the winner built, adds a loss row to
every losing pool item, adds fresh losers ≥8 to the pool, and retires any item
that has lost 3 times on the same dimension.

**Step 3 — Build to the sharpness bar.** In `projects/NNN-<slug>/`. The folder
is the exact public repo plus `project.json`:

```json
{ "day": N, "repo": "<slug>", "title": "…", "tagline": "≤140 chars",
  "description": "≤120 chars, becomes the GitHub About line",
  "topics": ["3-12 honest tags"], "demo": "pages", "lane": "<lane key>",
  "stack": ["React 18", "TypeScript", "Vite", "Vitest"] }
```

Stack is fixed: React 18 + TypeScript + Vite + Vitest, GitHub Pages demo.
README from `templates/project-readme.md` (v2). CI from `templates/ci-node.yml`
(keep the `screenshot` job). MIT `LICENSE`, `.gitignore`.

The sharpness bar, all seven:
1. **A decision.** `## Who it's for` names the role and the decision it changes.
2. **Their own input.** The app accepts the user's own data (paste, upload or
   editable parameters). Presets are for the first ten seconds, not the whole app.
3. **The finding.** One non-obvious claim, stated in `## The finding`, shown by
   the preset that loads by default (that is what the CI screenshot captures).
4. **Grounded.** Every product behaviour modelled traces to a primary source in
   `## Sources` with the fact quoted and a retrieval date. Prices, limits and
   quotas that can change are editable inputs showing their source and date,
   never hard-coded truths. Use `verified` facts from lanes.json as a starting
   point and re-check them.
5. **Tests pin rules.** At least 20 tests, including one per modelled rule,
   named with the rule's own words.
6. **Honest scope.** An in-app "What this is not" note: what is simulated, what
   was not run, what is out of scope.
7. **Honest metadata.** Tag a vendor or cloud only if the build models it.

If the winner won on `timeliness`, the README's first sentence names the signal
and its date. If it won on `demo`, the live demo is the centrepiece.

**Step 4 — Quality gates (all mandatory before push).**

Build in `/tmp/kbbuild-$(date +%s)/<repo>` (npm notes in KNOWN-ENVIRONMENT),
copy back source changes and `package-lock.json` only.

1. `npm test` and `npm run build` pass.
2. **Smoke test**, in ONE bash call:
   ```bash
   cd "$BUILD" && (setsid npx vite preview --port 4173 >/dev/null 2>&1 &) && sleep 6
   RESULT=0
   curl -sf "http://localhost:4173/<repo>/" | grep -q "<title>" || RESULT=1
   for a in $(grep -oE "/<repo>/assets/[^\"]+" dist/index.html); do curl -sfo /dev/null "http://localhost:4173$a" || RESULT=1; done
   echo "SMOKE_RESULT=$RESULT" > ~/smoke-<repo>.txt
   pkill -f "vite preview" >/dev/null 2>&1 || true
   ```
   Read `~/smoke-<repo>.txt` afterwards; exit 143 is not a failure.
3. `node scripts/check-project.mjs projects/NNN-<slug>` passes. It checks
   the manifest, base path, README v2 headings and sources, test floor, em
   dashes (≤8), bold-lead lines (≤2), "not X but Y" (≤1), series boilerplate,
   placeholders and secrets.
4. **Human-register pass.** Run the `be-human` skill over the README and in-app
   copy, structure first: lead Build notes with what failed or was cut; quote
   real strings; leave open verdicts open; never invent a fact to fill a hole.
5. **Truth pass.** Re-read every sentence in the README and UI that states a
   product fact or a number, and confirm it against `## Sources`. Audits found
   about ten wrong facts after publish; this is the step that prevents them.

**Time-box rule:** at roughly 70% of the session budget with gates unpassed,
cut scope to the core model + tests and ship that, noting the cuts in Build
notes. If gates still fail, push NOTHING and report why (the claim expires).

**Step 5 — Record and push.** Write `/tmp/entry-NNN.json`:

```json
{ "day": N, "folder": "NNN-<slug>", "slotDate": "YYYY-MM-DD",
  "valueScore": 11, "scores": {"decision":3,"timeliness":2,"demo":3,"distinct":3},
  "scoreNotes": {"decision":"…","timeliness":"…","demo":"…","distinct":"…"},
  "signal": "…", "rationale": "one line: why this won in its lane today",
  "sources": ["https://…"] }
```

Everything else (repo, title, tagline, description, lane, demo, stack) is
filled from `project.json` by the script. Then:

```bash
git pull --rebase -q "https://x-access-token:${TOKEN}@github.com/kbipul/kb-daily-builds.git" main
node scripts/upsert-entry.mjs /tmp/entry-NNN.json
node scripts/validate-state.mjs            # must print OK
git add -A && git -c user.name="Kumar Bipul" -c user.email="kbipul@users.noreply.github.com" \
  commit -qm "Day NNN: <Title>" --author="Kumar Bipul <kbipul@users.noreply.github.com>"
git push -q "https://x-access-token:${TOKEN}@github.com/kbipul/kb-daily-builds.git" main
```

Never hand-edit `state/state.json`. Rebase conflict on it: `git checkout --ours
state/state.json`, re-run `upsert-entry.mjs`, `git add`, `git rebase --continue`.

**Step 6 — Verify and mirror.** After ~3 minutes, `git ls-remote
https://github.com/kbipul/<repo>.git` must succeed. Then copy the project
folder, `state/`, and `backlog/lanes.json` into `hub/` (overwrite only). If
fan-out failed, leave status `built`; publish.yml retries on the next push and
the watchdog raises an issue after 2 hours.

**Step 7 — Report.** Day #, lane, title, top signals, slate with the four scores
each, why the winner won, repo and demo URLs, gate results (tests, smoke,
check-project, be-human, truth pass), the `today.mjs` coverage line, and
attention items. If blocked, also commit `ACTION-REQUIRED.md` at the repo root
(the watchdog turns it into an issue) and delete it once resolved.

## 4. Weekly audit (Sunday evening)

Review everything with `publishedAt` in the last 7 days:
1. For each repo: CI badge green, demo loads, `docs/demo.png` landed. Run
   `node scripts/check-project.mjs` on each folder.
2. Score 1–5 on: works, README clarity, originality, visual polish, **decision
   value** (/25).
3. **Calibration.** Compare each winner's selection scores with its audit
   scores. If the week's winners averaged ≥11 but decision value averaged ≤3,
   tighten the rubric anchors in §3 and say so in the report.
4. **Coverage.** Paste the `today.mjs` coverage table. Any lane with zero builds
   in 14 days despite its weekday coming round twice needs a cause.
5. **Pools.** Keep ≥4 `unbuilt` items per lane in `lanes.json`. Verify new seeds'
   premises against primary sources (Microsoft Learn MCP for azure and m365) and
   record them as `verified` facts with the source URL and date. Review items
   the carry limit retired: revive with a new angle or leave retired.
6. **Retro-audit.** Score one never-audited old day per week (Days 1–11, 33,
   43–45) until none remain.
7. Fix what is fixable, then re-queue with `upsert-entry.mjs` and
   `"requeue": true` so publish.yml force-syncs the public repo. A hub-only fix
   never reaches the public repo on its own.
8. Check open `loop-alert` issues on the hub repo; they close themselves when
   the condition clears.
9. Write `audits/YYYY-Www.md`. LinkedIn drafts were dropped on 2026-09-24 at the
   owner's request: the focus is the code on GitHub.

## 5. Hard rules

- NEVER commit or print the token. NEVER commit `.secrets/`.
- NEVER backdate commits or fake streak data. Missed slots older than 7 days are
  reported, not backfilled.
- NEVER publish code that failed its own tests or `check-project.mjs`.
- NEVER hand-edit `state/state.json`; use `scripts/upsert-entry.mjs`.
- NEVER hard-code a price, limit or quota as fact; make it an editable input with its source.
- NEVER redraw the kB. logo with text; only embed `brand/*.svg` if present.
- React + TypeScript + Vite only; every build has a live Pages demo.
- All repos MIT-licensed, in Bipul's name.

## 6. Mobile / Dispatch operation

| Mode | Trigger words | Behaviour |
|---|---|---|
| **build** | "run the loop", "daily build" | Full §3 run |
| **topic build** | "build something about X" | X joins the slate of today's lane (or is scored as an off-lane override); it must still win |
| **status** | "loop status", "kb status" | Report only: `today.mjs` output, last 3 builds, open `loop-alert` issues, fan-out health (`git ls-remote` latest repo) |
| **catch-up** | "catch up missed days" | §3 with today.mjs's slots (max 2, ≤7 days back) |
| **audit** | "run the audit" | §4 now |

Dispatch sessions claim with `--by dispatch` and end with the Step 7 summary.

## 7. Alerts

GitHub Issues on `kbipul/kb-daily-builds`, label `loop-alert`, @kbipul
mentioned so GitHub emails him. One open issue per kind; a reminder at most
every 20 hours; auto-closed when the condition clears.

| Kind | Raised by | Condition |
|---|---|---|
| `no-build` | watchdog.yml (10:00 IST) | No build for 30+ hours |
| `fanout-stuck` | watchdog.yml | An entry `built` for 2+ hours but not published |
| `claim-abandoned` | watchdog.yml | A slot claimed 3+ hours ago and never filled |
| `action-required` | watchdog.yml | `ACTION-REQUIRED.md` exists at the repo root |
| `token-invalid` / `token-expiring` | both workflows | PUBLISH_TOKEN rejected, or expires within 14 days |
| `publish-failed` | publish.yml | Any publish run that did not succeed |

## 8. Recovery

| Problem | Fix |
|---|---|
| Push rejected (non-fast-forward) | `git pull --rebase`, retry once. Normal: publish.yml pushes `chore: mark published` within ~60 s |
| Rebase conflict in `state/state.json` | `git checkout --ours state/state.json`, re-run `upsert-entry.mjs`, `git add`, `git rebase --continue` |
| `esbuild` SIGSEGV | Truncated binary from an interrupted install: `rm -rf node_modules package-lock.json`, reinstall in the background |
| `unable to unlink` / stale `index.lock` in `hub/.git` | Never run git in `hub/`. Rename a stuck lock: `mv .git/index.lock .git/junk-$(date +%s)` |
| `token-invalid` / `token-expiring` issue | Regenerate a classic PAT (repo, workflow) and update the `PUBLISH_TOKEN` Actions secret. The local `.secrets` token is separate |
| Two schedulers both running | Claims make it safe, but disable one: the local task in the Scheduled panel, or the routine at claude.ai/code/routines |
| A lane's pool is empty | Generate 4 new seeds for that lane, verify their premises, add to `lanes.json` before building |
| publish.yml failing repeatedly | Read the run log linked in the `publish-failed` issue, fix, push |

## 9. Cloud routine mode

A claude.ai cloud routine runs on Anthropic's infrastructure with this repo
checked out on `main`, independent of any Mac. Its prompt is
`ROUTINE-PROMPT.md`. Differences from §3:
- **Step 0:** no clone, no `.secrets/`, no `hub/` mirror. Work in the checkout.
- **Claims and pushes:** `git push origin main` with no token in the URL; claim
  with `--by cloud`. If a push to `main` is rejected by branch protection,
  push `claude/day-NNN` and say so (publish.yml only fires on `main`).
- **Network:** a 403 with `x-deny-reason: host_not_allowed` is the environment
  allowlist; use search results instead and record the host.
- **Blocked run:** commit `ACTION-REQUIRED.md` at the repo root and stop; the
  watchdog emails Bipul.
- **Limits:** routine runs count against the account's daily run cap.

Run only one scheduler. If both exist, claims prevent double builds, but the
duplicate still burns a session every morning.

## 10. Why each rule exists (short history)

- **Lanes, rubric v2, sharpness bar, scripts, alerts:** 2026-09-24 review of 45 builds.
- **Claims:** 7 schedule collisions, 15–21 Sep 2026.
- **upsert-entry.mjs:** missing `folder` ×3 (Days 021/026/033), missing `tagline` ×6, dropped URLs on Day 044.
- **Watchdog + token alerts:** publishing blocked 27 Jul – 2 Sep 2026 with nobody alerted.
- **check-project.mjs:** be-human limits drifted (Days 026–034 shipped with 15–28 em dashes); tests per project halved between the W37 and W38 audits.
- **Truth pass:** about ten factual errors found after publish across W30–W38.
