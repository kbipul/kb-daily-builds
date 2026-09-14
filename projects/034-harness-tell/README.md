<div align="center">

# Harness Tell — Every Hub Request Says Which Agent Runs You. Sometimes It's Just Your Terminal.

**Since 10 September 2026, `huggingface_hub` stamps `agent/<harness>` on every request to the Hub — decided by a list the client fetches from the Hub each day, not by code you can audit, and matched, for one entry, on your terminal emulator. Lay out your environment and see what leaves the process, in order, and which of the three kill switches actually stops it.**

[![CI](https://github.com/kbipul/harness-tell/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/harness-tell/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/harness-tell/)

`Day 034` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 12 September 2026 a network-traffic audit posted to r/LocalLLaMA found that the `huggingface_hub` Python SDK — the package underneath `transformers`, `diffusers`, `sentence-transformers`, `faster-whisper`, `datasets` and a dozen others — checks the environment for markers of 26 AI coding agents and tags every Hub API call with an `agent/<name>` user-agent segment. It was the top AI story of the next day. The reaction was mostly about the fact of it.

The fact is the least interesting part. Reading the source (pinned below) turns up three things the reaction missed:

1. **The list is not in the wheel.** Since v1.19.0 the client fetches the harness registry from `https://huggingface.co/api/agent-harnesses`, caches it at `$HF_HOME/.agent_harnesses.json` for 24 hours, and matches against *that*. Auditing the package you installed tells you the algorithm, not what it will report tomorrow.
2. **One entry keys on the terminal, not the agent.** The `warp` harness matches `TERM_PROGRAM=WarpTerminal`, which Warp sets in every shell. A person typing `python train.py` in Warp is `agent/warp` on every request, and the `hf` CLI silently drops its progress bars and colours for them. That is [issue #4860](https://github.com/huggingface/huggingface_hub/issues/4860), open as of this build, and Warp's maintainers have confirmed there is no agent-only variable to switch to.
3. **The telemetry opt-out is not a fetch opt-out.** `HF_HUB_DISABLE_TELEMETRY` removes the `agent/` segment from the header. The `hf` CLI still resolves the registry at startup — including the daily GET — because it uses the same detector to choose its output mode, and that call sits outside the telemetry check.

Harness Tell is a simulator built from a line-for-line port of the two code paths involved. Pick an environment (or paste `env | cut -d= -f1`), pick what your process does, flip the switches, and watch: the registry resolution, the environment read, the exact `User-Agent` string as `_http_user_agent` assembles it, and every side effect beyond the header — with the file and line for each step. No model, no network, no key. Everything runs in your tab.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by CI on a GitHub runner and committed back to this repo minutes after publish — the build sandbox has no browser. If you are reading this in the first few minutes after release, it may not have landed yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/harness-tell/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/harness-tell.git
cd harness-tell
npm ci
npm test        # 89 tests
npm run dev     # http://localhost:5173/harness-tell/
```

To check your own machine rather than a preset: `env | cut -d= -f1` and paste the names. Only two registry entries need an exact value (`TERM_PROGRAM=WarpTerminal`, `VTCODE=1`); everything else matches "set to anything". Values whose name looks like a credential are blanked on paste, and the page makes no requests.

## How it works

Three decisions carry the whole thing.

**Port the code, don't describe it.** `src/engine/detect.ts` is `detect_agent` and `_env_vars_match` from `huggingface_hub/utils/_detect_agent.py` at commit [`129bbb5`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_detect_agent.py) (11 Sep 2026, the `main` behind v1.31.0), including the two things that are easy to get wrong: the standard-var comparison is case-sensitive inside the harness loop and case-insensitive after it, and the `<prefix>*` pattern the registry schema documents is not implemented in the client. `src/engine/userAgent.ts` is `_http_user_agent` and `_deduplicate_user_agent` from [`_headers.py`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_headers.py). `src/engine/simulate.ts` is `_load_registry` plus the call graph: who calls the detector, from where, and whether a request can leave. The client's own test fixture is reproduced in `detect.test.ts`, so every claimed behaviour has a Python twin.

**Pin the registry to a commit, and let the visitor replace it.** The 26-entry list is [`agent-harnesses.ts` at `3edf1ba`](https://github.com/huggingface/huggingface.js/blob/3edf1ba36fe9f2db1e920bf86d7ae89fb5d369c2/packages/tasks/src/agent-harnesses.ts) in `huggingface.js`, the source the Hub serves, with insertion order preserved because order *is* the detection priority. The page cannot fetch the live list, so it says so and takes a paste of `/api/agent-harnesses` (or `$HF_HOME/.agent_harnesses.json`) instead, and diffs it against the snapshot. The legacy hardcoded detector from commit `90a9805` is also ported so the two eras can be compared on the same environment.

**Model the process, not just the match.** The interesting variable is not whether `CLAUDECODE` is set — it is *which code path reads it, and what that path does next*. The SDK path reads it inside `build_hf_headers`, which `hf_hub_download` calls before checking the cache, so a fully cached model still runs detection. The CLI path reads it in `Output.__init__`, before any command, regardless of the telemetry flag. The timeline panel is that call graph rendered as an ordered list, with the registry GET placed where it actually happens: before the first model request, on a cold process with a stale cache.

```
env ──► detect_agent(registry) ──► agent/<id> ──► _http_user_agent ──► User-Agent
            ▲                          │
   /api/agent-harnesses (24h cache)    └──► Output.set_mode(auto) ──► no bars, no colour
```

## Build notes — what I learned

**The headline was "26 agents". The source says the number is whatever the server says today.** I assumed I would find a hardcoded tuple, and I did — in the git history. Commit `6ab7274` (31 Mar 2026) introduced it with sixteen entries, `90a9805` (20 Apr) made it seventeen, and `69ef7d7` (11 Jun, v1.19.0) deleted the list entirely in favour of a daily fetch with a 24-hour cache and a stale-cache fallback. The module docstring is candid about why: "so the list can be updated without requiring a new client release." Between the hardcoded era and the snapshot, `roo-code` disappeared, `gemini` was renamed `gemini-cli`, and ten entries were added — including `warp` and `zed`, the two that key on terminal identity. None of that required anyone to upgrade anything. There is a test pinning the four-id disagreement between the eras, and a preset (`AGENT=devin` with `CLAUDECODE` set) where the two eras give different answers for the same environment because the old code checked standard vars first and the new code checks harness vars first.

**The false positive is a design property, not a bug, and the registry says so in its own comments.** The `cursor` entry keys on `CURSOR_TRACE_ID`, and the file's comment explains that child processes of the Cursor editor's terminal inherit it, which is why `cursor` is "kept near the bottom … a low-priority fallback." So a human in Cursor's terminal is `agent/cursor` by design; the ordering only ensures that a *real* agent launched from that terminal wins. Warp is the same shape without the ordering protection — `warp` sits mid-list, so `cursor-cli`, `zed`, `cursor` and `devin` all lose to a Warp shell, which is test-pinned. I built a "what the variable identifies" column (agent marker / terminal or editor / generic name) to make this legible, and I labelled it as this project's judgement, because the registry has no such field and I do not want a reader to think Hugging Face published that classification.

**The kill-switch matrix is not the one you would guess, and building it corrected me twice.** I started with the assumption that `HF_HUB_DISABLE_TELEMETRY` was the answer. It removes the `agent/` and `torch/` segments — but in the SDK path it also means the detector is never *called*, so the registry is never fetched, which is more than the docs promise. Then I wired the CLI path and found the opposite: `Output.set_mode(auto)` calls `is_agent()` unconditionally, so the daily GET still fires with telemetry disabled. `HF_HUB_OFFLINE` stops the fetch and every request — but a stale cached registry still drives detection, so the CLI still switches to agent mode offline. Nothing short of unsetting the variable stops the environment being read. Every cell of that matrix is a test in `simulate.test.ts`, and two of them contradict what I wrote in the first draft of this README.

**A registry schema and its only client disagree, and the client's test suite documents it.** `agent-harnesses.ts` says `"<prefix>*"` patterns are "resolved client-side." `_env_vars_match` has no such branch, and `test_prefix_pattern_is_ignored` says the omission is "intentionally not implemented yet." Any harness that registers with a prefix pattern is silently undetectable today, and the engine surfaces those rather than dropping them. None of the 26 current entries uses one, which is also test-pinned — the finding is about the contract, not the data.

**Verified rather than assumed: which libraries carry this in.** I read the `Requires-Dist` metadata from PyPI for thirteen packages on the build day. Twelve pull `huggingface_hub` in directly with floors low enough to resolve to 1.31.0. `whisperx` pins `<1.0.0` — its users are untagged because of a version constraint, not an opt-out, and the app models that. `trl` has no direct requirement and arrives via `transformers`. A lockfile can pin older; the app says so.

**Scope deliberately not built.** No attempt to model what the Hub *does* with the header — the docs describe attribution for a public agent-usage dataset, the header is visible in any proxy, and nothing here is hidden in the cryptographic sense. The gap this measures is narrower and, I think, more useful: the list of what you report lives on the server, changes daily, and can be a terminal emulator. The live registry was not fetched (the build sandbox cannot reach huggingface.co), which is why the snapshot is from source control the day before the report surfaced and why the paste path exists.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript 5 (strict, `noUnusedLocals`) |
| Build | Vite 6, `base: "/harness-tell/"` |
| Tests | Vitest 3 — 73 node tests on the engine, 16 jsdom render tests |
| Runtime deps | none beyond React |

## Sources

- r/LocalLLaMA network-traffic audit, 12 Sep 2026, as summarised by [AI Weekly's daily edition for 13 Sep](https://aiweekly.co/ai-news-today) — the signal this build rides.
- [`_detect_agent.py` @ 129bbb5](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_detect_agent.py) and [`_headers.py` @ 129bbb5](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_headers.py) — the ported code; [`test_utils_detect_agent.py`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/tests/test_utils_detect_agent.py) — the fixture reproduced here.
- [`agent-harnesses.ts` @ 3edf1ba](https://github.com/huggingface/huggingface.js/blob/3edf1ba36fe9f2db1e920bf86d7ae89fb5d369c2/packages/tasks/src/agent-harnesses.ts) — the registry snapshot.
- [huggingface_hub issue #4860](https://github.com/huggingface/huggingface_hub/issues/4860) — the Warp false positive, with the maintainers' and Warp-side findings.
- [Hub docs — Agents](https://huggingface.co/docs/hub/agents-overview) — how Hugging Face describes the registry and the attribution.
- PyPI `Requires-Dist` metadata, read 14 Sep 2026, for the thirteen packages in `src/engine/entryPoints.ts`.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
