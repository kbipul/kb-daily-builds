<div align="center">

# Cache Cliff

**A twelve-token timestamp at the top of your system prompt can cost more than everything below it. Find yours.**

[![CI](https://github.com/kbipul/cache-cliff/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/cache-cliff/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2f9e63)](https://kbipul.github.io/cache-cliff/)

`Day 024` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## The number that started this

On 1 September 2026 Anthropic shipped Claude Fable 5.1 and cut cache reads by 75%, to $0.25 per million tokens. Cache writes did not move: $12.50/M at the five-minute TTL, $20/M at one hour. Input is $10/M.

Put those three numbers next to each other. A cache hit and a cache miss on the same tokens are now 50× apart. Under the old $1.00 read rate they were 12.5× apart. And a cached prefix repays its own write after 1.26 requests, so "is caching worth it" stopped being a question anybody needs a calculator for.

What replaced it is a harder question. Prefix caching matches the longest *identical token prefix* of your request. The first block that changes ends caching for everything behind it, however stable that tail is. So the question is no longer whether to cache. It is whether your prefix actually hits, and that is a fact about the order of your blocks, not about your budget.

Cache Cliff is where you check.

![Screenshot](docs/demo.png)

<sub>CI captures this on a GitHub runner and commits it a few minutes after publish. The build sandbox has no browser.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/cache-cliff/)** — runs in your browser. No key, no signup, no server.

```bash
git clone https://github.com/kbipul/cache-cliff.git
cd cache-cliff
npm ci
npm test          # 69 tests
npm run dev       # http://localhost:5173/cache-cliff/
```

## What it finds

Load the *Coding agent* preset. It is the shape almost every agent ships with: 18 tool definitions, a system prompt, a repository map, the conversation, the user's message. And one line, third from the top, that reads `Current date and time: …` so the model knows what day it is.

Twelve tokens.

```
tools 3,400   system 1,800   [now: 12]   repo map 24,000   history 8,000   msg 300
└─────── cacheable ───────┘      ▲       └──────── 32,300 tokens stranded ────────┘
```

At 40 sessions a day, 30 turns each:

| | per month | |
|---|---:|---|
| No caching at all | $15,124 | |
| Caching, as configured | **$18,473** | 22% *worse* than not caching |
| Blocks reordered inside their zones | $13,299 | no code change |
| Timestamp moved to the user turn | **$5,228** | one line, 72% off |

Two things there are worth separating.

The first is that switching caching on made this workload more expensive. The `cache_control` marker sits behind a block that changes every turn, so the prefix gets written at $12.50/M on every request and never once read back. You are paying a 25% surcharge for a cache that exists only to be paid for. No dashboard that reports cache-hit *rate* will show you this, because the rate is not low. It is zero, on a prefix nobody thought to check.

The second is that the fix is worth more than the feature. Twelve tokens change position and the bill goes from $18,473 to $5,228. Nothing is deleted, nothing is shortened, no model changes.

The enterprise RAG preset does the same thing with a different culprit: a 42,000-token policy corpus behind a 40-token line that interpolates the user's name. At 900 sessions a day that line costs $53,919 a month on its own. Markers alone take the stack from $84,337 to $30,418. Moving the line as well takes it to $16,527.

## How it works

Every block declares two things: how often it changes (never, per session, per turn) and which zone it belongs to (`tools` → `system` → `context` → `history` → `turn`). From that, five pure functions do the rest.

`stableThrough` walks the unbroken stable run from the top of the prompt. `hitDepth` finds the deepest `cache_control` marker inside that run. `requestCost` splits the prompt into three buckets (read at $0.25, written at $12.50, or charged at full input) and prices them. `diagnose` names what is wrong. `optimize` proposes the fix.

Three things in there are less obvious than they look.

Costs are computed twice, cold and warm, because "stable" is not one thing. A block that changes per *session* caches perfectly inside a conversation and is rewritten on every new one. Collapse that into stable-or-not and you cannot see the RAG bug at all: on turn 6 of a session that 40-token line is free, and at 900 sessions a day it is the single largest item on the invoice. A session is priced as one cold turn plus *n*−1 warm ones.

A dead cache is worse than no cache, and the tool leads with that finding rather than burying it in a list. Writing at $12.50/M against an input rate of $10/M is a 25% penalty, and it is the only failure mode here where the fix makes things *worse* than doing nothing.

And reordering is only legal inside a zone. You cannot put the user's message ahead of the system prompt, so an optimiser that sorted the whole list by volatility would emit advice nobody can take. `optimize` stable-sorts within each zone and stops there.

## The zone boundary, and what I did about it

That constraint is where the build actually got interesting, because it meant the optimiser could not reach the best answer to its own headline example.

The timestamp lives in the `system` zone. The repository map lives in `context`. Sorting inside `system` moves the timestamp to the bottom of the system prompt, which is still in front of 24,000 tokens of repo map. The bill goes from $18,473 to $13,299 and stops, while the findings panel underneath sits there telling you 32,300 tokens are still stranded. The cost panel said "already getting everything prefix caching can give it." Both were true. Together they were a contradiction on screen.

I could have let the optimiser reorder freely and reported the bigger number. Moving that timestamp into the user turn is almost certainly correct — a date reads the same at the bottom of a prompt as at the top, but "almost certainly" is not the same as "safe to do silently," and it is a change to how you assemble the request rather than a reshuffle of what you already send.

So there are two tiers now, priced separately, with two buttons. `optimize` reorders within zones and claims nothing more. `relocate` runs a greedy pass over every volatile block sitting in a zone that gets assembled before the conversation starts, moves it to the turn, and keeps the move only when it increases the number of tokens that read back. That objective is deliberately model-independent: a move either strands fewer tokens or it does not, whatever the price list says.

Greedy is the part I am least sure about. It is defensible here because the blocks compete for one resource, position in a single prefix, so a move that strands fewer tokens should not make a later move worse. I have a test asserting `relocate` never loses to `optimize` on any preset, which is weaker than a proof and is what I have.

## Build notes

The first draft of this README said the 75% cut "quadruples what a broken prefix costs you." I wrote `cache.test.ts > the Fable 5.1 asymmetry` to lock that in. It came back **1.07×**.

The absolute waste barely moves between the two price lists, because a miss is billed at the write rate and the write rate did not change. What quadrupled is the *ratio* between the broken stack and the repaired one, because the repaired one got four times cheaper. Same underlying fact, a materially different sentence, and the wrong one was already written. The test now asserts `ratio(fable5_1) / ratio(fable5) ≈ 4` and the sentence upstairs matches it.

Everything the README quotes in dollars now lives in `presets.test.ts` under `describe('README claims')`. If the pricing table or the engine moves, the write-up fails the build rather than quietly going stale.

`ceil(chars / 4)` is the token rule of thumb everyone repeats, and it is 45% wrong. On this sentence:

> The quick brown fox jumps over the lazy dog while the engineer wonders whether the prompt cache will hold together for another billing cycle.

it returns 38 tokens where cl100k-class tokenizers give 26 to 28. Fine in a blog post. Not fine when the output has a dollar sign on it.

Three rules get it inside 4%: merge letter runs up to seven characters into one token, split longer ones every four characters after that, and chunk digit runs by three. All three are in `tokens.ts` with the reasoning inline.

I am not confident it generalises. It was tuned on English prose and I have not checked it against JSON, code, or Devanagari, all three of which show up in real system prompts and all three of which tokenize differently. And the deeper problem does not go away with better rules: **Anthropic does not publish the Claude tokenizer at all.** Every count here is an estimate, stated at ±20%, next to a pointer to the one exact number you already have: `usage.input_tokens`, in the API response you are already parsing. Every block takes a raw number for that reason.

Three things are not in here. Conversation history grows turn over turn; every block is a fixed average size for the session, which understates long sessions. There is no paste-a-request-body import, so you retype the shape. Only Fable 5.1 and its own pre-5.1 read rate ship as presets, because those are the two numbers I can cite; everything else is the Custom model with the conventional ratios pre-filled rather than a price table I would be guessing at.

## Stack

| | |
|---|---|
| UI | React 18, TypeScript 5, plain CSS |
| Build | Vite 6 |
| Tests | Vitest, 69 cases across the engine, the estimator and the claims in this file |
| Runtime | None. Pure client-side arithmetic. No API, no key, no network call |

## Sources

Claude Fable 5.1 and Mythos 5.1 launched 1 September 2026; the 75% cache-read reduction is reported by [VentureBeat](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) and [MarkTechPost](https://www.marktechpost.com/2026/09/01/anthropic-releases-claude-fable-5-1-and-claude-mythos-5-1-52-6-on-terminal-bench-science-and-75-cheaper-cache-reads/).

Rates used: input $10/M, output $50/M, cache read $0.25/M, five-minute write $12.50/M, one-hour write $20/M. The pre-5.1 comparison uses $1.00/M for reads, the conventional 10%-of-input rule the 75% cut was measured against. List prices, so batch and enterprise discounts are out of scope.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
