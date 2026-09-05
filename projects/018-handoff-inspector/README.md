<div align="center">

# Handoff — Inspect a Multi-Agent Run for Coordination Failures

**Paste a multi-agent orchestration trace (supervisor + sub-agents) and watch it on a swimlane timeline while it flags the coordination failures single-agent tools miss — dropped handoffs, delegation loops, context lost between agents, duplicated work. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/handoff-inspector/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/handoff-inspector/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2fbf71)](https://kbipul.github.io/handoff-inspector/)

`Day 18` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Agent tooling has owned the GitHub trending page all week. An AI pen-test agent
(`usestrix/strix`) sits at #1. An "agent multiplexer that lives in your
terminal" (`ogulcancelik/herdr`) is on the list too, alongside agent-skills
frameworks. As soon as you run *more than one* agent, a failure surface opens
that single-agent debuggers can't see. Work gets handed off and never returned.
Two agents delegate the same task back and forth. One agent misses the artifact
another already produced. Two agents make the identical tool call.

Handoff takes a trace of a multi-agent run: a supervisor delegating to
sub-agents, agents calling tools and returning results. It does two things with
that trace. Every agent gets a swimlane you can scrub through step by step, and
seven deterministic detectors run over the event log to flag where the
*coordination* broke. This is the multi-agent sequel to Day 16 (validate one
tool call) and Day 17 (analyze one agent's ReAct loop). Here the unit of
analysis is the space *between* agents.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured automatically by this repo's CI on a real
browser (the build sandbox can't run one) and committed to `docs/demo.png`
within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/handoff-inspector/)** runs fully in
your browser, nothing to install. Load one of the six sample runs (clean
pipeline, dropped handoff, delegation loop, context loss, duplicated work, a
messy run that never converges) or paste your own trace. It opens on the dropped
handoff, because `DEFAULT_EXAMPLE_ID` in `src/data/examples.ts` is `"dropped"`.

```bash
git clone https://github.com/kbipul/handoff-inspector.git
cd handoff-inspector
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the detector test-suite
npm run build    # production build into dist/
```

## How it works

A trace is a flat, time-ordered event log, so there is no framework lock-in.
Six event types exist: `delegate`, `return`, `tool_call`, `observation`,
`message`, `final`.

```jsonc
{
  "agents": [
    { "id": "supervisor", "role": "orchestrator" },
    { "id": "researcher", "role": "research", "tools": ["web_search"] }
  ],
  "events": [
    { "t": 0, "type": "delegate", "from": "supervisor", "to": "researcher",
      "task": "research", "requires": ["query"], "handoff": ["query"] },
    { "t": 1, "type": "tool_call", "agent": "researcher", "tool": "web_search",
      "args": { "q": "..." }, "task": "research" },
    { "t": 2, "type": "observation", "agent": "researcher", "produces": ["sources"] },
    { "t": 3, "type": "return", "from": "researcher", "to": "supervisor",
      "task": "research", "handoff": ["sources"] },
    { "t": 4, "type": "final", "agent": "supervisor", "content": "..." }
  ]
}
```

The pipeline is three stages:

```
paste → parseTrace()  → strict structural validation (known agents, event shape)
      → analyze()      → 7 detectors over the event log → issues + 0-100 score
      → swimlane UI     → scrub the timeline, click a finding to highlight its events
```

`parseTrace()` in `src/lib/parse.ts` is strict about everything the analyzer
later depends on. An event needs a finite numeric `t` and a `type` from the
known set. Any `from`, `to` or `agent` must name a declared agent. Duplicate
agent ids are rejected. Errors come back as a list of specific messages
(`events[3] references unknown agent "coder" in "to"`) rather than one generic
failure, and a trace that parses comes back stably sorted by `t`. The point is
that anything the analyzer reports afterwards is a coordination problem, not a
typo in the input.

`analyze()` is seven pure functions in `src/lib/analyze.ts`, exported
individually so each is unit-tested in isolation. Between them they emit nine
issue codes:

| Detector | Severity | Fires when |
|---|---|---|
| `dropped_handoff` | critical | a `delegate` for a task never gets a matching `return` from the delegatee |
| `delegation_loop` | critical | a task's delegation edges form a cycle (A→B→A ping-pong, or longer) |
| `context_loss` | critical | a task `requires` an artifact that already existed but wasn't in the `handoff` |
| `no_final_answer` | critical | the run never emits a `final` event, so it never converged |
| `missing_requirement` | warning | a required artifact was never produced anywhere and wasn't passed |
| `duplicated_work` | warning | two `tool_call`s share a tool **and** canonically-equal args |
| `out_of_role_tool` | warning | an agent calls a tool outside its own declared `tools` list |
| `idle_agent` / `untracked_delegation` | info | a declared agent never acts; or a delegate carries no task id to track |

Cycle detection is `findCycle()` in `src/lib/util.ts`: a three-colour DFS
(WHITE / GRAY / BLACK) on the per-task delegation graph, slicing the cycle out
of the current stack the moment it hits a back edge onto a GRAY node.
`canonical()` in the same file key-sorts JSON before comparison, which is why
duplicated-work sees `{a,b}` and `{b,a}` as the same call.

## Build notes: what I learned

The detectors were not the hard part. The hard part was drawing an honest line
around what "context loss" can even *mean* without a model.

My first design tried to infer whether a downstream agent "should have known"
some fact, and it fell apart immediately. Any such inference is a guess, and a
guess dressed up as a finding is worse than no finding. So I inverted it. The
trace itself declares, per delegation, what a task `requires` and what was
actually `handoff`-ed, and `detectContextLoss()` reasons only about that
declared contract. A required artifact that existed upstream but wasn't passed
is a real, checkable coordination bug, and it fires `context_loss` at critical.
An artifact that never existed anywhere is a different, weaker finding,
`missing_requirement` at warning, rather than pretending to know intent. That
rule is written into the header comment of `src/lib/types.ts`: the inspector
reasons only about what the trace explicitly records. Day 16 and Day 17 drew
the same line.

Multi-agent failures are mostly *relational*, so the useful representation is a
graph rather than a list. A dropped handoff is a missing edge, a delegate with
no return. A loop is a cycle. Duplicated work is two nodes with the same
signature. Once delegations were modelled as a per-task directed graph, one
three-colour DFS gave me ping-pong and longer loops together, and the same
structure made the swimlane render trivial: `laneOf()` in `src/App.tsx` maps
each event to its actor's row, and a shared CSS grid column count keeps every
lane aligned so a handoff reads left-to-right across rows.

The sample runs mattered more than I expected. A validator is only convincing if
you can *see* it catch a bug you recognize, so I spent as long on the six
example traces as on the engine. The messy run is the one I kept rewriting: it
trips four detectors at once (dropped handoff, out-of-role tool, idle agent, no
final answer) and never converges. They double as fixtures. `examples.test.ts`
round-trips every example through `parseTrace()` and asserts the issue codes
come back identical, under the test name "every example round-trips through the
parser unchanged". That caught two schema typos before they ever reached the UI.

The score is the part I'm least happy with. `SEVERITY_PENALTY` is flat: 20 per
critical, 8 per warning, 3 per info, subtracted from 100 and clamped to the
0-100 range. Five critical findings put a run on the floor, and past that the
number stops separating a bad run from a much worse one. A future version could
weight by how far into the run the failure occurs, or drop the score for a
"first thing that went wrong" cursor. I don't know yet which of those is more
useful to read.

The trace schema is also my own, which is the bigger limitation. The obvious
next step is an adapter that ingests real LangGraph, AutoGen or Semantic Kernel
traces so you can paste an actual run instead of hand-writing one. One thing I
haven't checked stands in the way: `context_loss` and `missing_requirement`
only work because the trace declares `requires` and `handoff` per delegation,
and I don't know how much of that those frameworks record. If they record none
of it, an adapter still buys you the swimlane, dropped handoffs, loops and
duplicated work, and the two context detectors just go quiet.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build/dev | Vite 6 |
| Tests | Vitest 2 (52 cases across parser, detectors, utils, examples) |
| Analysis | Zero dependencies. Pure TypeScript, fully client-side, no API key |
| Demo | GitHub Pages (static) |

The 52 cases split 24 in `analyze.test.ts`, 11 in `parse.test.ts`, 11 in
`util.test.ts` and 6 in `examples.test.ts`.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
