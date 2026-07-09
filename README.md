<div align="center">

# kb-daily-builds

**One small AI project, shipped every day.**

By [Kumar Bipul](https://www.kumarbipul.com). 15+ years in IT, now building toward AI/ML.

</div>

## The routine

I ship one focused AI project a day and keep the whole trail here in the open.

1. **Pick.** Each morning I take the next idea from `backlog/` (a themed 90-day pipeline I planned out), or swap in something timelier if the week's news is more interesting.
2. **Build.** Code, tests, a README that explains the thinking, and a live demo wherever the tech allows it. Default stack is React + TypeScript + Vite, with C#/.NET for the Azure-flavoured builds.
3. **Check before it ships.** Tests pass, the build is clean, no secrets in the tree. If it isn't actually working, it doesn't go out. A missed day is honest; a broken repo isn't.
4. **Publish.** I commit each project under `projects/NNN-name/`, then a small publish script I wrote turns it into its own public repo, sets the topics, and switches on GitHub Pages for the demos so I'm not clicking through the same setup every day.
5. **Review on the weekend.** Every Sunday I go back over the week's builds, flag the weak ones, and fix what's worth fixing.

## Shipped so far

| Day | Project | What it does | Live demo |
|----:|---------|--------------|-----------|
| 001 | [neural-notes](https://github.com/kbipul/neural-notes) | Semantic note search, entirely in the browser | [demo](https://kbipul.github.io/neural-notes/) |
| 002 | [mood-of-the-room](https://github.com/kbipul/mood-of-the-room) | Per-sentence sentiment heatmap for any text | [demo](https://kbipul.github.io/mood-of-the-room/) |
| 003 | [zero-shot-tagger](https://github.com/kbipul/zero-shot-tagger) | Classify text into your own labels, no training | [demo](https://kbipul.github.io/zero-shot-tagger/) |

## Repo map

| Path | What it is |
|------|------------|
| `projects/` | One folder per day, the exact contents of each published repo |
| `backlog/` | The 90-day project pipeline, themed by week |
| `state/state.json` | What's been built and published, plus notes on why each idea was picked |
| `templates/` | The README and CI templates I start each project from |
| `scripts/` | Profile README generator |
| `.github/workflows/publish.yml` | The publish script: repo creation, Pages, profile board |

## Why in public

Shipping daily in public keeps me honest about quality. Everything here compiled, passed its tests, and deployed before it reached you. The misses stay visible too, which is rather the point.

---

<sub>Stack: React · TypeScript · C#/.NET · Azure AI · transformers.js · [kumarbipul.com](https://www.kumarbipul.com)</sub>
