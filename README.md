<div align="center">

# kb-daily-builds

**The engine behind one AI project a day.**

Designed and run by [Kumar Bipul](https://www.kumarbipul.com) — IT Director → AI/ML.

</div>

## How the loop works

```
06:00 IST  Claude loop wakes → picks next idea from backlog/
           → builds the project (code, tests, README, demo)
           → verifies it: tests pass, build clean, no secrets
           → commits to projects/NNN-name/ and pushes here
           ↓
GitHub     publish.yml fans out:
Actions    → creates the standalone repo
           → pushes the code, sets topics
           → enables GitHub Pages when there's a live demo
           → updates the profile board at github.com/kbipul
           ↓
Sunday     A weekly audit reviews everything shipped,
           flags weak builds, and files fixes.
```

Every project ships with a README that explains the build, CI that proves it
works, and a live in-browser demo whenever the tech allows.

## Repo map

| Path | What it is |
|------|------------|
| `projects/` | One folder per day — the exact contents of each published repo |
| `backlog/` | The 90-day project pipeline, themed by week |
| `state/state.json` | Source of truth: what's built, what's published, streak data |
| `templates/` | README + CI templates every project starts from |
| `scripts/` | Profile README generator |
| `.github/workflows/publish.yml` | The fan-out: repo creation, Pages, profile updates |

## Why in public

Shipping daily in public forces real quality: everything here compiled, passed
its tests, and deployed before it reached you. The misses stay visible too —
that's the point.

---

<sub>Stack: React · TypeScript · C#/.NET · Azure AI · transformers.js — [kumarbipul.com](https://www.kumarbipul.com)</sub>
