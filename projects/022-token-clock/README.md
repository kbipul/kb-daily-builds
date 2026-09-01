<div align="center">

# Token Clock — Your AI Bill Now Depends on What Day You Run It

**DeepSeek made API tokens peak-priced on 16 August 2026, then exempted the entire weekend a week later. Output tokens run up to 1,100% above the old flat rate inside two weekday UTC windows — and Saturday and Sunday are now off-peak all day. Map your traffic onto the bands in your own timezone, price a full week, and see what moving batch work to the weekend is worth. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/token-clock/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/token-clock/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-62d0ff)](https://kbipul.github.io/token-clock/)

`Day 22` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

DeepSeek stopped charging one price for a token. Since 16:00 UTC on 16 August 2026 its API is peak-priced during 01:00–04:00 and 06:00–10:00 UTC — the Chinese working day — and half price the rest of the time. Then on 23 August it amended the scheme: **Saturday and Sunday are billed entirely at the off-peak rate.**

That second change is the one worth building for. It moves the cheapest available lever from *run this batch at 3 a.m.* to *run it on Saturday* — a scheduling change most teams can actually make, against one they mostly cannot.

Token Clock takes the shape of your week — hourly output-token volumes, split into workloads, each marked deferrable or not — and prices all seven days against the bands **in your timezone**. It reports what share of weekly spend lands at the peak rate, what the repricing costs against the old flat rate, what an intra-day scheduler could save, and what the weekend exemption is worth on your specific traffic.

The finding that made this worth building: on the bundled India SaaS profile, **a weekday runs 79.9% of its spend at the peak rate**, because 11:30–15:30 IST sits entirely inside a peak window. The identical token volumes read against a US Pacific clock cost **$462.66 a weekday against India's $708.84** — 35% less, for no reason other than where the users are. Across a full week that is $3,164.70 versus $4,395.60.

The weekend exemption is the first lever that hands an Indian team some of that back without moving their users. On the same profile it is worth **$566.28 a week (11.4%)** for changing nothing at all, and a further **$792.00 a week** — 42% of deferrable spend — if the batch work actually moves to Saturday. Both numbers are reproducible from the bundled profile in the live demo.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects cannot run a browser, so this screenshot is captured by the repo's own CI on a GitHub runner and committed back a few minutes after publish. If you are reading this in the first minutes of its life, that image may not have landed yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/token-clock/)** — runs fully in your browser, nothing to install, no API key.

```bash
git clone https://github.com/kbipul/token-clock.git
cd token-clock
npm ci
npm test          # 93 tests
npm run dev       # http://localhost:5173/token-clock/
```

## How it works

Four pieces, all deterministic and all unit-tested. No model, no network, no key.

```
workloads (24 hourly buckets, local time)
        │
        ├─▶ clock.ts   local hour + local DAY ──▶ UTC minute-of-week
        │               ──▶ is this a peak window? is this a peak DAY?
        │               ──▶ fraction of the hour priced at peak      (0 … 1)
        │
        ├─▶ cost.ts    blended rate = f·peak + (1−f)·offpeak
        │               ──▶ per-hour cost, per-day cost, weekly total,
        │                   weekly peak exposure
        │
        ├─▶ shift.ts   greedy intra-day re-scheduler: deferrable tokens
        │               move to strictly cheaper hours within the SLA,
        │               subject to a per-hour burst ceiling
        │
        └─▶ shift.ts   weekendPlan: price each weekday's deferrable run
                        against the cheapest weekend day
```

**1. The hour is not the unit.** The first interesting refusal was modelling a local hour as either peak or off-peak. India is UTC+5:30, so 06:00–07:00 IST is 00:30–01:30 UTC — it *straddles* the 01:00 UTC start of the first peak window. Half of it is peak-priced. A whole-hour model has to pick one and is wrong either way. The engine walks the sixty minutes of each local hour, converts each to UTC, and returns the covered fraction; the cost engine blends the two rates by that fraction.

**2. The day is not the local day.** The weekend exemption looks trivial to implement and is not. DeepSeek bills in UTC windows, so the exempt day has to be resolved on the **UTC** day the minute actually lands on. For a user in US Pacific (UTC−7), local Friday 18:00 is Saturday 01:00 UTC — inside a peak window, but on an exempt day. Local Sunday 18:00 is Monday 01:00 UTC, and *is* peak-priced. A local-day model gets both backwards, and the tests pin down exactly those two cases.

The weekend is evaluated on UTC days rather than Beijing days, which needs justifying because DeepSeek announced it in Beijing time. It is safe here because every peak window sits inside 01:00–10:00 UTC: adding the +8h offset never crosses midnight, so the Beijing weekend and the UTC weekend exempt identical minutes. If the bands ever move outside that range the assumption breaks, which is why it is written down in the code and the UI rather than assumed silently.

**3. Every day is priced on its own.** Weekly cost is not "a representative weekday × 5 + a weekend day × 2". All seven days are computed separately, because for zones far from UTC they genuinely differ — the Friday-evening and Sunday-evening cases above are exactly the kind of thing a representative day hides.

**4. Only what can move, moves — and the ceiling is labelled.** The scheduler never touches non-deferrable workloads; interactive traffic happens when your users are awake, and a savings number that quietly reschedules it is fiction. The weekend plan lists each weekday's move as its own row rather than presenting one blended number, because whether your pipeline can absorb all five weekday runs across two days is a capacity decision only its owner can make. The headline total is explicitly a ceiling. Intra-day stranding — deferrable tokens that had a cheaper hour but found every one at its burst ceiling — is reported separately rather than folded into the win.

## Build notes — what I learned

This one shipped late, and the reason is the most useful thing in it.

The project was built on 16 August, the day the repricing went live. It then sat unpublished for two weeks because the loop's GitHub credential had expired and nothing was watching for that. During those two weeks DeepSeek amended the scheme — on 23 August it dropped peak billing on weekends entirely — and the tool, which modelled peak bands seven days a week, quietly became wrong.

What makes that worth writing down is *how* the error survived. The loop re-checked this signal every single day while it was blocked, and every day it concluded "unchanged". The sources it kept re-reading were the launch-week explainers from 16–17 August, which are accurate about the launch and silent about everything after it. There had even been an early aggregator claim of a weekday-only rule, and it was dismissed — correctly, on the evidence available at the time, because it contradicted three post-launch sources. That claim was simply early. A daily freshness check that keeps re-reading the same launch-era coverage does not verify anything; it re-confirms a snapshot. The fix was to search for *changes since* the launch rather than re-verifying the launch itself, and that is a habit, not a code change.

The technical work the amendment forced turned out to be an upgrade rather than a patch. Adding a day dimension moved the tool's headline from "shift your batch a few hours" — a lever most teams cannot pull, because a 3 a.m. slot has its own constraints — to "move it to Saturday", which is an ordinary scheduling decision. The saving is also simply larger: on round-the-clock batch traffic the weekend move beats everything intra-day shifting can find, and there is a test asserting exactly that so the claim cannot rot.

The half-hour offset was the part that nearly went out wrong in the first version. Integer `localHour → utcHour` arithmetic passed every test I had and was quietly incorrect for exactly the timezone the project is about. Minute-resolution fractional coverage cost about twenty lines and turned a wrong tool into a right one. The day-of-week work sits on top of that same minute walk, which is the only reason the Pacific Friday-evening case was cheap to get right.

Where I cut scope: this prices **output tokens only**. Every source covering the repricing quotes output rates; none published per-band input rates, and I was not willing to put a number in the catalogue I could not cite. It also uses fixed UTC offsets with no daylight-saving handling — each zone is labelled with the exact offset used in the arithmetic. Both are real limits, both are stated in the UI rather than buried here.

**Prior art, honestly.** When this was built there was nothing else mapping traffic onto the new bands. In the weeks it spent stuck behind a dead credential, several "is it peak right now?" clocks shipped — [seekpeak.dev](https://seekpeak.dev) among them. They answer a different and simpler question. What is still unusual here is taking *your* hourly traffic profile, in *your* timezone, and pricing it across a full week including the weekend exemption. But the "first tool for this repricing" framing this README originally carried is no longer true, and leaving it in would have been a small lie.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build | Vite 6, `base: "/token-clock/"` for Pages |
| Tests | Vitest 2 — 93 tests |
| Engine | Hand-written: minute-of-week band coverage, blended-rate costing, weekly costing, greedy SLA-bounded re-scheduler, weekend planner |
| Runtime deps | React and React DOM. Nothing else — no date library, no chart library, no model |

## Sources

Band figures are from the 13–14 August 2026 reporting of DeepSeek's V4 peak/off-peak change ([TechNode](https://technode.com/2026/08/14/deepseek-to-introduce-peak-and-off-peak-pricing-for-its-api/), [Quartz](https://qz.com/deepseek-api-price-increase-v4-peak-off-peak-081326)), effective 16:00 UTC on 16 August 2026.

The weekend exemption — Saturday and Sunday billed entirely at off-peak rates from 00:00 Beijing time on 23 August 2026 — is reported by [Bloomberg](https://www.bloomberg.com/news/articles/2026-08-23/deepseek-ends-weekend-peak-pricing-for-api-users-from-today), [PANews](https://panews.io/articles/01a029b2-36f8-7768-91d8-15610f395a0b) and [36Kr](https://eu.36kr.com/en/p/3951308056099972).

Every entry in the catalogue carries its source and effective date in the code, and the UI prints them. The launch-week seven-day scheme is kept in the catalogue as a selectable model so you can measure what the amendment is worth on your own traffic.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
