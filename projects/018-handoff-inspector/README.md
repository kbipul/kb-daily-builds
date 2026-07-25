<div align="center">

# Handoff — Inspect a Multi-Agent Run for Coordination Failures

**Paste a multi-agent orchestration trace (supervisor + sub-agents) and watch it on a swimlane timeline while it flags the coordination failures single-agent tools miss — dropped handoffs, delegation loops, context lost between agents, duplicated work. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/handoff-inspector/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/handoff-inspector/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2fbf71)](https://kbipul.github.io/handoff-inspector/)

`Day 18` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

The whole week the GitHub trending page has been agent tooling — an AI
pen-test agent (`usestrix/strix`) sitting at #1, an "agent multiplexer that lives
in your terminal" (`ogulcancelik/herdr`), agent-skills frameworks. As soon as
you run *more than one* agent, a new failure surface opens that single-agent
debuggers can't see: work handed off and never returned, two agents delegating
the same task back and forth, one agent missing the artifact another already
produced, two agents doing the identical tool call.

**Handoff** takes a trace of a multi-agent run — a supervisor delegating to
sub-agents, agents calling tools and returning results — and does two things:
it lays every agent out as a swimlane you can scrub through step by step, and it
runs eight deterministic detectors over the event log to flag exactly where the
*coordination* broke. It is the multi-agent sequel to Day 16 (validate one
tool call) and Day 17 (analyze one agent's ReAct loop): here the unit of
analysis is the space *between* agents.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured automatically by this repo's CI on a real
browser (the build sandbox can't run one) and committed to `docs/demo.png`
within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/handoff-inspector/)** — runs fully in
your browser, nothing to install. Load one of the six sample runs (clean
pipeline, dropped handoff, delegation loop, context loss, duplicated work, a
messy run that never converges) or paste your own trace.

```bash
git clone https://github.com/kbipul/handoff-inspector.git
cd handoff-inspector
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the detector test-suite
npm run build    # production build into dist/
```

## How it works

A trace is a flat, time-ordered event log — no framework lock-in:

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

The pipeline is three pure stages, each unit-tested in isolation:

```
paste → parseTrace()  → strict structural validation (known agents, event shape)
      → analyze()      → 8 detectors over the event log → issues + 0-100 score
      → swimlane UI     → scrub the timeline, click a finding to highlight its events
```

The eight detectors:

| Detector | Severity | Fires when |
|---|---|---|
| `dropped_handoff` | critical | a `delegate` for a task never gets a matching `return` from the delegatee |
| `delegation_loop` | critical | a task's delegation edges form a cycle (A→B→A ping-pong, or longer) |
| `context_loss` | critical | a task `requires` an artifact that already existed but wasn't in the `handoff` |
| `no_final_answer` | critical | the run never emits a `final` event — it didn't converge |
| `missing_requirement` | warning | a required artifact was never produced anywhere and wasn't passed |
| `duplicated_work` | warning | two `tool_call`s share a tool **and** canonically-equal args |
| `out_of_role_tool` | warning | an agent calls a tool outside its own declared `tools` list |
| `idle_agent` / `untracked_delegation` | info | a declared agent never acts; or a delegate carries no task id to track |

Cycle detection is a three-colour DFS on the per-task delegation graph;
duplicated-work compares arguments through a canonical (key-sorted) JSON
serialization so `{a,b}` and `{b,a}` are correctly seen as the same call.

## Build notes — what I learned

The hard part of this build was not the detectors — it was drawing an honest
line around what "context loss" can even *mean* without a model. My first design
tried to infer whether a downstream agent "should have known" some fact, and it
fell apart immediately: any such inference is a guess, and a guess dressed up as
a finding is worse than no finding. So I inverted it. The trace itself declares,
per delegation, what a task `requires` and what was actually `handoff`-ed. The
detector only reasons about that declared contract: if a required artifact
existed upstream but wasn't passed, that's a real, checkable coordination bug;
if it never existed, that's a *different*, weaker finding (`missing_requirement`)
rather than pretending to know intent. The same discipline runs through the
whole tool — it mirrors the honesty stance of Day 16 and 17: report what the
trace encodes, never what a reader might assume.

The second lesson was that multi-agent failures are mostly *relational*, so the
useful representation is a graph, not a list. Dropped handoffs are a missing
edge (delegate with no return); loops are a cycle; duplicated work is two nodes
with the same signature. Once I modelled delegations as a per-task directed
graph, three-colour cycle detection gave me ping-pong **and** longer loops for
free, and the same structure made the swimlane render trivial: each agent is a
row, each event lands in its actor's lane at its timestep, and a shared CSS grid
column count keeps every lane aligned so a handoff reads left-to-right across
rows.

The third surprise was how much the sample runs matter for a tool like this.
A validator is only convincing if you can *see* it catch a bug you recognize,
so I spent as long designing the six example traces — especially the "messy
run" that trips four detectors at once and never emits a final answer — as I did
on the engine. They double as fixtures: a test round-trips every example through
the parser and asserts the analysis is identical, which caught two schema typos
before they ever reached the UI.

What I'd do differently: the score is a flat per-severity penalty, which is
blunt — a run with one dropped handoff and a run with five both bottom out fast.
A future version could weight by how far into the run the failure occurs, or
surface a "first thing that went wrong" cursor. And the trace schema is my own;
the obvious next step is an adapter that ingests real LangGraph / AutoGen /
Semantic Kernel traces so you can paste an actual run instead of hand-writing
one.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build/dev | Vite 6 |
| Tests | Vitest 2 (52 cases across parser, detectors, utils, examples) |
| Analysis | Zero dependencies — pure TypeScript, fully client-side, no API key |
| Demo | GitHub Pages (static) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
