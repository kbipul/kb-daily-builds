<div align="center">

# Burial Depth — How Far Into the Answer Is the Answer?

**The most-starred repo on GitHub yesterday was a set of rules telling coding agents to stop burying the answer. Rules are assertions. This measures.**

[![CI](https://github.com/kbipul/burial-depth/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/burial-depth/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/burial-depth/)

`Day 032` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 11 September 2026 `ayghri/i-have-adhd` took the #1 spot on GitHub trending with **+4,624 stars in twenty-four hours**. The repo is a `SKILL.md`, a short list of rules about the *shape* of agent output: lead with the answer, number multi-step work, one bounded action per step, give time in units, no preamble, no recap, no "Hope this helps!". A second implementation, `rmorse/i-have-adhd-skill`, was already trending alongside it.

Thousands of people starred a document asserting that agent responses bury the answer. Nobody was measuring whether a given response actually does. Thirty-one builds into this series, none of mine had touched output legibility either.

Burial Depth is that measurement. Paste an agent response and it reports how many words sit in front of the first sentence that actually answers, then checks the response against eight of the published conventions and shows the evidence for every verdict. It is a lexical pass over cue phrases, and it runs entirely in your browser tab.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by CI on a GitHub runner and committed back to this repo minutes after publish; the build sandbox has no browser. If you are reading this in the first few minutes after release, it may not have landed yet.</sub>

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

The unit is a segment. A response is cut into sentences, except for fenced code blocks, which stay whole and never reach the sentence splitter. Every segment then gets exactly one role, decided by a fixed precedence:

```
code ─▶ closer ─▶ recap ─▶ preamble ─▶ scaffold ─▶ hedge ─▶ answer ─▶ filler
```

*"Let me know if it still fails because of the cache"* contains `because`, a commitment marker, and it is still a sign-off. Closers win. The test for that case is `prefers closer over a commitment marker in the same sentence`.

A segment is only an `answer` if it carries a substance marker: inline code, a path or filename, a number, an imperative opener (`run`, `set`, `replace`, …), or a commitment phrase (`the cause is`, `because`, `do not`). Prose with no cue *and* no marker is labelled `filler`. The conventions do not name filler as an anti-pattern, and a reader cannot act on it either, so it still counts toward burial depth. If that label were `answer`, the number would flatter waffle.

Burial depth is a word count. The bands (*Answer first* / *Shallow* / *Deep* / *Buried*) are drawn at 0, 25 and 80 words, because a reader's patience is absolute: sixty words of runway is twenty seconds of reading whether the answer is a hundred words long or a thousand.

The eight rule checks each restate one convention as something testable, and each reports its own evidence, so you can click a failure and see the segments that caused it. A check that cannot apply returns `n/a`. A response that never mentions an error should not earn a point for describing errors well.

## Build notes — what I learned

The bounded-steps rule reported "3 of 8" on a list with four steps. A step written as three sentences had become three segments, each inheriting the `numbered` flag, so the rule was counting sentences and calling them steps. Segments now carry a `stepId` and the rule counts distinct steps; the test is `counts one multi-sentence step as one step`. "3 of 4 steps" is a claim I can defend.

That was the second of two false verdicts that survived until I probed real fixtures. The first was on my deliberately *good* sample. The error-shape check wanted a word from a remediation list (`fix`, `workaround`, `resolve`) before it would agree that a response told you what to do, and the good sample said "Set `base` to your repo name" and then showed the code, so it failed. Growing the word list would have been the wrong repair. A fix has three shapes, and the comment in `rules.ts` now lists them: "stated as a remediation phrase, shown as a code block, or simply given as an instruction -- all three tell the reader what to do." Two tests pin it, `treats a code block as the fix for error-shape` and `treats an instruction as the fix for error-shape`.

Before either of those, the first classifier had two outcomes: anti-pattern, or answer. It scored *"There are some things here worth thinking about"* as an answer, because no cue matched, and that sentence is the purest form of the thing the skill is complaining about. `filler` became the third outcome, meaning no cue matched and no substance marker was found. That fixed the numbers. `filler` is the label for "I don't know what this is, and neither will your reader", and the test is `calls contentless prose filler, not an anti-pattern`.

Precedence order is the whole design, and it is not obvious from the outside. Almost every interesting sentence matches more than one pattern: a closer that names a file, a hedge wrapped around a real instruction, a recap containing the only concrete number in the response. Every time I moved one role past another, a fixture flipped, so I wrote the chain once as a commented list in `classify.ts`. The comment above it is the rule I settled on: "the roles the conventions ask you to delete come first, so a sentence that both signs off and mentions a file is still a sign-off." Deleting a sentence that also happened to contain a fact is a smaller error than keeping four sentences of sign-off. Hedges are the one role that runs the other way. The comment on that branch reads "A sentence with a real instruction in it stays an answer even if it hedges on the way", and `does not downgrade an instruction that happens to hedge` keeps "Set `base` to your repo name, though you may want to confirm it first" as an answer.

This measures form. Whether the first sentence is true is outside it: a confidently wrong first sentence scores a perfect burial depth of zero. That is on the page, under a heading that reads "What this cannot tell you", with three others: novel phrasing escapes the cue lists, `filler` is a confession of uncertainty, and hedging is sometimes the accurate answer to an underdetermined question. The temptation to quietly widen the cue lists until the samples look good is strong. Every cue in `cues.ts` had to survive the question written at the top of that file: is it "hard to write by accident in a sentence that is genuinely answering something"?

What I would do differently: the cue lexicons are English-only and tuned on four fixtures I wrote myself (`buried-debug`, `answer-first`, `hedged-architecture`, `unbounded-steps`), which is a small and sympathetic corpus. The obvious next step is a corpus of real responses with human burial-depth judgements, and a check of the classifier against them. At that point the interesting number stops being any single response's depth and becomes the classifier's agreement rate with a reader.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: '/burial-depth/'` for Pages) |
| Tests | Vitest 3 — 89 tests, jsdom for render, node for the engine |
| Analysis | Hand-written segmentation + cue-phrase classifier. No model, no network, no dependencies beyond React. |

## Sources

- [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) — the `SKILL.md` that reached
  #1 on GitHub trending on 11 September 2026 (+4,624 stars in 24 hours; past 43,000 within
  two days). It is a set of assertions about the shape of agent output — answer first, no
  preamble, no closer, bounded steps, concrete time units. This tool measures the property
  those rules assert, which is a different thing from agreeing with them.

The conventions in `src/engine/` are transcribed from that document and the related
`rmorse/i-have-adhd-skill`. The cue-phrase classifier that detects preamble is written
here, and every phrase in it is listed in source rather than learned — so a reader who
disagrees with a classification can see exactly which rule fired.


---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
