<div align="center">

# PAIR Planner — Your Fleet Has Eight GPUs. The Router Can See Two.

**NVIDIA shipped PAIR on 3 September 2026 to turn every idle GPU on your network into one inference cluster. Lay out your actual machines and find out how many of them the scheduler is allowed to use — and what the rest are costing you in seconds.**

[![CI](https://github.com/kbipul/pair-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/pair-planner/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-76b900)](https://kbipul.github.io/pair-planner/)

`Day 25` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

NVIDIA released the beta of the Personal AI Router on 3 September 2026. It joins compatible Windows, macOS and Linux machines — RTX 20-series and newer, RTX PRO, DGX Spark, Apple M4 and above — into one pool, and spreads a lead agent's subagent calls across whichever of them is free, keeping the prompts on your own network. It is not a new inference engine; it proxies the Ollama or LM Studio you already run.

The catch is in NVIDIA's own description of the scheduler. It will only hand a request to a machine that is **awake, running an engine, holding the requested model, and not already loaded up**. A gaming PC mid-session is ineligible. A closed laptop is ineligible. A desktop with Ollama running that never pulled the model you asked for is ineligible — and that one is invisible, because nothing about the machine looks wrong.

So the interesting question is not "how many GPUs do I have". It is "how many of them clear that bar tonight, and what is the gap worth". This tool answers it: describe your machines and the shape of your agent's work, and it simulates the schedule, draws which machines actually ran anything, and prices each idle one by re-running the scheduler with that machine brought in and everything else left alone.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI on a GitHub runner and committed back, so it appears a few minutes after publish. The build sandbox cannot run a browser.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/pair-planner/)** — runs fully in your browser, nothing to install, no key.

```bash
git clone https://github.com/kbipul/pair-planner.git
cd pair-planner
npm ci
npm test        # 47 tests
npm run dev     # http://localhost:5173/pair-planner/
```

## What the three presets say

Every number below is produced by the engine in this repo and asserted in [`src/__tests__/presets.test.ts`](src/__tests__/presets.test.ts), so the table fails the build if it stops being true.

| Preset | One machine | Fleet as configured | Every machine eligible | Machines that ran nothing |
|---|---|---|---|---|
| NVIDIA's IFA demo | 18m 15s | **7m 28s** (2.44×) | 7m 28s | 0 of 3 |
| Four machines, one eligible | 38m 30s | **38m 30s** (1.00×) | 8m 17s | 3 of 4 |
| Office fleet, after hours | impossible | **15m 29s** | 7m 24s | 5 of 7 |

The middle row is the one worth staring at. Four capable machines, nothing broken on any of them, and the run takes exactly as long as it would with the other three switched off — because the gaming PC is being gamed on, the study desktop only ever pulled Phi-4 mini, and the mini PC never had an engine installed. The same hardware, made eligible, finishes in 8m 17s.

The third row is a different failure. The build server has 16 GB and the nightly policy check wants a 70B, so there is no single-machine baseline at all: PAIR is not making that run faster, it is the only reason it runs. The tool refuses to print a speedup there rather than divide by a shorter run that quietly skipped the hard job.

## How it works

```
machines + jobs
     │
     ├── eligibility filter   awake? engine? model pulled? memory?
     │                        (all blockers collected, not just the first)
     ├── greedy schedule      per phase, longest job first,
     │                        to the machine that finishes it soonest
     └── three runs
           solo     everything on the host, in order
           cluster  your fleet exactly as described
           ceiling  every machine awake, engine on, models pulled where they fit
```

Three decisions carry the whole thing.

**Phases.** Jobs in the same phase are independent and compete for machines; a phase waits for the one before it. This is the fan-out/gather shape a lead agent actually has, and it is the reason a fleet has a ceiling: the serial head and tail do not care how many GPUs you own. Without it, a simulator can post any speedup you ask for.

**Cold model loads.** A machine that was not already holding the requested model pays to read the weights into VRAM first, at 1.1 GB/s. That penalises exactly what a fleet does more of than a single machine — switching models — and leaving it out makes clusters look better than they are.

**Counterfactual pricing.** "Waking this machine is worth 7m 42s" is not a heuristic. It is the difference between two full schedules: one as configured, one with that single machine enabled and every other machine untouched.

## Build notes — what I learned

The load-bearing finding is that eligibility, not silicon, is usually the binding constraint, and I did not expect it to be this lopsided. On the home-office preset the fleet as configured is worth **nothing at all** — 38m 30s with four machines, 38m 30s with one — while the same four machines made eligible finish in 8m 17s. Free up the gaming PC and you get 28m 03s back. Pull two models onto the study desktop and you get 23m 23s back for a command that takes thirty seconds to type. Nobody is going to buy a GPU to fix that, which is the point: the fix is a sleep policy and an `ollama pull`, and neither shows up on a hardware budget.

The office-fleet preset broke my comparison and taught me something. It reported a speedup of 0.80 — the cluster apparently *slower* than one machine — which is impossible under the model. The cause was that the host holds 16 GB, the nightly policy check wants a 70B, and the solo schedule had quietly left that job unplaced. I was dividing a full run by a shorter run that had skipped the expensive part. The fix is not arithmetic: when the host cannot serve every job, the two schedules are not doing the same work and no ratio between them means anything. `plan()` now carries `soloFeasible`, refuses to print a speedup when it is false, and exposes `headroom` (cluster against ceiling) instead, which compares two schedules that genuinely run the same job set. There is a test pinning it, and I would not have caught it if the office preset had not happened to contain a job its own host could not run.

The calibration preset is the honest part. NVIDIA published exactly two numbers for its IFA demo — 8m 48s on a three-device cluster against 18m 00s on a single machine — and nothing about the token counts, the models or the hardware. So I sized the jobs until the *solo* run landed on 18 minutes (it comes out at 18m 15s, within 5%, and there is a test on that), and then let the model predict the cluster time without touching it further. It says 7m 28s where NVIDIA measured 8m 48s: **18% optimistic**. I have left that in the tests as an assertion rather than tuning it away, because the discrepancy is the most useful thing the preset produces. My best guess at where it goes is router round-trips, engines that were not warm, and a real job mix less even than mine — but that is a guess, and if somebody publishes the workload I will find out.

The thing I nearly got wrong was concurrency. My first cut let each machine run several requests at once as independent lanes, which is roughly how PAIR's "job load" filter reads. That silently doubles a machine's throughput for free, and real GPU batching is sublinear in a way I could not source a curve for. I took it out. Each machine now serves one request at a time, which understates the loaded machines and makes every cluster figure here conservative — an error in the direction that will not talk somebody into a purchase.

What I would do differently: the scheduler is greedy — longest job first, to the machine that finishes it soonest — and on machines of different speeds that carries no optimality guarantee at all. It is defensible here only because the headline compares two schedules built by the same rule, so a shared bias cancels. A proper branch-and-bound over a handful of machines would be tractable and would let me say how much the greedy choice costs, which right now I cannot.

And the tokens/sec table is the softest thing in the repo. It is public-benchmark-order estimates for 4-bit quantization, normalised to an RTX 4090, stated at ±40%, and I benchmarked none of it. Rankings survive that error; absolute wall clocks do not, and the app says so on screen rather than in a footnote.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Tests | Vitest — 47 cases across the scheduler, the counterfactual pricing and the presets |
| Runtime | None. No API, no key, no network call. |

## Sources

- [NVIDIA PAIR Virtual Inference Router Expands Available Compute on Your Local Network](https://developer.nvidia.com/blog/nvidia-pair-virtual-inference-router-expands-available-compute-on-your-local-network/) — the eligibility gates modelled here
- [Personal AI Router for Local Inference — NVIDIA](https://www.nvidia.com/en-us/ai-on-rtx/personal-ai-router/) — supported hardware
- [Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026](https://blogs.nvidia.com/blog/local-ai-ifa-next-gen-agents-nv-pair-rtx-spark/) — the 8m 48s / 18m demo figures
- [Nvidia PAIR makes it easy to create a household data center — SiliconANGLE, 3 Sep 2026](https://siliconangle.com/2026/09/03/nvidia-pair-makes-it-easy-to-create-a-household-data-center-for-running-agentic-ai-tasks/)

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
