<div align="center">

# Token Clock — Your AI Bill Now Depends on What Time You Run It

**DeepSeek's peak/off-peak API pricing went live at 16:00 UTC on 16 August 2026 — output tokens up to 1,100% more expensive than the old flat rate at peak, and exactly half the peak rate outside two UTC windows. Map your daily traffic onto those bands in your own timezone, see your peak exposure, and watch deferrable work shift into off-peak. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/token-clock/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/token-clock/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-62d0ff)](https://kbipul.github.io/token-clock/)

`Day 22` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Today DeepSeek stops charging one price for a token. From 16:00 UTC on 16 August 2026 its API is peak-priced during 01:00–04:00 and 06:00–10:00 UTC — the Chinese working day — and half price the rest of the time. Every LLM cost tool in existence, including [the one I built on Day 4](https://github.com/kbipul/token-cost-lab), assumes a token has one price. That assumption died today.

Token Clock takes the shape of your day — hourly output-token volumes, split into workloads, each marked deferrable or not — and prices it against the new bands **in your timezone**. It tells you what share of your spend lands at the peak rate, what the repricing costs you against the old flat rate, and how much a scheduler could save by moving only the work that is genuinely allowed to move.

The finding that made this worth building: on the bundled India SaaS profile, **79.9% of daily spend lands at the peak rate**, because 11:30–15:30 IST sits entirely inside a peak window. The identical token volumes read against a US Pacific clock cost **53% less** — $462.66 versus $708.84 a day — for no reason other than where the users are.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects cannot run a browser, so this screenshot is captured by the repo's own CI on a GitHub runner and committed back a few minutes after publish. If you are reading this in the first minutes of its life, that image may not have landed yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/token-clock/)** — runs fully in your browser, nothing to install, no API key.

```bash
git clone https://github.com/kbipul/token-clock.git
cd token-clock
npm ci
npm test          # 69 tests
npm run dev       # http://localhost:5173/token-clock/
```

## How it works

Three pieces, all deterministic and all unit-tested. No model, no network, no key.

```
workloads (24 hourly buckets, local time)
        │
        ├─▶ clock.ts   local hour ──▶ UTC minutes ──▶ fraction of the hour
        │               that falls inside a peak window          (0 … 1)
        │
        ├─▶ cost.ts    blended rate = f·peak + (1−f)·offpeak
        │               ──▶ per-hour cost, total, peak exposure
        │
        └─▶ shift.ts   greedy re-scheduler: move deferrable tokens
                        to strictly cheaper hours within the SLA window,
                        subject to a per-hour burst ceiling
```

**1. The hour is not the unit.** The interesting decision was refusing to model a local hour as either peak or off-peak. India is UTC+5:30, so 06:00–07:00 IST is 00:30–01:30 UTC — it *straddles* the 01:00 UTC start of the first peak window. Half of it is peak-priced. A whole-hour model has to pick one and is wrong either way. `peakFractionForLocalHour` walks the sixty minutes of each local hour, converts each to UTC, and returns the covered fraction; the cost engine then blends the two rates by that fraction. There is a test asserting the fractions across a day sum to exactly 7 hours in every timezone, which is the invariant that catches any arithmetic drift.

**2. Only what can move, moves.** The scheduler never touches non-deferrable workloads. Interactive traffic happens when your users are awake, and a savings number that quietly reschedules it is fiction. Deferrable work may only travel within its own `maxShiftHours` SLA, only to a *strictly* cheaper hour, and only into an hour that has not exceeded a burst ceiling — because a day of batch work cannot physically land in one 3 a.m. slot. Source hours are processed by descending rate then ascending hour, destinations by ascending rate then distance, so the whole thing is deterministic and there is a test that runs it twice and compares the JSON.

**3. It admits when it fails.** Deferrable tokens that had a cheaper hour available but found every one of them at its ceiling are reported as `strandedTokens` rather than folded into the headline. Work that simply had nowhere cheaper to go is deliberately *not* counted as stranded — those are different problems and there is a test for each.

## Build notes — what I learned

The signal for this one was unusually sharp. Most days I am reading a trend; today there is a timestamp. DeepSeek's new pricing takes effect at 16:00 UTC on the very day this shipped, and the numbers are not subtle — V4-Flash output goes from a flat $0.28 per million to $1.32 at peak and $0.66 off-peak. The reflex reading is "DeepSeek got expensive." The more useful reading is that a token's price became a function of *when*, and every cost model in every FinOps deck quietly assumes it is a function of *what*.

The thing I did not expect was how badly this lands on India specifically. DeepSeek's peak windows are defined around Beijing business hours, and IST is two and a half hours behind Beijing — close enough that the Indian working day sits almost entirely inside them. 11:30–15:30 IST is fully peak. The bundled Indian profile comes out at 79.9% peak exposure without doing anything wrong; the same traffic on a Pacific clock is 53% cheaper. For an Indian engineering team this is not a tuning exercise, it is a structural cost difference that arrived with no code change on their side, and I have not seen anyone write it down.

The half-hour offset was the part that nearly went out wrong. I wrote the first version with `localHour → utcHour` integer arithmetic, it passed every test I had, and it was quietly incorrect for exactly the timezone the project is about — India's 5:30 offset means a local hour maps onto a UTC half-hour boundary and can straddle a band edge. I only caught it writing the Beijing test, where everything lands on clean hours and looked suspiciously tidy. Rewriting to minute-resolution fractional coverage cost about twenty lines and turned a wrong tool into a right one. The invariant test — peak fractions must total exactly seven hours in every zone — is the one I would keep if I could keep only one.

One test failed on the first run and it was the test that was wrong, not the code. I had asserted that a single enormous peak hour under a tight burst ceiling would strand work, but the ceiling is derived from the workload's own busiest hour, so one destination hour could always absorb one source hour. The honest fix was to construct the scenario that genuinely strands — four consecutive peak hours competing for the same two off-peak neighbours — and to add a second test pinning down the distinction between "blocked by capacity" and "nowhere cheaper to go". Better assertions, not looser ones.

Where I cut scope: this prices **output tokens only**. Every source covering the repricing quotes output rates; none of them published per-band input rates, and I was not willing to put a number in the catalogue I could not cite. So the tool says "output-token spend" everywhere rather than "your bill", and the honesty panel says why. It also uses fixed UTC offsets with no daylight-saving handling — each zone is labelled with the exact offset used in the arithmetic, so what you see is what is computed. Both are real limits and both are stated in the UI rather than buried here.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build | Vite 6, `base: "/token-clock/"` for Pages |
| Tests | Vitest 2 — 69 tests |
| Engine | Hand-written: minute-resolution band coverage, blended-rate costing, greedy SLA-bounded re-scheduler |
| Runtime deps | React and React DOM. Nothing else — no date library, no chart library, no model |

## Sources

Pricing figures are from the 13–14 August 2026 reporting of DeepSeek's V4 peak/off-peak change ([TechNode](https://technode.com/2026/08/14/deepseek-to-introduce-peak-and-off-peak-pricing-for-its-api/), [Quartz](https://qz.com/deepseek-api-price-increase-v4-peak-off-peak-081326)), effective 16:00 UTC on 16 August 2026. Every entry in the catalogue carries its source and effective date in the code, and the UI prints them.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
