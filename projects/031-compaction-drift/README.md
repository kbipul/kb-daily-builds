<div align="center">

# Compaction Drift

**The harness keeps what the agent needs to continue. Your rule isn't it.**

[![CI](https://github.com/kbipul/compaction-drift/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/compaction-drift/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://kbipul.github.io/compaction-drift/)

`Day 031` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

OpenAI put the [Agents API](https://openai.com/index/introducing-the-agents-api/) into public beta
on 10 September 2026. It hands you the Codex harness as a managed service: OpenAI runs session
orchestration, recovery, and — the part this project is about — context compaction. The
[compaction guide](https://developers.openai.com/api/docs/guides/compaction) says the harness
"automatically compacts earlier context as a session approaches its context limit, preserving
information the agent needs to continue."

That sentence is doing a lot of work. A standing rule — *never restart production without an
approver*, *this tenant opted out of automated contact*, *payments-api is under a change freeze* —
is **not** information the agent needs to continue. It is information the agent needs exactly once,
much later, at the moment it is about to break it. A summariser optimising for continuation has no
reason to keep it.

Compaction Drift is a simulator, not a scanner. Load a long session, set the harness up the way
yours is configured, and watch each rule's fidelity decay across compaction rounds — then see which
actions get taken with their governing rule no longer in context.

![Screenshot](docs/demo.png)

<sub>The sandbox this was built in cannot run a browser, so this screenshot is captured by the
repository's own CI on a GitHub runner and committed back a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/compaction-drift/)** — runs fully in your browser. No key,
no network call, no model.

```bash
git clone https://github.com/kbipul/compaction-drift.git
cd compaction-drift
npm ci
npm test          # 63 tests
npm run dev       # http://localhost:5173/compaction-drift/
```

## How it works

Three moving parts, all of them arithmetic:

**1. When does the harness compact?** Walk the session forward, adding tokens per turn. When the
transcript passes the window, record a round and drop back to a retained tail. Bigger window, fewer
rounds; longer session, more rounds. The `none` policy doesn't compact — it overflows and the
session stops, which is the failure compaction exists to remove.

**2. What does each round do to a fact?** Every fact carries a *role* (system prompt, something you
typed, something a tool returned) and a *kind* (standing rule, carve-out, correction, scope, task
state). A policy decides what a round does to it:

```
in the retained tail?           → untouched
role protected by this policy?  → stays verbatim
externalised + policy re-reads? → restored to verbatim
policy summarises?              → fidelity *= retention[kind]
otherwise                       → fidelity = 0
```

Fidelity compounds, so round three is where things die, not round one. Below 0.5 a fact is treated
as no longer actionable: the gist may survive ("there were some access restrictions") while the
operative detail — which system, which tenant, which exception — does not.

**3. Was the rule there when it mattered?** Each scenario has actions at specific turns, each
governed by specific facts. Look up the fact's state at that turn and grade the action `governed` /
`weakly governed` / `ungoverned`. Delegated actions get an extra gate first: each subagent
[maintains its own context](https://developers.openai.com/api/docs/guides/agents-api/multi-agent),
so a main-thread rule isn't there at all unless you put it in the brief.

The six policies are documented technique families — sliding window, recursive summary, pinned
prefix, user-verbatim compaction, externalised state — each linked to its source in
[`policies.ts`](src/engine/policies.ts).

## Build notes — what I learned

**The thing I built it to find is not the thing it found.** I expected the interesting variable to
be *policy*: pick a better compaction strategy, keep more of your rules. Policy matters, but it was
the second-biggest effect. The biggest is **where the rule came from**. In the default incident
scenario, the approval gate written into the system prompt survives all four compaction rounds
untouched, because every policy in the catalogue pins the prefix. The change freeze — discovered at
turn 4 from a tool result — is gone by turn 63, under every single compacting policy in the
dropdown. The rule you thought hardest about is the safest one. The rule the session *learned* is
the one at risk, and nobody writes those down because by definition you didn't know them when you
started.

**The sharpest result doesn't depend on my guesses.** Most of this model rests on a retention table
that is engineering judgement — I have no measurement of how much of a carve-out a summariser keeps,
and I say so on screen next to the output. But one finding is structural. Anthropic's
`/responses/compact` is a *published contract*: prior user messages stay verbatim, prior assistant
turns, tool calls and reasoning become an opaque item. Switch the policy to user-verbatim and the
data-residency instruction and the operator's correction both snap back to full fidelity for the
whole session — and the change freeze stays dead, because a tool result is not a user message. The
best-documented compaction policy available protects everything you typed and nothing the session
discovered for itself. That doesn't come from my numbers. It comes from reading the contract.

**A mitigation that measures as doing nothing.** The published guidance for long sessions is to
externalise durable state early rather than trusting conversation history. I built that as a policy
and it scored *identically* to plain pinned-prefix across all three scenarios — same ungoverned
count, same weakly-governed count. Not a bug: the only fact anyone had thought to externalise in the
presets is the top-level rule in the system prompt, which the pinned prefix was already protecting.
The advice is right and the way it gets applied is backwards. There's a test asserting the
null result (`externalising only the system rule buys nothing over pinning it`) and another
asserting that externalising the tool-discovered carve-out instead is what actually fixes the
failing action. The checkbox on each timeline row lets you try it.

**Two modelling bugs the probe caught and the tests wouldn't have.** I wrote the policy table with
`keepsSystemVerbatim: true` on both recursive-summary and pinned-prefix, which made them produce
byte-identical output in every scenario — the distinction between them *is* whether the prefix is
pinned, and I had erased it. Then I set the default to not forward rules to subagents, which is
realistic but meant the subagent gate failed every delegated action before compaction got a chance
to matter, hiding all six policies behind one blunt toggle. Both were only visible by printing the
full matrix of scenario × policy and looking for rows that were suspiciously equal. Neither would
have failed a unit test, because each function was individually correct.

**What I deliberately did not build.** No attempt to model *which* detail a summariser drops, only
how much. That would need a model in the loop and a claim about a specific summariser, and the
honest version of this tool is the one that works before any vendor publishes theirs. Transcript
growth is linear, which real sessions are not — one large tool result can force a round on its own.
That moves *when*, not *whether*.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict, `noUnusedLocals`) |
| Build | Vite 6 |
| Tests | Vitest 3 — 49 engine tests (node) + 14 render tests (jsdom) |
| Runtime deps | none beyond React — no model, no key, no network |

## Honest limits

- **This does not simulate the Agents API.** OpenAI has not published how its summariser works.
  It simulates what each documented *family* of technique does to a rule.
- Per-kind retention values are judgement, not measurement. The ordering is the argument; the
  magnitudes are adjustable in the UI so you can disagree with the numbers without disagreeing with
  the ordering. Treat absolute turn numbers as illustrative.
- Company, host and tenant names in the scenarios are invented.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
