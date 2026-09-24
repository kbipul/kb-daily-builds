<div align="center">

# kb-daily-builds

**One sharp, tested AI tool a day, and the automated loop that ships it.**

By [Kumar Bipul](https://www.kumarbipul.com), IT Director building in public toward AI/ML leadership.

</div>

## What gets built

Every build is a small browser tool that models one documented behaviour of a
real AI platform, runs on your own input, and states one finding it can prove.
Each weekday has a lane, so the portfolio covers the ground an AI/ML Director
actually works on:

| Day | Lane | Example question |
|---|---|---|
| Mon | Azure & Microsoft AI | What does spillover hide from my PTU dashboard? |
| Tue | Controls that don't hold | Which AI control do we believe in that the docs say won't hold? |
| Wed | Azure × AWS × GCP | Where is my prompt actually processed on each cloud? |
| Thu | M365, Copilot & Graph | What can Copilot still surface after Restricted Content Discovery? |
| Fri | India | Is an Azure "Data Zone" deployment from Central India processed in India? |
| Sat | Director's toolkit | How many eval cases do we need to catch a 3-point regression? |
| Sun | Open | The strongest signal of the week |

The live board with every build is on the [profile page](https://github.com/kbipul).

## The rules each build must pass

- A named role and the decision it changes, written down.
- Works on your data, not only on presets.
- Every product fact traced to a primary source, quoted and dated. Prices and limits are editable inputs, never constants.
- At least 20 tests, one per modelled rule.
- Tests, build, a smoke test of the Pages path, a secret scan and a structural README check pass before anything is pushed. A missed day is honest; a broken repo is not.

## How the loop works

1. `scripts/today.mjs` works out which calendar slot is open and which lane it belongs to, and `claim-slot.mjs` claims it so two schedulers never build the same day.
2. The run scans that lane's news, scores the lane's candidate pool (`backlog/lanes.json`) plus fresh ideas on four written dimensions, and builds the winner.
3. `check-project.mjs` and `validate-state.mjs` gate the push; `upsert-entry.mjs` is the only thing that writes `state/state.json`.
4. `.github/workflows/publish.yml` turns each project folder into its own public repo, enables Pages, syncs the About line and topics, and redraws the profile board.
5. `.github/workflows/watchdog.yml` checks every morning that a build landed and the publishing token is healthy, and opens a GitHub issue if not.

## Repo map

| Path | What it is |
|------|------------|
| `projects/` | One folder per day: the exact contents of each published repo, plus `project.json` |
| `backlog/lanes.json` | Candidate pools per lane, with premises verified against primary sources |
| `state/state.json` | Every build, its lane, scores with written reasons, signal and sources |
| `scripts/` | The loop's tooling (plan, claim, gate, record, alert, profile) |
| `templates/` | README and CI templates |
| `audits/` | Weekly audits |
| `PLAYBOOK.md` | The procedure every run follows |

---

<sub>React · TypeScript · Vite · Vitest · GitHub Actions · [kumarbipul.com](https://www.kumarbipul.com)</sub>
