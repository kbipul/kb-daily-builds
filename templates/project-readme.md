<!-- Template for every daily project README. The loop fills {{PLACEHOLDERS}}.
     If brand/logo-primary.svg exists in the project folder, keep the <img>;
     otherwise delete it and keep the text header only. -->

<div align="center">

<img src="brand/logo-primary.svg" width="110" alt="kB." />

# {{TITLE}}

**{{TAGLINE}}**

[![CI](https://github.com/kbipul/{{REPO}}/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/{{REPO}}/actions/workflows/ci.yml)
{{DEMO_BADGE}}

`Day {{DAY}}` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

{{TWO_TO_FOUR_SENTENCES — the problem, the approach, why it's interesting.
Write for a smart engineer with 30 seconds. No fluff.}}

{{IF_UI: include `![Screenshot](docs/demo.png)` + the sub-note that CI
auto-captures it — the sandbox cannot screenshot; the repo's CI screenshot job
commits docs/demo.png minutes after publish. Never fake or omit silently.}}

## Try it

{{IF_PAGES: **[Live demo →](https://kbipul.github.io/{{REPO}}/)** — runs fully
in your browser, nothing to install.}}

```bash
{{RUN_COMMANDS — the exact commands to run locally, verified to work}}
```

## How it works

{{ARCHITECTURE — a short section with the 2–3 key technical decisions.
A small ASCII or mermaid diagram when the flow isn't obvious.}}

## Build notes — what I learned

{{BLOG_STYLE_WRITEUP — 3–6 honest paragraphs: what was hard, what surprised
me, what I'd do differently. This is the LinkedIn-ready section.}}

## Stack

{{STACK_TABLE — e.g. React 18, TypeScript 5, transformers.js, Vite, Vitest}}

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
