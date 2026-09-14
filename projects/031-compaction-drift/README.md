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
orchestration, recovery, and the part this project is about, context compaction. The
[compaction guide](https://developers.openai.com/api/docs/guides/compaction) says the harness
"automatically compacts earlier context as a session approaches its context limit, preserving
information the agent needs to continue."

That sentence is doing a lot of work. A standing rule (*never restart production without an
approver*, *this tenant opted out of automated contact*, *payments-api is under a change freeze*)
is information the agent needs exactly once, much later, at the moment it is about to break it.
Until then it is not needed to continue, and a summariser optimising for continuation has no
reason to keep it.

Compaction Drift is a simulator, not a scanner. Load a long session, set the harness up the way
yours is configured, and watch each rule's fidelity decay across compaction rounds. Then see which
actions get taken with their governing rule no longer in context. The company, host and tenant
names in the scenarios are invented.

![Screenshot](docs/demo.png)

<sub>The sandbox this was built in cannot run a browser, so this screenshot is captured by the
repository's own CI on a GitHub runner and committed back a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/compaction-drift/)** — runs fully in your browser with no
network call.

```bash
git clone https://github.com/kbipul/compaction-drift.git
cd compaction-drift
npm ci
npm test          # 63 tests
npm run dev       # http://localhost:5173/compaction-drift/
```

## How it works

Three moving parts, all of them arithmetic.

The first decides when the harness compacts. Walk the session forward, adding tokens per turn. When
the transcript passes the window, record a round and drop back to a retained tail. Bigger window,
fewer rounds; longer session, more rounds. The `none` policy doesn't compact: it overflows and the
session stops, which is the failure compaction exists to remove.

The second decides what each round does to a fact. Every fact carries a *role* (system prompt,
something you typed, something a tool returned) and a *kind* (standing rule, carve-out, correction,
scope, task state). A policy decides what a round does to it:

```
in the retained tail?           → untouched
role protected by this policy?  → stays verbatim
externalised + policy re-reads? → restored to verbatim
policy summarises?              → fidelity *= retention[kind]
otherwise                       → fidelity = 0
```

Fidelity compounds, so the round that kills a fact is usually the third, and the first round looks
harmless. Below 0.5 a fact is treated as no longer actionable: the gist may survive ("there were
some access restrictions") while the operative detail, which system or which tenant, does not.

The third asks whether the rule was there when it mattered. Each scenario has actions at specific
turns, each governed by specific facts. Look up the fact's state at that turn and grade the action
`governed` / `weakly governed` / `ungoverned`. Delegated actions get an extra gate first: each
subagent [maintains its own context](https://developers.openai.com/api/docs/guides/agents-api/multi-agent),
so a main-thread rule isn't there at all unless you put it in the brief.

The six policies are documented technique families, among them sliding window, recursive summary,
pinned prefix, user-verbatim compaction and externalised state, each linked to its source in
[`policies.ts`](src/engine/policies.ts). None of them is the Agents API. OpenAI has not published
how its summariser works, and the app says so on screen: what a policy answers is what that
*family* of technique does to a rule.

## Build notes — what I learned

Two rows of the scenario × policy matrix were byte-identical, and they should not have been. I had
written `keepsSystemVerbatim: true` on both recursive-summary and pinned-prefix, and the
distinction between those two policies *is* whether the prefix is pinned; I had erased it. A second
bug showed up the same way. The default had rules not forwarded to subagents, which is
realistic, but it meant the subagent gate failed every delegated action before compaction got a
chance to matter, hiding all six policies behind one blunt toggle. Neither would have failed a
unit test, because each function was individually correct. Both were only visible by printing the
full matrix and looking for rows that were suspiciously equal.

Once the matrix was honest it disagreed with me. I built the tool expecting the interesting
variable to be *policy*: pick a better compaction strategy, keep more of your rules. Policy matters,
but it came second. The biggest effect is where the rule came from. In the default incident
scenario, the approval gate written into the system prompt survives all four compaction rounds
untouched, because every policy in the catalogue pins the prefix. The change freeze, discovered at
turn 4 from a tool result, is gone by turn 63, when a subagent is asked to roll payments-api back
one release, under every compacting policy in the dropdown. The consequence line on that action
reads "A change pushed into a frozen service by a subagent that never saw the freeze." The rule the
session *learned* is the one at risk, and nobody writes those down because by definition you
didn't know them when you started.

Most of this model rests on a retention table that is engineering judgement. I have no measurement
of how much of a carve-out a summariser keeps; I say so on screen next to the output, and all five
values are drag-adjustable so you can disagree with the numbers without disagreeing with the
ordering, which is the actual argument. Treat absolute turn numbers as illustrative. One finding,
though, is structural. OpenAI's `/responses/compact` is a *published contract*: prior user
messages stay verbatim, prior assistant turns, tool calls and reasoning become an opaque item.
Switch the policy to user-verbatim and the data-residency instruction and the operator's correction
both snap back to full fidelity for the whole session, while the change freeze stays dead, because
a tool result is not a user message. The best-documented compaction policy available protects
everything you typed and nothing the session discovered for itself. That comes from reading the
contract; the retention table plays no part in it, and the test pinning it is
`user-verbatim compaction rescues what the operator typed and not what a tool returned`.

The published guidance for long sessions is to externalise durable state early. I built that as a
policy and it scored *identically* to plain pinned-prefix across all three scenarios: same
ungoverned count, same weakly-governed count. It was doing what the presets told it to. The only
fact anyone had thought to externalise is the top-level rule in the system prompt, which the pinned
prefix was already protecting. The advice is right and the way it gets applied is backwards. There's
a test asserting the null result, `externalising only the system rule buys nothing over pinning it`,
and another, `externalising the tool-discovered carve-out instead is what actually helps`, asserting
that externalising the change freeze is what fixes the failing action. The checkbox on
each timeline row lets you try it.

Two things I did not build. There is no attempt to model *which* detail a summariser drops, only
how much. That would need a model in the loop and a claim about a specific summariser, and the
honest version of this tool is the one that works before any vendor publishes theirs. And
transcript growth is linear, which real sessions are not; one large tool result can force a round on
its own. That shifts the turn at which a loss lands and leaves the loss itself in place.

The slate had the same split in it. Recall-cliff, which has now lost three times, wanted to reason about long-context reliability and could not do it honestly, because
retrieval-degradation curves would have had to be invented. Compaction policies are documented
algorithms, so they can be simulated mechanically. The other candidate riding the same Agents API
signal, a Tool Search Roulette (tool definitions load only as needed, so a dangerous tool may or
may not be in context when the model reaches for it), lost on distinctiveness: it would have been
the sixth security report card after Days 006, 007, 010, 026 and 029.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict, `noUnusedLocals`) |
| Build | Vite 6 |
| Tests | Vitest 3 — 49 engine tests (node) + 14 render tests (jsdom) |
| Runtime deps | none beyond React — no model, no key, no network |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
