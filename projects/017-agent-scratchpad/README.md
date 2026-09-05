<div align="center">

# Agent Scratchpad — Watch a ReAct Agent Think, and Catch Where It Breaks

**Replay an LLM agent's Thought → Action → Observation loop step by step and get an instant loop-health report: stuck loops, oscillation, out-of-toolset calls, ungrounded answers, error thrash. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/agent-scratchpad/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/agent-scratchpad/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/agent-scratchpad/)

`Day 17` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Agents fail in the *loop*, not in a single call. A model can emit a perfectly valid tool call and still get stuck repeating it, oscillate between two tools, retry an errored call unchanged, or finish with a number no tool ever returned. **Agent Scratchpad** parses a classic ReAct transcript (`Thought:` / `Action:` / `Action Input:` / `Observation:` / `Final Answer:`), plays it back one step at a time, and runs a deterministic loop-health analyzer that flags eight failure classes across the whole trace, then scores the run A–F.

It is the loop-level companion to [Day 16's Tool Caller](https://github.com/kbipul/tool-caller-ts), which validated a *single* function call against its schema. This one watches the *whole* think-act-observe cycle. Everything runs client-side. There is no model and no network call behind it, just a rule engine you can read and unit-test.

![Screenshot](docs/demo.png)

> The screenshot above is captured automatically by this repo's CI on a real browser (the build sandbox can't run one) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/agent-scratchpad/)** opens on a stuck-loop trace that is already graded. Nothing to install; it runs in your browser. Four other traces are in the picker: an ungrounded final answer, an out-of-scope tool call, error thrash, and a healthy loop that grades A.

```bash
git clone https://github.com/kbipul/agent-scratchpad.git
cd agent-scratchpad
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the analyzer test suite
npm run build    # production build into dist/
```

## How it works

Two entry points do all the work, both pure and dependency-free, so the same code runs in the browser and in Vitest:

```
transcript ──▶ parseTrace() ──▶ ParsedTrace ──▶ analyze() ──▶ HealthReport
  (text)        (labels →         steps[] +       (8 checks     score / grade /
                 steps)           finalAnswer      over loop)    findings[]
```

**Parsing** is a small line-label state machine in `src/lib/parse.ts`. A `Thought:` opens a step, `Action:` / `Action Input:` attach to it, `Observation:` (multi-line aware) closes it, and `Final Answer:` ends the loop. It is case-insensitive and CRLF-safe, and it records non-fatal issues (e.g. an action with no observation) in `parseIssues` instead of failing the parse.

**Analysis** is eight independent checks in `src/lib/analyze.ts`, each a pure function over the parsed trace, mapped to the tool-use failure taxonomy that recent benchmarks (ToolCritic / ToolFailBench, 2026) formalise, but applied to the entire loop instead of one call:

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

Inputs go through `normalizeInput()` in `src/lib/text.ts` before any comparison, so JSON key order and whitespace don't create false "different" calls. Scoring starts at 100 and subtracts a weight per finding: 40 for a critical, 18 for a warning, 0 for info, floored at 0. Grades are A at 90 and above, then B at 75, C at 60, D at 40, F below that.

## Build notes

The check I spent longest on is `ungrounded-answer`. It is tempting to claim the tool "detects hallucinations," but a client-side rule engine can't verify meaning. So I scoped it to concrete, checkable specifics: standalone numbers and quoted spans that appear in the final answer but in no observation. Prose is left alone. It reports *possible* fabrication where it can prove the specific isn't grounded, and stays silent otherwise. A conversion like "30C is 86F" exposed the edge. `extractNumbers()` reads 30 and 86 as two independent tokens and has no idea one converts to the other, so the analyzer only vouches for the numbers it can actually find in observations. The test covering that case asserts determinism rather than unit math.

Input normalization is what makes `stuck-loop` mean anything. Early on, `{"city":"Paris"}` and `{ "city": "Paris" }` hashed to different calls, so real loops slipped through. `normalizeInput()` now parses the JSON, sorts keys recursively, and re-serializes, falling back to a whitespace-collapsed string when the input isn't JSON at all. `error-thrash` calls the same function, which is why it still catches a retry that differs only by formatting.

The timeline is a player, not a report. The first version dumped every finding into a list and read like a linter. `App.tsx` now builds a `findingsByStep` map and anchors each finding to the step where it happens, so stepping through the loop shows the agent digging its own hole rather than handing you four bullet points about it.

The engine is deterministic and has no runtime dependency beyond React, which is why 40+ tests cover the parser and every check. CI is the real gate: the sandbox that builds this can't run a browser, so the screenshot and the live Pages deploy are both produced on GitHub's runners.

## What this doesn't settle

The step budget is the weakest part. `analyze()` defaults `maxSteps` to 8, and `App.tsx` calls `analyze(parsed, { tools })` without passing it, so the browser is stuck on 8 with no way to change it. All five bundled traces in `src/data/examples.ts` are three steps or shorter, so nothing in the demo exercises `budget-overrun` at the default at all; only the unit test does, by passing a `maxSteps` of 2. Whether 8 is a sensible budget for real production traces, I don't know.

The severity weights are a guess I have not validated against anyone else's judgment. One critical finding lands a run at 60, still a C. Two land it at 20, an F. That cliff feels roughly right on the five examples and I have no evidence it holds anywhere else.

Two checks quietly do nothing under common conditions, which is worth knowing before you trust a clean report. `unknown-tool` returns no findings when the declared-tools box is empty, because an analyzer with no toolset can't judge scope. `oscillation` needs at least four action steps before it looks for an A-B-A-B pattern, so a short trace that flips between two tools twice passes. Neither is a bug, but a green report on a three-step trace with no tools declared means less than it looks like.

And the whole thing only sees the transcript. If your framework doesn't emit `Thought:` / `Action:` / `Observation:` labels, the parser has nothing to work with.

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
