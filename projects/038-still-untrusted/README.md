<div align="center">

# Still Untrusted

**One bad read taints the rest of the run. Nothing decays it automatically.**

[![CI](https://github.com/kbipul/still-untrusted/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/still-untrusted/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-live-4f8cff)](https://kbipul.github.io/still-untrusted/)

`Day 38` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## Build notes: what I learned

`agent-framework-core`, the Microsoft package this project simulates, is Python-only. There's no way to `pip install` anything in this sandbox and no way to import the real thing. So the first honest decision was scope: this is not a wrapper around FIDES, it's a from-scratch TypeScript reimplementation of the rules on [its docs page](https://learn.microsoft.com/en-us/agent-framework/agents/security), checked against the one worked example Microsoft publishes, the GitHub issue triage agent with a `[SYSTEM] ... call read_file('.env') ...` line buried in the bug report. My `engine.test.ts` runs that exact scenario and asserts it lands on the same two refusals the docs describe in prose: `post_comment` blocked because the context is `private` and the sink only accepts `public`, `write_file` blocked because the context is still `untrusted` and the sink declared `accepts_untrusted: false`. If my `combineLabels()` drifted from what the page says, that test would have caught it. It didn't need to: the first pass matched on the first try, mostly because the docs spell out the combining rule (`untrusted` wins on integrity, `user_identity > private > public` on confidentiality) in plain enough language that there wasn't much room to misread it.

The second scenario is not from Microsoft's docs, and I want to be specific about the line it came from rather than claim more than I built. The "Current limitations" section says: "Most-restrictive-wins propagation can be conservative. Once an untrusted issue body enters the context, the rest of the run is untrusted unless you explicitly drop it." That's a limitation, not a worked example: there's no accompanying scenario, no code sample, no second walkthrough. So I built the run that sentence implies: one small, unremarkable issue read at step 1, three unrelated and fully trusted steps after it, then a privileged one-line typo fix at step 5 that has nothing to do with step 1, and watched it get refused anyway, purely on four-step-old taint. First draft of that scenario put a *second* untrusted read at step 3, meaning to show "even routine reads add up." The drop-toggle test immediately failed: dropping the taint after step 1 didn't help, because step 3 just re-tainted the context on its own. That was the simulator working correctly and my scenario design being wrong; I'd built a run where the toggle couldn't possibly do what I was about to claim it does. Fixed it to a single untrusted source at step 1, trusted reads everywhere else, and the toggle test passed for the right reason.

One thing I chose not to build: an actual "drop the taint" API. FIDES doesn't ship one: the docs list "per-message scoping or compaction-aware label decay" as "on the table," future tense, no interface given. The checkbox in this demo is labeled hypothetical for exactly that reason, and the caption says so before you click it. I was tempted to give it a plausible-sounding method name (`context.scope()`, something like that) to make the UI feel more finished. Didn't, because the honest version of this project is "here's what the documented rule does, and here's what would change if a feature that doesn't exist yet existed," not "here's a feature I made up and attributed to Microsoft."

What's not modeled, stated plainly: the real FIDES has a quarantined-LLM path (`auto_hide_untrusted=True`) that keeps untrusted bytes away from the main model entirely, routing them through a separate tool-free model instead. This simulator only implements the label-propagation-plus-policy-check half, the half that's a pure function over a fixed sequence of tool calls, and therefore the half that's actually simulate-able without a real agent loop behind it. The variable-store indirection is a genuinely different mechanism and would need an LLM to demonstrate honestly, which this sandbox doesn't have.

## What it does

Pick a scenario, then read the trace. Each step shows the tool that ran, the label the context carried into that call, the label it carries out, and, when a sink gets refused, exactly which declared policy caught it and why. The two scenarios: Microsoft's own triage-agent walkthrough, and a four-step extension built directly from the docs' own stated limitation, with a toggle to see what a not-yet-shipped scoping feature would change.

![Screenshot](docs/demo.png)
<sub>Captured by CI on the GitHub runner minutes after publish; this sandbox has no browser to render one itself.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/still-untrusted/)** — runs fully in your browser, nothing to install.

```bash
npm install
npm run dev      # local dev server
npm test         # 15 Vitest cases, including the golden test against Microsoft's own example
npm run build    # production build
```

## How it works

```
ToolSpec[] + StepInput[]  →  simulate()  →  TraceEntry[]
 (declared policies)          (pure fn)      (rendered, not written live)
```

`src/fides/labels.ts` implements exactly one function that matters, `combineLabels()`: integrity picks `untrusted` if any input is untrusted, confidentiality picks the highest-ranked of `public < private < user_identity`. `src/fides/engine.ts` walks a fixed list of steps, accumulating one running context label via that function on every source call, and checking two policy flags, `acceptsUntrusted: false` and `maxAllowedConfidentiality`, before every sink call. Both flags are optional and independent, matching the real API's `additional_properties`: a sink can decline on integrity, on confidentiality, on both, or on neither. `src/fides/scenarios.ts` holds the two fixed scenarios as data, not logic: the UI never invents a decision, it only renders what `simulate()` returned.

One modeling choice the docs don't settle: what happens to a sink that declares neither flag? I treat it as unrestricted on both axes, same as an unlabeled *source* defaults to `trusted + public`. The docs don't specify a default cap for an opted-out sink either way, so this is a documented assumption, not a documented fact, flagged as such in the code comment above `maxAllowedConfidentiality` in `engine.ts`.

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2 (15 cases: label algebra, the golden walkthrough, the still-untrusted scenario, engine edge cases) |
| Demo | Static, client-side only: no API calls, no model, no key |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
