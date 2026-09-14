# kb-daily-builds — LOOP PLAYBOOK

The single source of truth for the automated daily-project system.
Scheduled Claude sessions: **follow this document exactly.** It assumes no
memory of any previous conversation.

## 1. What this system is

Owner: **Kumar Bipul** (github.com/**kbipul**, www.kumarbipul.com) — IT
Director building public AI/ML credibility. One new project ships to GitHub
**every day, fully automated**, with a weekly human audit.

```
Claude (this folder, 6:00 AM IST)          GitHub (cloud, automatic)
┌─────────────────────────────┐    push    ┌──────────────────────────────┐
│ pick idea → build → test →  │──────────▶│ publish.yml: create new repo, │
│ README → commit to hub/     │            │ push code, enable Pages,     │
└─────────────────────────────┘            │ update profile README board  │
                                           └──────────────────────────────┘
```

Paths (this machine):
- Workspace: `…/Claude/Projects/GithHub Update/` (in the sandbox: `/sessions/<session>/mnt/GithHub Update/`)
- Hub repo working copy: `hub/` → pushes to `https://github.com/kbipul/kb-daily-builds`
- Token: `.secrets/github_token.txt` (never commit, never print)

## 2. The daily loop — exact procedure

**Step 0 — Sync. Work from a fresh `/tmp` clone, NOT from `hub/`.**

> ⚠️ Filesystem lesson (learned Day 008): the sandbox can read and create files
> in the mounted folder but **cannot `unlink()` them**. Git needs deletion for
> almost everything — `checkout`, `reset`, `pull --rebase`, releasing its own
> `index.lock` — so running git inside `hub/` corrupts the repo (a stale
> `.git/index.lock` that can never be removed, and bogus `refs/heads/main.lock.*`
> refs). Renaming still works, which is the only reason Day 008 was recoverable.

The procedure, every run:

```bash
TOKEN=$(cat .secrets/github_token.txt | tr -d '\r\n ')
# Use a UNIQUE clone dir per run. Do NOT reuse a fixed /tmp/hub and do NOT
# `rm -rf` it: each sandbox session runs as a different uid, so yesterday's
# /tmp/hub is owned by another user and is UNDELETABLE. `rm -rf /tmp/hub`
# exits non-zero, and in an `&&` chain the clone then never runs — Step 0
# fails silently. (Verified 2026-07-18.)
export HUB=/tmp/hub-run-$(date +%s)
git clone "https://x-access-token:${TOKEN}@github.com/kbipul/kb-daily-builds.git" "$HUB"
```

Same rule for the build dir in Step 3: use `/tmp/kbbuild-$$/<repo>`, never a
fixed `/tmp/build/<repo>` (same stale-ownership trap).

GitHub is the source of truth. Do **all** git work — read state, build, test,
commit, push — inside `/tmp/hub`. After a successful push, copy the new project
folder + `state/state.json` + `backlog/backlog.md` back into `hub/` so Bipul has
a readable local mirror (creating/overwriting files is allowed; deleting is not).
Treat `hub/` as a **read-only mirror**, never as a git working tree.

If the clone fails (bad token, no network), STOP and report — do not fall back
to `hub/`. If `.secrets/github_token.txt` is missing, report that setup is
incomplete (see SETUP-CHECKLIST.md).

**Step 1 — Read state.** Open `hub/state/state.json` and `hub/backlog/backlog.md`.
Determine the next unbuilt day number. **Catch-up rule:** if more than one day
is unbuilt (missed days), run the selection protocol once and build up to 2
projects this run (oldest day number first).

**Step 1.5 — Selection protocol (~15 min, every run).** The backlog is a
candidate pool, NOT a queue. Each morning the highest-value candidate wins.

*A. Deep signal scan — gather, don't build yet:*
1. WebSearch: `AI news <today's date>`, `new LLM model release this week`,
   and `Microsoft Azure AI announcement this week` — capture anything <7 days old.
2. Fetch https://github.com/trending (github.com is reachable from the
   sandbox) — note trending AI/TS/.NET repos and what need they signal.
3. WebSearch: `Hugging Face trending models this week` and
   `site:reddit.com LocalLLaMA this week` (direct HF/Reddit fetches may be
   allowlist-blocked — search results are the fallback; note unreachable
   sources in the run report, never stall on them).
4. Distill into ≤5 bullet "signals" (e.g., "Claude X released with computer
   use v2", "new Phi model runs in browser", "Ignite announced Copilot APIs").

*B. Build the slate:* the next 2 unbuilt backlog items + 1–3 fresh project
ideas derived from today's signals (must fit the stack + one-run scope).

*C. Score every candidate (0–3 each, total /12):*
| Dimension | 3 means |
|---|---|
| Positioning fit | screams "AI/ML leader on the Microsoft stack" to a senior reviewer |
| Timeliness | rides a <7-day-old signal people are talking about TODAY |
| Demo-ability | a stranger gets the wow in 10 seconds via live Pages demo |
| Distinctiveness | not a me-too tutorial; an angle few have shipped |

*Feasibility gate:* buildable to full quality in one run, in the sandbox,
with zero paid APIs for the demo path — candidates that fail this are
disqualified regardless of score.

*D. Decide:* **highest total score wins — every day, no swap limit.**
Ties → the backlog item. Displaced backlog items shift forward (never
deleted). New signal-derived ideas that lost but scored ≥8 are appended to
the backlog.

*E. India flagship days:* every 14th day (day 14, 28, 42, …) the slate is
drawn ONLY from the "India Flagship Pool" in backlog.md — bigger builds
serving the "authentic AI voice in India" goal. Score within that pool the
same way.

*F. Record the decision* in the project's state.json entry:
`"valueScore": N, "signal": "<which news/trend, if any>",
"rationale": "<one line: why this won today>"` — this rationale is raw
material for LinkedIn posts, never discard it.

**Step 2 — Build the selected candidate** in `hub/projects/NNN-<slug>/`
(NNN = zero-padded day):
- Build the selection-protocol winner to its scored promise — if it won on
  Timeliness, the README's first line must name the signal it rides; if on
  Demo-ability, the live demo is the non-negotiable centerpiece.
- Default stack: React 18 + TypeScript + Vite + Vitest (demo: `pages`).
  C#/.NET 8 + xUnit where the backlog says so.
- Folder = the EXACT contents of the future public repo, plus one extra file
  `project.json` (the manifest — publish.yml consumes and strips it):

```json
{ "day": N, "repo": "<slug>", "title": "…", "tagline": "…",
  "description": "≤120 chars for the GitHub repo description",
  "topics": ["ai", "typescript", "…" ], "demo": "pages|byok|cli|none",
  "stack": ["React", "…"] }
```

- README from `hub/templates/project-readme.md` — every placeholder filled,
  including the honest **Build notes** section. If `hub/brand/logo-primary.svg`
  exists, copy it to `<project>/brand/` and keep the logo `<img>`; otherwise
  remove the logo line (never fake the mark with text).
- CI workflow from `hub/templates/ci-node.yml` or `ci-dotnet.yml` →
  `<project>/.github/workflows/ci.yml` (drop the deploy job unless demo=pages).
- MIT `LICENSE` file, sensible `.gitignore`.

**Step 3 — Quality gates (all mandatory before push):**

> ⚠️ Performance lesson (learned Day 001): NEVER run `npm install` inside the
> mounted folder — its I/O is ~50× slower and file deletion is restricted.
> Copy source (excluding node_modules) to `/tmp/build/<repo>/`, install/test/
> build there, then copy back ONLY source changes + `package-lock.json`.

1. `npm ci && npm test && npm run build` passes in the sandbox (Node projects).
   .NET: `dotnet test` if the SDK is installable in the sandbox; otherwise
   compile-review carefully — CI is the enforcement gate and MUST pass.
2. For `pages` demos: Vite config has `base: "/<repo>/"` — Pages breaks without it.
3. **Smoke test (mandatory for `pages` demos)** — proves the built app actually
   serves at its Pages path, catching base-path breakage before publish:
   ```bash
   cd "$BUILD" && (setsid npx vite preview --port 4173 >/dev/null 2>&1 &) && sleep 5
   RESULT=0
   curl -sf "http://localhost:4173/<repo>/" | grep -q "<title>" || RESULT=1
   for a in $(grep -oE "/<repo>/assets/[^\"]+" dist/index.html); do
     curl -sfo /dev/null "http://localhost:4173$a" || RESULT=1   # every asset must 200
   done
   echo "SMOKE_RESULT=$RESULT" > /tmp/smoke.txt   # write BEFORE killing anything
   pkill -f "vite preview" >/dev/null 2>&1 || true
   ```
   > ⚠️ `pkill -f "vite preview"` also matches the *shell running the smoke test*
   > (its own command line contains that string), so it SIGTERMs itself — the
   > script dies with exit 143 before printing PASS/FAIL. Always persist the
   > result to a file first and read it back in the next command, and never read
   > exit 143 here as a gate failure. (Verified 2026-07-18.)
   For `cli` projects: run the tool's primary command once and check exit 0.
4. **Secret scan (mandatory, mechanical)** — run over the project folder;
   ANY hit blocks the push:
   ```bash
   grep -rEn --exclude-dir=node_modules --exclude=package-lock.json \
     "(ghp_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)" . \
     && FAIL || PASS
   ```
5. No secrets, no API keys, no personal data anywhere. `byok` projects read
   keys ONLY from env vars, documented in the README.
6. README renders correctly: no unfilled `{{PLACEHOLDERS}}`, commands verified.
6b. **Human-register pass (mandatory, added 2026-09-14).** Run the `be-human` skill
   over the README and the in-app copy (hero, honesty panel, finding titles) BEFORE
   the commit, structure first: lead Build notes with what failed, stalled or was
   cut; carry any second thread the rationale records; quote real strings (test
   names, error text, spec sentences) instead of summarising them; leave a verdict
   open where it is open. Then the surface pass: zero `**Bold lead.** paragraph`
   runs, em dashes in prose ≤2 per document, at most one "not X but Y", no series
   boilerplate repeated verbatim from earlier days ("Three decisions carry the whole
   thing", "No model, no network, no key"). Never invent a fact to fill a hole.
   Mechanical check before commit: `grep -o "—" README.md | wc -l` and
   `grep -c '^\*\*[^*]*\*\*' README.md` — anything above 8 and 2 means the pass was
   skipped. Why this exists: the skill was applied by hand on 4–5 Sep (Days 1–25),
   never written down, and Days 026–034 shipped at 16–28 em dashes and 5–12
   bold leads each until they were rewritten on 14 Sep.
7. Original work — no copied tutorials; cite any borrowed snippet inline.
8. **Screenshots:** the sandbox CANNOT run a browser (verified 2026-07-06: no
   root, Chromium blocked on missing libXdamage) — never claim otherwise.
   Each repo's CI captures `docs/demo.png` on the GitHub runner and commits it
   back (`screenshot` job in `templates/ci-node.yml`). README may reference
   `docs/demo.png`; it appears within minutes of publish. The Sunday audit
   verifies it landed.

**Time-box rule:** at roughly 70% of the session's practical budget with gates
still unpassed, cut scope to the core feature + tests and ship that — note the
cuts honestly in Build notes. Small and working beats big and unshipped. If
gates still can't pass, push NOTHING and report why.

**Step 4 — Record + push.**
- Append the project entry to `state/state.json` with `"status": "built"`,
  set `dayCounter`.
- Commit in `hub/`: identity `Kumar Bipul <kbipul@users.noreply.github.com>`
  (this attribution = his green contribution squares), message
  `Day NNN: <Title>`.
- Push: `git push https://x-access-token:<TOKEN>@github.com/kbipul/kb-daily-builds.git main`
  where `<TOKEN>` is read from `.secrets/github_token.txt`. Never echo it.

**Step 5 — Verify fan-out (wait ~3 min, then check):**
- `git ls-remote https://github.com/kbipul/<repo>.git` → exists means the
  Action worked. (The GitHub API is blocked in the sandbox; use git, or check
  https://github.com/kbipul/kb-daily-builds/actions via web fetch.)
- If the fan-out failed, leave status `"built"` (the Action is idempotent and
  retries on the next push) and note the failure in the run summary.

**Step 6 — Report.** End the session with a short summary: day #, title, repo
URL, demo URL, test results, anything needing Bipul's attention.

## 3. Weekly audit (Sundays)

Review everything with `publishedAt` in the last 7 days:
1. Fetch each repo page; confirm CI badge green + demo loads (`pages` ones).
2. Score each 1–5 on: works, README clarity, originality, visual polish.
3. Write `hub/audits/YYYY-‘W'WW.md` — scores, issues found, fixes applied.
4. Fix what's fixable immediately (typos, broken demo, failing CI) by editing
   `hub/projects/NNN-*/` and pushing — the Action force-syncs repos.
5. Anything scored ≤2: recommend deletion or rebuild to Bipul in the summary.
6. Refill backlog when ≤14 ideas remain (rule at the bottom of backlog.md);
   keep the India Flagship Pool stocked with ≥4 unbuilt ideas.
7. **Selection-quality check:** review the week's `valueScore`/`rationale`
   entries — did timely picks actually land (stars, demo traffic, still
   relevant by Sunday)? Did pure top-score selection dissolve the weekly
   learning arc (7 unrelated one-offs)? If either drifts two weeks running,
   recommend recalibrating the rubric weights to Bipul in the audit report.
8. Draft 2–3 LinkedIn post options from the week's best Build notes → save to
   `hub/audits/linkedin-drafts-WW.md` for Bipul to post manually (nothing
   auto-posts to LinkedIn).

## 4. Hard rules

- NEVER commit or print the token. NEVER commit `.secrets/`.
- NEVER backdate commits or fake streak data. A missed day is caught up
  honestly (2 projects next run), not falsified.
- NEVER publish code that failed its own tests. Late and good beats daily and
  broken — if quality can't be reached in a run, push nothing and report why.
- NEVER redraw the kB. logo with text; only embed `brand/*.svg` if present.
- All repos MIT-licensed, in Bipul's name.

## 5. Mobile / Dispatch operation

Ad-hoc sessions (dispatched from the Claude mobile app, or manual chats) use
these modes — same rules as §2, different entry points:

| Mode | Trigger words | Behavior |
|---|---|---|
| **build** | "run the loop", "daily build" | Full §2 run, including Step 1.5 + all gates |
| **topic build** | "build something about X" | §2 run with X injected as a slate candidate in Step 1.5 — it must still win on score and pass the feasibility gate; if it loses, report what won and why |
| **status** | "loop status", "kb status" | Report only, no building: last published day, streak, pending `built` items, next candidates, fan-out health (`git ls-remote` the latest repo) |
| **catch-up** | "catch up missed days" | §2 catch-up rule: oldest missed day first, max 2 builds |
| **audit** | "run the audit" | Execute §3 immediately instead of Sunday |

Dispatch sessions MUST end with a compact summary (day #, title, repo/demo
URLs, gate results, attention items) — that summary is what reaches the phone.
A dispatched build and the 6 AM scheduled run are idempotent-safe: both read
state.json first; a day already `built` or `published` is never rebuilt.

## 6. Recovery

| Problem | Fix |
|---|---|
| Push rejected (non-fast-forward) | `git pull --rebase`, retry once. Common and harmless: the publish Action pushes a `chore: mark published` commit within ~60s of your push, so a second commit in the same run will always need a rebase first |
| `unable to unlink` / stale `index.lock` in `hub/.git` | The mounted folder forbids deletion. Never run git in `hub/` (see Step 0 — clone to `/tmp`). To un-wedge an existing lock you can only *rename* it: `mv .git/index.lock .git/junk-$(date +%s)` |
| Token invalid/expired | Report clearly: "Regenerate PAT, paste into .secrets/github_token.txt" |
| Action failing repeatedly | Read the run log via web fetch, fix publish.yml, push |
| Sandbox can't build .NET | Swap to a Node/TS project from the same theme; CI still gates the .NET one when possible |
| Backlog empty | Generate 30 more ideas per refill rule before building |

## 7. Cloud routine mode (added 2026-09-14)

**Why.** A Cowork scheduled task bound to a folder runs only while this Mac is
awake and the desktop app is open; a run the machine sleeps through is skipped.
A Claude Code **cloud routine** (claude.ai/code/routines) runs on Anthropic's
infrastructure with this repo cloned fresh on every run and pushes under
Bipul's own GitHub identity, so neither `.secrets/github_token.txt` nor the
local `hub/` mirror is needed. This copy of PLAYBOOK.md, in the repo root, is
the canonical one from 2026-09-14; the copy in the "GithHub Update" folder is
a mirror.

**One-time setup (Bipul, ~5 minutes):**
1. claude.ai/code/routines → **New routine**. Name `kb-daily-build-loop`.
   Repository `kbipul/kb-daily-builds` (the form prompts to install the Claude
   GitHub App if it is missing). Environment **Default** (Trusted network:
   github.com and the npm registry are on the allowlist; huggingface.co and
   reddit.com are not, same as the local sandbox). Schedule **Daily, 06:00**
   in local time. Prompt: paste the whole of `ROUTINE-PROMPT.md`.
2. Under **Connectors**, remove everything the loop does not use. Web search
   and fetch are built-in tools, not connectors.
3. Click **Run now** once and watch the session: it should push `Day NNN: …`
   to `main`, and publish.yml should fire within a minute. Only then pause the
   local Cowork task (`kb-daily-build-loop` in the Scheduled panel). Never let
   both run: they read the same `state.json`, and a day already `built` or
   `published` is never rebuilt, but two runs starting the same morning would
   race on the same day number.
4. Do the same for the Sunday audit when convenient (`kb-weekly-audit`, weekly
   Sunday 19:00, prompt from its SKILL.md with the same §7 substitutions).

**What changes when §2 runs as a routine:**
- **Step 0.** No clone. The repo is already checked out on `main` at the
  working directory. Work there. There is no `.secrets/`; do not look for it.
- **Step 4 push.** `git push origin main` with no token in the URL. The session's
  GitHub credential is used and commits carry Bipul's identity. If the push is
  rejected (a protected branch, or a foreign-author check), push
  `claude/day-NNN` instead and say so in the report: publish.yml fires only on
  `main`, so that day's fan-out waits for a merge.
- **Step 3 build dir.** `/tmp/kbbuild-<ts>/<repo>` as before. The VM is fresh,
  so the stale-ownership trap in Step 0 does not apply, but keep the smoke test
  in one shell call.
- **Network.** A fetch that fails with HTTP 403 and `x-deny-reason:
  host_not_allowed` is outside the environment allowlist. Use the search
  fallback (already the rule) and record the host in the report; do not retry.
- **Mirror.** No copy back to `hub/`; there is no `hub/` in the cloud.
- **Report.** The session transcript is the report. If a run is blocked, commit
  `ACTION-REQUIRED.md` at the repo root (it does not touch a publish.yml
  trigger path) and stop.
- **Limits.** Routine runs count against the account's daily run cap and
  subscription usage. One daily build plus one weekly audit fits; do not add
  hourly routines to the same account without checking the cap at
  claude.ai/code/routines.
- **Credentials still to rotate.** The `PUBLISH_TOKEN` Actions secret (the one
  publish.yml uses to create repos) expires ~Oct 2026 regardless of where the
  loop runs. The local PAT is only needed for manual dispatch runs from the Mac.
