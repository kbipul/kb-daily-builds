<div align="center">

# Cache Cliff

**Claude Fable 5.1 cut cache reads 75% on 1 September 2026. That made a cache *miss* cost 50× a hit. Find the twelve tokens stranding your twenty-four thousand.**

[![CI](https://github.com/kbipul/cache-cliff/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/cache-cliff/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2f9e63)](https://kbipul.github.io/cache-cliff/)

`Day 024` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Anthropic's Claude Fable 5.1 went GA on 1 September 2026 with cache reads cut 75%, to **$0.25 per million tokens** — 2.5% of its $10/M input price, where every other Claude model charges 10%. Cache *writes* did not move ($12.50/M at 5 minutes, $20/M at 1 hour). So the gap between a prompt-cache hit and a miss went from 12.5× to **50×** overnight, and prefix hygiene became four times more valuable than it was the week before.

Prefix caching matches the **longest identical token prefix** of your request. The first block that changes ends caching for everything behind it, however stable that tail is. Cache Cliff lets you lay out your prompt as ordered blocks — tool definitions, system prompt, pinned context, history, the current turn — mark how often each one changes, place your `cache_control` markers, and see exactly where the prefix breaks, how many tokens that strands, what it costs a month, and which legal reordering fixes it.

![Screenshot](docs/demo.png)

<sub>CI captures this screenshot on a GitHub runner and commits it a few minutes after publish — the build sandbox has no browser.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/cache-cliff/)** — runs fully in your browser, no API key, nothing to install.

```bash
git clone https://github.com/kbipul/cache-cliff.git
cd cache-cliff
npm ci
npm test          # 58 tests
npm run dev       # http://localhost:5173/cache-cliff/
```

## What it finds

The bundled *Coding agent* preset is the shape almost every agent ships with — 18 tool definitions, a system prompt, a repository map, the conversation, the user's message — plus one line that says `Current date and time: …` so the model knows what day it is.

That line is **twelve tokens**. It sits at position 3 of 6. It changes every turn.

```
tools 3,400   system 1,800   [now: 12]   repo map 24,000   history 8,000   msg 300
└─────── cacheable ───────┘      ▲       └──────── 32,300 tokens stranded ────────┘
                              the cliff
```

At 40 sessions a day, 30 turns each, on Fable 5.1:

| | per month |
|---|---:|
| No caching at all | **$15,124** |
| Caching, as configured | **$18,473** |
| Same prompt, blocks reordered | **$13,299** |

Turning prompt caching *on* made this workload **22% more expensive**. The `cache_control` marker sits behind a block that changes every turn, so the prefix is written at $12.50/M on every request and never once read back — a cache that is only ever paid for. The fix is not a shorter prompt, a cheaper model or a single deleted token: it is moving twelve tokens to the bottom.

The second preset is an enterprise RAG copilot with a 42,000-token policy corpus and the user's name interpolated into the top of the system prompt. It has no markers at all; adding the two that matter takes it from $84,337 to $30,418 a month.

## How it works

Everything is a pure function over an ordered block list — no API, no model, no network.

```
blocks[] ──► stableThrough(horizon)  the unbroken stable run from the top
        └──► hitDepth()             deepest marker inside that run
        └──► requestCost()          hit @ read · write @ write · tail @ input
        └──► diagnose()             trapped markers, cliffs, redundant markers
        └──► optimize()             legal reorder + the two markers that pay
```

Three decisions carry the tool:

**Two horizons, not one.** A block that changes per *session* caches perfectly inside a conversation and is rewritten on every new one. Collapsing that into "stable / not stable" hides the single most common enterprise mistake — a 40-token personalisation line in front of a 42,000-token corpus, which is free on turn 6 and ruinous at 900 sessions a day. So every cost is computed twice, cold and warm, and a session is priced as one cold turn plus *n*−1 warm ones.

**A dead cache costs more than no cache.** A marker whose prefix contains a per-turn block can never be read back, so those tokens are billed at the write rate — $12.50/M against an input rate of $10/M. That is a 25% surcharge for switching caching on, and it is the finding the tool leads with, because it is invisible in every dashboard that reports cache-hit *rate* rather than cache-hit *cost*.

**Reordering is only legal within a zone.** You cannot move the user's message ahead of the system prompt, so a naive "sort by volatility" optimiser would emit advice you can't take. Each block declares a zone — `tools` → `system` → `context` → `history` → `turn` — and the optimiser stable-sorts by volatility *inside* each zone only. When a per-turn block sits in an early zone and reordering genuinely cannot rescue it, the tool says so instead of pretending.

## Build notes — what I learned

**The interesting number wasn't the discount.** My first sketch was another price calculator: old rate, new rate, delta. Then I worked out the break-even. On Fable 5.1 a cached prefix pays back its own write cost after **1.26 requests** — reuse a prefix even once and caching wins. So "should I cache this?" is no longer a question anyone needs a tool for. The question that's left is "does my prefix actually hit?", and that one is structural, not arithmetic. The tool changed shape on the back of that: it analyses *ordering*, and the dollars are the consequence.

**A test I wrote to prove a claim disproved it instead.** I'd written that the 75% cut "quadruples what a broken prefix costs you." The test came back 1.07×. The absolute waste barely moves between the two price lists, because a miss is billed at the *write* rate and the write rate didn't change — what quadrupled is the ratio between the broken stack and the repaired one, because the repaired one got four times cheaper. Same fact, materially different sentence, and I'd have shipped the wrong one. The claim now lives in `presets.test.ts` as an assertion, along with the $15,124 / $18,473 / $13,299 table above, so the README fails the build if it ever stops being true.

**The naive token estimator was 45% wrong.** `ceil(chars / 4)` is the rule of thumb everyone repeats; on a plain English sentence it returned 38 tokens where real BPE gives 27. That is fine in a blog post and unacceptable when the output is a dollar figure. Modern vocabularies merge most English words up to about seven characters into one token, split longer ones roughly every four characters, and chunk digit runs about three at a time — coding those three rules lands within 4%. But Anthropic doesn't publish the Claude tokenizer at all, so the honest position is that *every* count here is an estimate, stated at ±20%, with a loud pointer to the one exact number you already have: `usage.input_tokens` in your own API response. Every block accepts a raw number for exactly that reason.

**The optimiser's most useful output is an admission.** In the RAG preset the truly right fix — move the personalisation line out of the system prompt entirely — is one the optimiser is not allowed to make, because it crosses a zone boundary. I could have let it reorder freely and produced a bigger saving on screen. Instead it does what it legally can (which is still 64%) and emits a separate finding naming the block and the move a human has to authorise. A tool that recommends an illegal edit is worse than one that admits its limit.

**What I cut.** Conversation history grows turn over turn; here every block is a fixed average size for the session, which understates the tail cost of long sessions. There is no import path from an actual Anthropic request body — you retype the shape rather than paste JSON. And only Fable 5.1 and its own pre-5.1 rate ship as presets, because those are the two numbers I could cite; everything else is the Custom model with the conventional ratios pre-filled rather than a table of prices I'd be guessing at.

## Stack

| | |
|---|---|
| UI | React 18, TypeScript 5, plain CSS |
| Build | Vite 6 |
| Tests | Vitest — 58 cases across the engine, estimator and README claims |
| Runtime | None. Pure client-side arithmetic, no API, no key, no network call |

## Sources

- Claude Fable 5.1 / Mythos 5.1 launch and the 75% cache-read reduction — Anthropic, 1 September 2026, as reported by [VentureBeat](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) and [MarkTechPost](https://www.marktechpost.com/2026/09/01/anthropic-releases-claude-fable-5-1-and-claude-mythos-5-1-52-6-on-terminal-bench-science-and-75-cheaper-cache-reads/).
- Rates used: input $10/M, output $50/M, cache read $0.25/M, 5-minute write $12.50/M, 1-hour write $20/M. The pre-5.1 comparison uses $1.00/M for cache reads — the conventional 10%-of-input rule the 75% cut was measured against. List prices; batch and enterprise discounts are out of scope.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
