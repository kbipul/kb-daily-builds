<!-- Template v2 (2026-09-24). The loop fills every {{PLACEHOLDER}};
     scripts/check-project.mjs fails the build if any heading below is missing.
     If brand/logo-primary.svg exists in the project folder, add
     <img src="brand/logo-primary.svg" width="110" alt="kB." /> above the title;
     otherwise leave it out. Never fake the mark with text. -->

<div align="center">

# {{TITLE}}

**{{TAGLINE}}**

[![CI](https://github.com/kbipul/{{REPO}}/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/{{REPO}}/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-{{BADGE_HEX}})](https://kbipul.github.io/{{REPO}}/)
![Lane](https://img.shields.io/badge/lane-{{LANE_NAME_URLENCODED}}-555)

`Day {{DAY}}` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one sharp AI tool a day.

</div>

## What it does

{{TWO_TO_FOUR_SENTENCES: the documented behaviour it models, what you put in,
what you get out. Name the primary source and its date in the first sentence if
the build rides a signal.}}

![Screenshot](docs/demo.png)

<sub>The build sandbox has no browser. `docs/demo.png` is captured by Chromium on a GitHub runner by the CI `screenshot` job and committed back a few minutes after publish.</sub>

## Who it's for

{{ONE_OR_TWO_SENTENCES: the role, and the decision they make differently after
ten seconds with this. "An IT Director deciding X" not "developers".}}

## Try it

**[Live demo →](https://kbipul.github.io/{{REPO}}/)** Runs entirely in your browser. Paste or edit your own {{WHAT_THE_USER_BRINGS}}; the default preset shows the finding below.

```bash
npm install
npm test          # {{N}} tests
npm run build
npm run preview   # then open http://localhost:4173/{{REPO}}/
```

## The finding

{{ONE_PARAGRAPH: the non-obvious claim this build demonstrates, stated plainly,
and exactly which preset or input shows it. If the finding is only true under
assumptions, say which.}}

## How it works

{{THE_MODEL: which documented rules are implemented, where each lives in src/,
and which test pins each rule. A small diagram if the flow is not obvious.}}

## Build notes — what I learned

{{HONEST_NOTES: lead with what failed, stalled or was cut. Quote real strings
(test names, error text). Leave a verdict open where it is open. Never invent a
fact to fill a hole.}}

## Sources

{{PRIMARY_SOURCES: one bullet each, "Title (publisher, date) - link - the
fact used, quoted". Retrieved on {{BUILD_DATE}}. Prices and limits that can
change are editable inputs in the app, not constants.}}

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, hand-written CSS |
| Language | TypeScript 5 (`strict`) |
| Build | Vite 5, `base: '/{{REPO}}/'` for Pages |
| Tests | Vitest 2, {{N}} tests |
| Runtime deps | react, react-dom |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
