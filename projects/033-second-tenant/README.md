<div align="center">

# Second Tenant

**Is someone else spending your API key?**

[![CI](https://github.com/kbipul/second-tenant/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/second-tenant/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-4aa8ff)](https://kbipul.github.io/second-tenant/)

`Day 033` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Anthropic's September 2026 threat report (published 10 September, 154 pages) put a number
on something that had been anecdotal: compromised API keys, session tokens and devices have
"increasingly become the sole objective of multiple criminal groups." One hacktivist
campaign ran for a month entirely on stolen keys. The target has moved from your data to
your inference budget.

Second Tenant looks for that in the one artefact you already have: your usage export.
It clusters every request into two behavioural groups and then asks two separate
questions: is there a second workload here, and does it look like yours? Drop in a CSV,
get a verdict with the evidence behind it. Everything runs in the browser and the export
is never uploaded.

A detector that folds those two questions into one score fires on any traffic at 02:00
and tells you your own nightly batch job is an intruder. One of the three built-in
datasets is exactly that case. The test that covers it is named
`finds the nightly batch but declines to call it foreign`.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects cannot run a browser, so this screenshot is
captured by the repo's own CI on a GitHub runner and committed back — it appears within
a few minutes of the first publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/second-tenant/)** — runs fully in your browser,
nothing to install. Three datasets are built in: a healthy key, a leaked one, and a team's
own nightly batch job. Or paste your own export.

```bash
git clone https://github.com/kbipul/second-tenant.git
cd second-tenant
npm ci
npm test          # 65 tests
npm run dev       # http://localhost:5173/second-tenant/
npm run build     # production bundle in dist/
```

## How it works

```
usage export ──▶ parse ──▶ 2-means over ──▶ five signals ──▶ verdict
  CSV / JSON     (column    [hour, log in,   split into
                  aliases)   log out]        two families
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                   RHYTHM (is there a second workload?)      FINGERPRINT (is it yours?)
                   circadian · cadence · weekend              request shape · model mix
```

Rhythm and fingerprint are scored as two separate numbers. Rhythm establishes that two
workloads exist; fingerprint establishes whether the second one is a stranger. The comment
above the weights in `verdict.ts` gives the reason for keeping them apart: "Collapsing
these into a single score is how a detector ends up accusing a nightly batch summariser of
being an intruder." A high rhythm score with a low fingerprint score gets the headline
"A second workload — but it looks like yours", which is a different sentence from
"Two distinct workloads on this key".

The clustering gates its own evidence. 2-means always returns two groups, even when there
is only one workload, so the mean silhouette coefficient measures whether the split is
real and the rhythm score is multiplied by it. Strong per-signal scores across a boundary
the algorithm had to invent are worth nothing, and the UI shows the separation number so
you can see when that is happening. Two more guards: fewer than 40 requests, or a span
under three days, returns "Not enough data to judge" before anything is clustered, and a
split where the smaller group is under 5% of the rows is reported as "One workload" (the
test is `does not treat a handful of outliers as a second tenant`).

Cadence uses quartile dispersion. A job that runs nightly has one 23-hour gap for every
few dozen 70-second ones. A variance-based measure reads that tail as wild irregularity,
which is backwards for something running like clockwork. The interquartile spread ignores
the tail and describes the typical gap, which is what "scheduled" means. The bug this
replaced is in the build notes.

Everything is deterministic: same export, same verdict, no randomness anywhere, including
in the seeded fixture generator. `is unaffected by the order rows arrive in` runs the
leaked-key export reversed and expects the same verdict.

## Build notes — what I learned

The fixture that broke the first version was one I wrote to break it: a team's own 02:00
batch summariser, running on the same key. The first version had one score (five signals,
five weights, one number, three verdict bands), it passed its tests, and it called that
fixture a breach with high confidence.

That is the failure mode of every anomaly tool I have had to live with as an IT Director.
They fire on the nightly job, the quarterly close, the new starter in another timezone,
and after the third false positive nobody reads the alert. The fix here was noticing that
I had been asking one question when there were two: *are there two workloads* is a
clustering fact, and *is the second one yours* is an identity question, and rhythm
evidence can only answer the first. Splitting them turned a 31% "possible breach" into a
sentence that says what it means. Three tests now pin the batch fixture:
`still detects the odd rhythm of the nightly batch`,
`reports matching fingerprints for the nightly batch`, and
`scores the leaked key strictly higher than the nightly batch`.

The series has a standing carry-limit on security report cards. This one got past it by
being a detector over the visitor's own data.

The cadence bug was more embarrassing. I measured regularity with a coefficient of
variation, which is the obvious choice, and it ranked the metronomic squatter as *more*
irregular than the bursty humans: the first version scored the squatter at 0.22 on cadence
when it should have been near 1.00. The overnight gaps between scheduled sessions dominated
the variance. Quartile dispersion fixed it in four lines. The regression test,
`ignores the long gap between nightly sessions`, builds its gaps as "25 requests 70s apart,
then a 23h wait, repeated" and asserts that quartile dispersion comes out under 0.1 while
the coefficient of variation on the same series comes out above 2. `coefficientOfVariation`
is still in `stats.ts`, and the docstring on `cadenceSignal` in `signals.ts` still
describes the old measure.

What I would do differently: the clusterer is hard-wired to k=2, which is defensible for a
first cut (one key, one suspected squatter), but three tenants get reported as two with
one blended in. Choosing k by silhouette would be a small change and a more honest answer.
I would also like the timezone to be an input; hours are UTC as exported, so a distributed
team currently looks more suspicious than it is. The page says so under "What this cannot
tell you": "A team that works 09:00 IST is not a second tenant just because your other team
works in Seattle."

I wrote that limitations section before the UI, deliberately. This is a tool that produces
an accusation. Its first item is that it cannot prove a breach: "A globally distributed
team, a new CI pipeline, or a contractor onboarding all look the same from here." Its
second is that a patient attacker who mirrors your working hours and prompt sizes leaves
nothing here to find. It catches the common case, which is someone running a scheduled job
on a key they stole.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2 — 65 tests |
| Clustering | Hand-rolled deterministic 2-means + silhouette, no dependencies |
| Statistics | Circular mean, quartile dispersion, Jensen–Shannon divergence |
| Data | Seeded synthetic fixtures — no real usage data ships in this repo |

## Sources

- Anthropic, *Detecting and Countering Misuse of AI: September 2026* —
  <https://www.anthropic.com/threat-intelligence-report-september-2026>

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
