# Routine prompt — paste everything below the line into the routine's Instructions box

---

You are running the kb-daily-builds loop for Kumar Bipul (github.com/kbipul) as a cloud routine. The repository kbipul/kb-daily-builds is already checked out on `main` at the working directory. There is no local folder, no `.secrets/` file and no `hub/` mirror; do not look for them.

MANDATORY FIRST STEP: read `PLAYBOOK.md` at the repository root and follow Section 3 (the daily loop) with the Section 9 substitutions (cloud routine mode). Read `KNOWN-ENVIRONMENT.md` once. The playbook is the single source of truth; this prompt is only a summary.

1. PLAN: `node scripts/today.mjs`. If it says to stand down, report one line and stop. For each BUILD line (max 2): `node scripts/claim-slot.mjs --slot <date> --day <N> --by cloud`, commit `state/claims.json` with "[skip ci]" in the message, `git push origin main`. If the push is rejected, pull, re-run today.mjs, stand down if the slot is taken.
2. SELECT WITHIN THE SLOT'S LANE (azure / controls / multicloud / m365 / india / director / open, by IST weekday): signal scan per the lane table in PLAYBOOK §3 Step 2; slate = the lane's unbuilt pool items in `backlog/lanes.json` + 1–3 fresh lane-fitting ideas; score decision / timeliness / demo / distinct 0–3 each with ONE WRITTEN CLAUSE per dimension; feasibility gate (static React+TS+Vite, zero paid APIs, one run); highest total wins, ties go to the pool item; off-lane override at most once a week (timeliness 3 and ≥3-point margin). `node scripts/record-slate.mjs /tmp/slate-NNN.json`.
3. BUILD to the seven-point sharpness bar in PLAYBOOK §3 Step 3: named decision, user's own input, a stated finding shown by the default preset, primary sources quoted with dates, ≥20 tests pinning each rule, an in-app "What this is not", honest topics. README from `templates/project-readme.md` (v2), CI from `templates/ci-node.yml`, MIT LICENSE, `project.json` with `lane` and a ≤120-char description.
4. GATES: npm test + build; smoke test in ONE shell call; `node scripts/check-project.mjs projects/NNN-<slug>` must pass; be-human pass on README and UI copy; truth pass on every product fact. Time-box: at ~70% of budget cut to core + tests; if gates still fail, push nothing.
5. RECORD: write `/tmp/entry-NNN.json` (day, folder, slotDate, valueScore, scores, scoreNotes, signal, rationale, sources), `git pull --rebase`, `node scripts/upsert-entry.mjs /tmp/entry-NNN.json`, `node scripts/validate-state.mjs` (must print OK), commit "Day NNN: <Title>" as "Kumar Bipul <kbipul@users.noreply.github.com>", `git push origin main`. Never hand-edit state.json.
6. VERIFY: after ~3 min `git ls-remote https://github.com/kbipul/<repo>.git`.
7. REPORT: day, lane, title, signals, slate with per-dimension scores, why it won, repo + demo URLs, gate results, the today.mjs coverage table, attention items. If blocked: commit `ACTION-REQUIRED.md` at the repo root (the GitHub watchdog emails Bipul) and stop.

HARD RULES: never backdate or fake data; never publish failing code; never hand-edit state.json; never hard-code a changeable price or limit as fact; never redraw the kB. logo with text.
