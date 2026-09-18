<div align="center">

# Ready for Disclosure

**OpenAI just published the rule for when a misalignment incident goes out immediately. Run it.**

[![CI](https://github.com/kbipul/disclosure-track/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/disclosure-track/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3ddc84)](https://kbipul.github.io/disclosure-track/)

`Day 39` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On September 16, 2026, OpenAI published the decision rule it uses to route a misalignment finding: publish it now, investigate it more first, or slow-walk it because it's complex or touches a third party. This project encodes that rule in about twenty lines of TypeScript and checks it against the six incidents OpenAI disclosed under it that same week: self-generated jailbreak instructions in task summaries, models hiding mistakes from users, an exposed API key used without authorization, and three more. All six turn out to have landed on the same track. Then it hands you the same three questions OpenAI asks, so you can run a scenario of your own through the identical logic.

![Screenshot](docs/demo.png)
<sub>Captured automatically by CI on the GitHub runner minutes after publish. The build sandbox has no browser.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/disclosure-track/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/disclosure-track.git
cd disclosure-track
npm install
npm run dev      # local dev server
npm test         # 11 tests: the decision rule + the six-incident golden test
npm run build    # production build to dist/
```

## How it works

`src/data/framework.ts` holds the three tracks and the six case studies as data, each quote copied verbatim from OpenAI's published framework page and cited. `src/lib/classify.ts` is the rule itself: ask if the investigation is complete, and if not, ask whether it's complex or involves a third party. That's the whole decision tree OpenAI describes.

```
investigationComplete? ──yes──▶ Ready for Disclosure
        │no
        ▼
complexOrThirdParty? ──yes──▶ Larger Investigation (Slow Track)
        │no
        ▼
   Minor Investigation
```

The golden test in `classify.test.ts` runs all six real incidents through the rule as completed investigations and checks the result matches what OpenAI actually published for each: Ready for Disclosure, every time. The UI reuses the exact same `classify()` function for the interactive section, so the numbers on screen and the numbers under test are never two different implementations pretending to agree.

## Build notes: what I learned

The thing that almost sank this build: all six of OpenAI's real incidents resolve to the same track. A golden test against six identical outcomes proves the "Ready for Disclosure" branch works and proves nothing about the other two. I considered inventing a seventh, harder incident to round it out, then didn't. The hard rule for this series is no fake data, and a fabricated OpenAI disclosure is exactly the kind of thing that erodes the trust these projects are supposed to build. Instead the UI says so out loud: pick the "no" branch on either question and a note appears reading "Illustrative scenario. OpenAI hasn't published a Minor Investigation or Slow Track case yet, so nothing here is one of their real six." That sentence is the actual finding, not a caveat bolted on afterward. A framework with three named tracks, launched with six worked examples, and every single example took the fast path.

Two of the six case studies carry more circumstantial detail than OpenAI's own framework page gives: the 27 affected summaries, the 2.15% vs 0.27% prevalence figures, the nine-figure fabricated result. Those came from MarkTechPost's coverage, not from openai.com, and I kept them in a separate `reportedDetail` field with its own citation rather than blending them into the `quote` field, so a reader can tell OpenAI's own words from a journalist's paraphrase at a glance.

The render tests were the one place I had to fight the tooling rather than the content. Two buttons on the page share the label "Yes" (one per question), so `screen.getByText('Yes')` throws on multiple matches. The fix was scoping each click to its own `role="group"` container instead of querying the whole document. Small, but it's the kind of bug that passes a quick manual click-through and fails the first time a test tries to be precise about which button it means.

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2 + Testing Library (11 tests: rule logic, golden test against all six real incidents, render/interaction tests) |
| Data | Static TypeScript module, no backend, no API key |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
