<div align="center">

# Burial Depth — How Far Into the Answer Is the Answer?

**The most-starred repo on GitHub yesterday was a set of rules telling coding agents to stop burying the answer. Rules are assertions. This measures.**

[![CI](https://github.com/kbipul/burial-depth/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/burial-depth/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/burial-depth/)

`Day 032` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 11 September 2026 `ayghri/i-have-adhd` took the #1 spot on GitHub trending with **+4,624 stars in twenty-four hours**. It is not a model, a framework or a benchmark. It is a `SKILL.md` — a short list of rules about the *shape* of agent output: lead with the answer, number multi-step work, one bounded action per step, give time in units, no preamble, no recap, no "Hope this helps!". A second implementation, `rmorse/i-have-adhd-skill`, was already trending alongside it.

Thousands of people starred a document asserting that agent responses bury the answer. Nobody was measuring whether a given response actually does.

Burial Depth is that measurement. Paste an agent response and it reports **how many words sit in front of the first sentence that actually answers**, then checks the response against eight of the published conventions, showing the evidence for every verdict. It is a lexical pass — no model, no network, no key. Everything runs in your tab.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by CI on a GitHub runner and committed back to this repo minutes after publish — the build sandbox has no browser. If you are reading this in the first few minutes after release, it may not have landed yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/burial-depth/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/burial-depth.git
cd burial-depth
npm ci
npm test        # 89 tests
npm run dev     # http://localhost:5173
```

## How it works

Three decisions carry the whole thing.

**1. The unit is a segment, and every segment gets exactly one role.** A response is cut into sentences, except for fenced code blocks, which stay whole and never reach the sentence splitter. Each segment is then classified by a fixed precedence:

```
code ─▶ closer ─▶ recap ─▶ preamble ─▶ scaffold ─▶ hedge ─▶ answer ─▶ filler
```

Precedence is doing real work here. *"Let me know if it still fails because of the cache"* contains `because`, a commitment marker — and it is still a sign-off. Closers win.

**2. `answer` is earned, not assumed.** A segment is only an answer if it carries a **substance marker**: inline code, a path or filename, a number, an imperative opener (`run`, `set`, `replace`, …), or a commitment phrase (`the cause is`, `because`, `do not`). Prose with no cue *and* no marker is labelled **`filler`** — not one of the named anti-patterns, but not something a reader can act on either. Filler still counts toward burial depth. Calling it `filler` rather than `answer` is what stops the number from flattering waffle.

**3. Burial depth is measured in words, not in percent.** A reader's patience is absolute, not proportional: sixty words of runway is twenty seconds of reading whether the answer is a hundred words long or a thousand. So the bands — *Answer first* / *Shallow* / *Deep* / *Buried* — are drawn at 0, 25 and 80 words.

The eight rule checks each restate one convention as something testable, and each reports its own evidence so you can click a failure and see the segments that caused it. A check that cannot apply returns **`n/a`** rather than a free pass: a response that never mentions an error should not earn a point for describing errors well.

## Build notes — what I learned

**The interesting move was not the analysis, it was refusing to guess.** My first classifier had two outcomes: anti-pattern, or answer. It scored *"There are some things here worth thinking about"* as an answer, because no cue matched. That is exactly backwards — that sentence is the purest form of the thing the skill is complaining about. Adding `filler` as a third outcome, meaning *no cue matched and no substance marker found*, fixed the numbers and, more usefully, made the tool honest about its own uncertainty. `filler` is the label for "I don't know what this is, and neither will your reader."

**Two false verdicts survived until I probed real fixtures, and both were instructive.** The error-shape check wanted a word from a remediation list — `fix`, `workaround`, `resolve` — before it would agree that a response told you what to do. My deliberately *good* sample failed it, because it said "Set `base` to your repo name" and then showed the code. Growing the word list would have been the wrong repair; the right one was structural: a fix is stated in prose, **or shown as a code block, or given as an imperative instruction**. Three shapes, one meaning. The other bug was arithmetic — the bounded-steps rule counted eight steps in a four-step list, because a step written as three sentences became three segments that each inherited the `numbered` flag. Segments now carry a `stepId`, and the rule counts distinct steps. "3 of 4 steps" is a claim I can defend; "3 of 8" was just wrong.

**Precedence order is the whole design, and it is not obvious from the outside.** Almost every interesting sentence matches more than one pattern. A closer that names a file, a hedge wrapped around a real instruction, a recap containing the only concrete number in the response. I ended up writing the precedence chain as a single commented list in `classify.ts` because every time I moved one role past another, a fixture flipped. The rule I settled on: **roles the conventions tell you to delete outright come first**, because deleting a sentence that also happened to contain a fact is a smaller error than keeping four sentences of sign-off.

**The honest limitation is that this measures form, and form is not correctness.** A confidently wrong first sentence scores a perfect burial depth of zero. I put that on the page rather than in a footnote, along with three others — novel phrasing escapes the cue lists, `filler` is a confession of uncertainty, and hedging is sometimes the accurate answer to an underdetermined question. A tool that scores writing has an obligation to say where its scoring breaks, and the temptation to quietly widen the cue lists until the samples look good is strong. Every cue in `cues.ts` had to survive one question: *is this hard to write by accident in a sentence that is genuinely answering something?*

**What I would do differently:** the cue lexicons are English-only and tuned on four fixtures I wrote myself, which is a small and sympathetic corpus. The obvious next step is a corpus of real responses with human burial-depth judgements, and a check of the classifier against them — at which point the interesting number stops being any single response's depth and becomes the classifier's agreement rate with a reader.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: '/burial-depth/'` for Pages) |
| Tests | Vitest 3 — 89 tests, jsdom for render, node for the engine |
| Analysis | Hand-written segmentation + cue-phrase classifier. No model, no network, no dependencies beyond React. |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
