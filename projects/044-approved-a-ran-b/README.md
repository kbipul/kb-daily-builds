<div align="center">

# Approved A, Ran B

**A human approved one action. Mutable workflow state supplied a different one.**

[![CI](https://github.com/kbipul/approved-a-ran-b/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/approved-a-ran-b/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-6fb3ff)](https://kbipul.github.io/approved-a-ran-b/)

`Day 044` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 22 September 2026 the Agentic Security newsletter carried Loopjacking ([arXiv 2609.21081](https://arxiv.org/abs/2609.21081), Adithyan Arun Kumar), which describes a failure where "a human approves what they understand as operation A, while the implementation uses that decision for a materially different operation B." The paper names two routes to it. In the representation-based route, B is already encoded but omitted or misrepresented at approval time. In the post-approval state-substitution route, the human sees the correct A and mutable workflow state later replaces it with B. Post-approval substitution is reported reproduced in seven tested Agno AgentOS releases ending at 3.0.9, and in 12 tested versions of a conditional in-memory LangGraph Agent Server composition ending at 0.14.0.

This is a simulator for those two sentences. Pick the action a reviewer is meant to approve, pick a route, pick how the framework records the approval, then click Approve and watch three values that a real console never shows you side by side: what the card rendered, what the approval record committed to, and what the executor read back.

The pairs are built so the trick is visible. `git status --short` and `git push --force origin main` carry the same `label` and the same `tool`, and differ only in `args`. A card that renders label and tool is byte-identical for both.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects has no browser, so it cannot screenshot. `docs/demo.png` is captured by a real Chromium on the GitHub runner by the `screenshot` job in CI and committed back, so it appears a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/approved-a-ran-b/)** — runs fully in your browser, nothing to install.

```bash
npm install
npm test          # 23 tests
npm run build
npm run preview   # then open http://localhost:4173/approved-a-ran-b/
```

## How it works

A turn runs in four stages, and the whole argument lives in the gap between stages three and four.

```
propose ──▶ render ──▶ approve ──▶ [mutate] ──▶ execute
            (a field    (stores a    (post-        (resolves
             projection) value, a     approval       the action
                         reference,   route only)    to run)
                         or a digest)
```

Three decisions do the work.

The card is a *projection*. Each profile declares which of `label`, `tool`, `args` and `reversible` it renders, and anything absent is invisible to the reviewer. Agno's profile renders label and tool, which is why the representation route lands on it and never reaches the reviewer's eye.

The approval record is a *binding*, and there are three shapes. A `reference` binding stores the action id and nothing else, so execution has to look the action up in live state. A `value` binding keeps a copy taken at approval time. A `bound` binding keeps a copy, a digest of the whole action, and re-checks the digest before calling the tool.

The `bound` shape does not skip re-resolution. It re-reads live state exactly as `reference` does and then verifies what came back, which is the distinction the paper's resistant designs turn on.

## Build notes — what I learned

The run nearly died on a red herring. Two `npm install` calls timed out mid-download and left a truncated `@esbuild/linux-arm64` binary, and every invocation after that came back `signal: 'SIGSEGV'` with empty stdout. For about ten minutes the reasonable conclusion was that this sandbox cannot execute esbuild's Go binary on arm64, which would have meant swapping the whole toolchain. Installing the identical version into a scratch directory printed `0.21.5` immediately. A corrupted artifact and a platform incompatibility present the same way, and I had no way to tell them apart without the second data point.

The more useful failure was in my own model. My first `bound` binding executed the snapshot it had kept, which meant the digest was compared against the object it had been computed from and could never disagree. I had already written a test called `is aborted by a digest binding` asserting the outcome was `faithful`, which is a contradiction sitting in a green test run. Fixing it changed what the project argues rather than just what it does: binding an approval to an action is not a way to avoid looking state up again, it is a way to notice that state changed.

That correction produced the result I did not expect. With the digest binding selected, the post-approval route aborts and the representation route still runs `git push --force`. The digest is doing its job perfectly in both cases. It bound the approval to the exact action executed, and on the representation route the exact action executed was always the hostile one, because the lie was in the card rather than in the state. Two defences that look like one control from a dashboard, and only one of them is about substitution at all.

What I cannot claim: I read the abstract and the newsletter write-up, not the paper. The two routes and the version ranges are quoted from those, and the internals here are my reconstruction from a one-sentence description of each route. No version of Agno AgentOS or LangGraph was installed or run. Someone who has read the paper should expect the shapes to be right and the details to be mine, and the reproduction claim in the README belongs to the author rather than to this repo.

Scope I cut deliberately: the digest is FNV-1a printed as eight hex characters, because a reader needs to see it change between two lines on screen. Nothing here depends on collision resistance, and a real binding would use SHA-256 over a canonical encoding.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, hand-written CSS, no component library |
| Language | TypeScript 5 (`strict`, `noUnusedLocals`) |
| Build | Vite 5, `base: '/approved-a-ran-b/'` for Pages |
| Tests | Vitest 2, 23 tests over the model, none over the DOM |
| Runtime deps | react, react-dom. Nothing else. |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
