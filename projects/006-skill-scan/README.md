<div align="center">

# SkillScan — X-ray an AI Agent Skill Before You Install It

**Paste any agent skill file and get an instant security report: prompt injection, data exfiltration, dangerous commands, permission creep and context cost — 100% in your browser.**

[![CI](https://github.com/kbipul/skill-scan/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/skill-scan/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-5eead4)](https://kbipul.github.io/skill-scan/)

`Day 006` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Agent skills are having their npm moment. GitHub's trending page this week is stacked with them — `obra/superpowers`, `safishamsi/graphify`, `JuliusBrussee/caveman`, `openai/codex-plugin-cc` — and the install instruction for most is "drop this markdown file into your agent's skills folder." That file goes straight into the model's context, and whatever it says, the agent may do. We are installing executable instructions from strangers with roughly the ceremony of copying a snippet off a forum.

SkillScan is the ten-second first pass nobody runs. Paste a `SKILL.md` and it scans for the shapes that matter: **instruction-override and jailbreak framing**, **concealment from the user**, **credential access and exfiltration to capture endpoints**, **`curl | bash` and other unreviewed remote execution**, **zero-width characters and HTML comments hiding text from the human reviewer while the model reads it fine**, and **over-broad `allowed-tools`**. It grades the file A–F, shows every hit with its line number and a concrete fix, and estimates what carrying the skill in context actually costs you across a hundred sessions.

Everything runs client-side. The file you paste never leaves the tab — which is rather the point, given what people will paste into it.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects can't run a browser, so this screenshot is captured by the repo's own CI on a GitHub runner and committed back — it appears within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/skill-scan/)** — runs fully in your browser, nothing to install. It opens on a deliberately hostile fixture so you can see the failure mode immediately; toggle to the clean and sloppy samples to compare.

```bash
git clone https://github.com/kbipul/skill-scan.git
cd skill-scan
npm ci
npm test          # 46 tests
npm run dev       # http://localhost:5173
```

## How it works

Three pure modules, no dependencies beyond React — the entire engine is testable without a DOM.

```
SKILL.md ──▶ frontmatter.ts ──▶ rules.ts ──▶ score.ts ──▶ Report
             (flat-YAML         (24 rules:    (weighted
              subset parser)     line-based +  deduction,
                                 doc-level)    per-rule cap)
```

**`frontmatter.ts`** parses the flat YAML subset skill files actually use (scalars, inline arrays, block lists) and — importantly — records the **line number** of every key, so a permissions finding can point at the exact line rather than saying "somewhere in the frontmatter."

**`rules.ts`** is 24 rules across four severities. Line rules run over *every* line including fenced code blocks, because install snippets are exactly where payloads hide. Document rules handle what a line-by-line pass structurally cannot: HTML comments spanning multiple lines, missing metadata, and `allowed-tools` breadth. Two passes then cut noise — findings below `high` are suppressed on a line that already has a `critical` (the critical tells the story), and duplicate rule-hits on one line collapse to one.

**`score.ts`** deducts by severity (critical 30, high 15, medium 7, low 3) with a **per-rule cap at 2× its weight**, so twenty `TODO`s cost the same six points as three do — one chatty rule can't drown the signal. Any critical hard-caps the grade at D, regardless of the arithmetic: a file that tries to read `~/.ssh/id_rsa` does not get a B for otherwise-tidy prose.

## Build notes — what I learned

**The tests found a real bug, and I fixed the code rather than the test.** My `unpinned-remote` rule matched `npx pkg@latest`. I'd written a test asserting that `sudo npm install -g some-cli@latest` also trips it — then watched it fail. The rule was reasoning about *npx* when the actual security property is *any install pinned to a moving target*. That's the failure mode of writing detection rules from examples instead of from the property you care about: you encode the example. Widening it to `npx|npm i|pnpm|yarn|bun|pip|uv … @latest` was a two-line change; noticing was the work. It's also the argument for keeping the engine free of DOM dependencies — 46 tests run in under a second, so the feedback loop is tight enough that you actually write the awkward test.

**Suppression is a feature, not a shortcut.** My first pass on the hostile fixture emitted 20-odd findings, and the four that mattered were buried among `sudo`-usage and TODO lints from the same lines. A scanner nobody reads to the bottom of is a scanner that doesn't work. Two rules — critical-suppresses-lower on the same line, and the per-rule deduction cap — cut the noise roughly in half without dropping a single genuine hit. Precision here isn't about finding more; it's about what survives the reader's attention.

**Static analysis on natural language is fundamentally lossy, and saying so is part of the product.** Regexes catch `ignore all previous instructions`. They do not catch the same instruction written politely, in a language I didn't anticipate, or split across two sentences. I went back and forth on whether to lead with a confident "SECURE ✓" badge, and landed on the opposite: a clean report says *"nothing obvious found"*, never *"safe"*, and the footer states plainly that a determined attacker can phrase around this. A security tool that oversells its coverage is worse than no tool, because it converts a vague unease into a false confidence. The honest framing is that this is a fast first pass that catches the lazy attacks and the accidental footguns — which, empirically, is most of them.

**The context-cost panel started as a throwaway and turned out to be the sleeper.** Injection is the scary risk, but token bloat is the *certain* one: a skill file rides in context every session, so a bloated one is a recurring tax you pay forever and never see itemized. Showing "this 2,000-token skill costs you ~$0.60 across 100 sessions on Sonnet 5" reframes skill review as something you'd do for cost reasons even if you fully trusted the author. It's a ~4-chars-per-token estimate, not a real tokenizer, and the UI says so — I'd rather ship an honest approximation with its error bar visible than a precise number that pretends the pricing table never changes.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build | Vite 6 |
| Tests | Vitest 2 — 46 tests, zero DOM required |
| Engine | Zero runtime dependencies — hand-rolled frontmatter parser + rule engine |
| Hosting | GitHub Pages, fully static |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
