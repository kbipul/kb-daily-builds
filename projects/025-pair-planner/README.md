<div align="center">

# PAIR Planner — Your Fleet Has Eight GPUs. The Router Can See Two.

**NVIDIA shipped PAIR on 3 September 2026 to turn every idle GPU on your network into one inference cluster. Lay out your actual machines and find out how many of them the scheduler is allowed to use, and what the rest are costing you in seconds.**

[![CI](https://github.com/kbipul/pair-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/pair-planner/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-76b900)](https://kbipul.github.io/pair-planner/)

`Day 25` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

NVIDIA released the beta of the Personal AI Router on 3 September 2026. It joins compatible Windows, macOS and Linux machines (RTX 20-series and newer, RTX PRO, DGX Spark, Apple M4 and above) into one pool, and spreads a lead agent's subagent calls across whichever of them is free, keeping the prompts on your own network. It proxies the Ollama or LM Studio you already run rather than replacing them.

The catch is in NVIDIA's own description of the scheduler. It will only hand a request to a machine that is **awake, running an engine, holding the requested model, and not already loaded up**. A gaming PC mid-session is ineligible. A closed laptop is ineligible. A desktop with Ollama running that never pulled the model you asked for is ineligible, and that one is invisible, because nothing about the machine looks wrong.

So the interesting question is not "how many GPUs do I have". It is "how many of them clear that bar tonight, and what is the gap worth". Describe your machines and the shape of your agent's work; the app simulates the schedule, draws which machines actually ran anything, and prices each idle one by re-running the scheduler with that machine brought in and everything else left alone.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI on a GitHub runner and committed back, so it appears a few minutes after publish. The build sandbox cannot run a browser.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/pair-planner/)** runs fully in your browser, nothing to install, no key.

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

The middle row is the one worth staring at. Four capable machines, nothing broken on any of them, and the run takes exactly as long as it would with the other three switched off. The gaming PC is being gamed on. The study desktop only ever pulled Phi-4 mini. The living-room mini PC never had an engine installed. The same hardware, made eligible, finishes in 8m 17s.

The third row is a different failure. The build server has 16 GB and the nightly policy check wants a 70B, so there is no single-machine baseline at all: PAIR is not making that run faster, it is the only reason it runs. `plan()` returns a speedup of 0 there rather than dividing by a shorter run that quietly skipped the hard job.

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

Jobs live in phases. Everything in phase N lands before phase N+1 begins, and inside a phase the jobs compete for machines. That is the fan-out/gather shape a lead agent actually has, and it is the reason a fleet has a ceiling: the serial head and tail do not care how many GPUs you own. A simulator without that barrier can post any speedup you ask for. `schedule()` in `src/engine/schedule.ts` resets every machine's free-at clock to the phase start, so no lane carries work across the boundary.

Cold loads are billed. A machine that was not already holding the requested model reads the weights into VRAM first, at `MODEL_LOAD_GBPS = 1.1` GB/s. That penalises exactly what a fleet does more of than a single machine, which is switching models, and leaving it out makes clusters look better than they are.

The per-machine price tags are counterfactuals rather than heuristics. "Waking this machine is worth 7m 42s" is the difference between two full schedules: one as configured, one with that single machine passed through `enableNode()` and every other machine untouched. The figures do not add up cleanly, and `computeFindings()` carries a comment saying so. Two machines each worth 40 seconds alone are frequently worth 45 together, because after the first one joins there is less work left to steal. The ceiling schedule is there to give the true combined number.

## Build notes

Eligibility, not silicon, is usually the binding constraint. That is the load-bearing finding, and I did not expect it to be this lopsided. On the `home-office` preset the fleet as configured is worth **nothing at all**, 38m 30s with four machines and 38m 30s with one, while the same four machines made eligible finish in 8m 17s. Free up the gaming PC and you get 28m 03s back. Pull two models onto the study desktop and you get 23m 23s back for a command that takes thirty seconds to type. Nobody is going to buy a GPU to fix that. The fix is a sleep policy and an `ollama pull`, and neither shows up on a hardware budget.

The office-fleet preset broke my comparison. It reported a speedup of 0.80, a cluster apparently *slower* than one machine, which is impossible under the model. The host holds 16 GB, the nightly policy check wants a 70B, and the solo schedule had quietly left that job unplaced, so I was dividing a full run by a shorter run that had skipped the expensive part. Arithmetic was not the problem. When the host cannot serve every job, the two schedules are not doing the same work and no ratio between them means anything. `plan()` now carries `soloFeasible`, zeroes the speedup when it is false, and exposes `headroom` instead, which is cluster against ceiling and so compares two schedules over an identical job set. It reads 2.09 on that preset. The test named `cannot run on the host at all, so no speedup is claimed` pins the behaviour. I would not have caught any of it if `studio-overnight` had not happened to contain a job its own host could not run.

Concurrency is the thing I nearly got wrong. My first cut let each machine run several requests at once as independent lanes, which is roughly how PAIR's "job load" filter reads. That silently doubles a machine's throughput for free, and real GPU batching is sublinear in a way I could not source a curve for. I took it out. Each machine now serves one request at a time, which understates the loaded machines and makes every cluster figure here conservative, an error in the direction that will not talk somebody into a purchase.

## Where I think this is wrong

The calibration preset is where the model gets checked against something outside itself, and it does not come out clean. NVIDIA published exactly two numbers for its IFA demo, 8m 48s on a three-device cluster against 18m 00s on a single machine, and nothing about the token counts, the models or the hardware. So I sized the jobs until the *solo* run landed on 18 minutes (18m 15s, within 5%, asserted) and then let the model predict the cluster time without touching it further. It says 7m 28s where NVIDIA measured 8m 48s: **18% optimistic**. That is an assertion in the tests rather than something I tuned away.

Where those 80 seconds go, I do not know. Router round-trips, engines that were not warm, a real job mix less even than mine: all plausible, none separable from two published wall-clocks and nothing else. That is the open question this repo cannot close. One vendor demo, one workload, one prediction that missed low. Whether the schedule model tracks a real fleet on real work is untested, and I would not spend money on these absolute numbers. If somebody publishes the workload I will find out.

The scheduler is greedy, longest job first, to the machine that finishes it soonest, and on machines of different speeds that carries no optimality guarantee at all. It is defensible here only because the headline compares two schedules built by the same rule, so a shared bias cancels. A branch-and-bound over a handful of machines would be tractable and would let me say how much the greedy choice costs. Right now I cannot.

The tokens/sec table is the softest thing in the repo. `PERF_INDEX_ERROR_BAND = 0.4`: public-benchmark-order estimates for 4-bit quantization, normalised so an RTX 4090 sits at 1.00, stated at ±40%, and I benchmarked none of it. `MODEL_LOAD_GBPS = 1.1` is the same kind of number, an NVMe-to-VRAM order of magnitude rather than a measurement, and it is the assumption most likely to be wrong on any given box: a model already in the page cache loads far faster, a cold spinning disk far slower. The entry to distrust most is DGX Spark, with 110 GB of unified memory and modest bandwidth, which is why it holds the 70B when nothing else can and is still one of the slower machines in the building. Rankings survive all of that error. Absolute wall clocks do not, and the app says so on screen rather than in a footnote.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Tests | Vitest 3. 47 cases: 18 on the scheduler, 11 on `plan()` and its counterfactual pricing, 18 on the presets. |
| Runtime | None. No API, no key, no network call. |

## Sources

- [NVIDIA PAIR Virtual Inference Router Expands Available Compute on Your Local Network](https://developer.nvidia.com/blog/nvidia-pair-virtual-inference-router-expands-available-compute-on-your-local-network/). The eligibility gates modelled here.
- [Personal AI Router for Local Inference](https://www.nvidia.com/en-us/ai-on-rtx/personal-ai-router/) on nvidia.com, for the supported hardware.
- [Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026](https://blogs.nvidia.com/blog/local-ai-ifa-next-gen-agents-nv-pair-rtx-spark/), where the 8m 48s and 18m demo figures come from.
- [Nvidia PAIR makes it easy to create a household data center](https://siliconangle.com/2026/09/03/nvidia-pair-makes-it-easy-to-create-a-household-data-center-for-running-agentic-ai-tasks/), SiliconANGLE, 3 Sep 2026.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
