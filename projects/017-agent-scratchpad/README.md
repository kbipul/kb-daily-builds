<div align="center">

# Agent Scratchpad — Watch a ReAct Agent Think, and Catch Where It Breaks

**Replay an LLM agent's Thought → Action → Observation loop step by step and get an instant loop-health report — stuck loops, oscillation, out-of-toolset calls, ungrounded answers, error thrash — 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/agent-scratchpad/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/agent-scratchpad/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/agent-scratchpad/)

`Day 17` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Agents fail in the *loop*, not in a single call. A model can emit a perfectly valid tool call and still get stuck repeating it, oscillate between two tools, retry an errored call unchanged, or finish with a number no tool ever returned. **Agent Scratchpad** parses a classic ReAct transcript (`Thought:` / `Action:` / `Action Input:` / `Observation:` / `Final Answer:`), plays it back one step at a time, and runs a deterministic loop-health analyzer that flags eight failure classes across the whole trace — then scores the run A–F.

It is the loop-level companion to [Day 16's Tool Caller](https://github.com/kbipul/tool-caller-ts), which validated a *single* function call against its schema. This one watches the *whole* think-act-observe cycle. Everything runs client-side: no model, no network, no key — just a rule engine you can read and unit-test.

![Screenshot](docs/demo.png)

> The screenshot above is captured automatically by this repo's CI on a real browser (the build sandbox can't run one) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/agent-scratchpad/)** — opens on a stuck-loop trace already graded, runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/agent-scratchpad.git
cd agent-scratchpad
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the analyzer test suite
npm run build    # production build into dist/
```

## How it works

Two pure, dependency-free modules do all the work, so the same code runs in the browser and in Vitest:

```
transcript ──▶ parseTrace() ──▶ ParsedTrace ──▶ analyze() ──▶ HealthReport
  (text)        (labels →         steps[] +       (8 checks     score / grade /
                 steps)           finalAnswer      over loop)    findings[]
```

**Parsing** is a small line-label state machine: a `Thought:` opens a step, `Action:` / `Action Input:` attach to it, `Observation:` (multi-line aware) closes it, and `Final Answer:` ends the loop. It is case-insensitive and CRLF-safe, and it records non-fatal issues (e.g. an action with no observation).

**Analysis** is eight independent checks, each a pure function over the parsed trace, mapped to the tool-use failure taxonomy that recent benchmarks (ToolCritic / ToolFailBench, 2026) formalise — but applied to the entire loop instead of one call:

| Check | Severity | Fires when |
|---|---|---|
| `unknown-tool` | critical | an action names a tool outside the declared set (the sandbox-escape shape) |
| `stuck-loop` | critical | the identical `tool(input)` is issued twice or more |
| `no-final-answer` | critical | the loop stops without a Final Answer |
| `ungrounded-answer` | critical | the final answer states a number/quoted span found in **no** observation |
| `oscillation` | warning | actions alternate A-B-A-B without converging |
| `error-thrash` | warning | a tool errors and the next step repeats the same call unchanged |
| `budget-overrun` | warning | the loop exceeds its step budget |
| `no-progress` | info | two consecutive steps return identical observations |

Inputs are normalized before comparison (JSON key order and whitespace don't create false "different" calls), and the score starts at 100 and subtracts a weight per finding.

## Build notes — what I learned

The interesting design tension was **honesty of the ungrounded-answer check**. It is tempting to claim the tool "detects hallucinations," but a client-side rule engine can't verify meaning. So I deliberately scoped it to concrete, checkable specifics — standalone numbers and quoted spans that appear in the final answer but in no observation — and left prose alone. That means it reports *possible* fabrication where it can actually prove the specific isn't grounded, and stays silent otherwise. A conversion like "30C is 86F" exposed the edge: the analyzer only vouches for the numbers it can find in observations, and I wrote the test to assert determinism rather than pretend it understands unit math. Under-claiming here is the whole point — an IT Director signing off on an agent wants a tool that flags what it can prove, not one that bluffs.

The second lesson was that **input normalization is what makes "stuck loop" meaningful**. Early on, `{"city":"Paris"}` and `{ "city": "Paris" }` counted as different calls, so real loops slipped through. Sorting JSON keys and collapsing whitespace before hashing the call turned the check from decorative into reliable — and it's the same trick that keeps `error-thrash` from missing a retry that only differs by formatting.

Third: making the timeline a **player, not a report**. The first version dumped every finding in a list. It read like a linter. Anchoring each finding to the step where it happens and letting you *step through* the loop turns "here are 4 problems" into "watch the agent dig its own hole" — the failure becomes legible instead of merely listed. The report card is the summary; the timeline is the story.

The whole engine is deterministic and has no runtime dependency beyond React, which is why 40+ tests cover the parser and every check, and why CI is the real gate — the sandbox that builds this can't run a browser, so the screenshot and the live Pages deploy are both produced on GitHub's runners.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: /agent-scratchpad/` for Pages) |
| Tests | Vitest 2 (node env, 40+ cases) |
| Engine | Hand-written parser + rule engine, zero runtime deps |
| CI/CD | GitHub Actions → Pages, auto-screenshot on a real browser |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
