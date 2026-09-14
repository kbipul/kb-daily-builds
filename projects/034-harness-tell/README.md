<div align="center">

# Harness Tell — Every Hub Request Says Which Agent Runs You. Sometimes It's Just Your Terminal.

**Since 10 September 2026, `huggingface_hub` stamps `agent/<harness>` on every request to the Hub. The list it matches against is fetched from the Hub each day, so the wheel you installed cannot tell you what it will report tomorrow, and one entry on that list is a terminal emulator. Lay out your environment and watch what leaves the process, in order, and which of the three kill switches stops it.**

[![CI](https://github.com/kbipul/harness-tell/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/harness-tell/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/harness-tell/)

`Day 034` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Run `hf download sentence-transformers/all-MiniLM-L6-v2 model.safetensors` from a Warp terminal on `huggingface_hub` 1.30 and you get 42 bytes of output: `path=/tmp/x/model.safetensors`. No progress bar, no colour. Run the same command with `TERM_PROGRAM` unset and you get the bar. That is the reproduction in [huggingface_hub issue #4860](https://github.com/huggingface/huggingface_hub/issues/4860), filed against 1.30.0 on macOS 15.7.5, and the cause is one line in a registry file: the `warp` harness is keyed on `TERM_PROGRAM=WarpTerminal`, which Warp sets in every shell whether or not its Agent Mode is driving anything. The CLI decided a human was an agent and switched to machine-readable output. The same decision put `agent/warp` in the User-Agent of every request that person made to the Hub.

Two days after v1.31.0 shipped (10 September), a network-traffic audit posted to r/LocalLLaMA found the wider mechanism: the SDK underneath `transformers`, `diffusers`, `sentence-transformers`, `faster-whisper` and `datasets` checks the environment for markers of 26 AI coding agents and tags every Hub call with the one it finds. It was the top AI story of 13 September. Most of the reaction was about the fact of it.

I read the code instead, and the fact is the least interesting part. The list of 26 is not in the package. Since v1.19.0 (11 June) the client fetches it from `https://huggingface.co/api/agent-harnesses`, caches it at `$HF_HOME/.agent_harnesses.json` for 24 hours, and matches against whatever it got. `HF_HUB_DISABLE_TELEMETRY` removes the `agent/` segment from the header and does nothing to that fetch on the CLI path, because the CLI uses the same detector to pick its output mode before any command runs. And the registry's own schema promises a `<prefix>*` matching rule that the Python client's test suite says is "intentionally not implemented yet".

Harness Tell is a simulator built from a line-for-line port of the two code paths involved. Pick an environment, or paste `env | cut -d= -f1`, pick what your process does, flip the switches, and it shows you the registry resolution, the environment read, the exact `User-Agent` string as `_http_user_agent` assembles it, and every side effect beyond the header, with the file and line for each step. There is no model in it and it makes no requests.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by CI on a GitHub runner and committed back to this repo minutes after publish; the build sandbox has no browser. If you are reading this in the first few minutes after release, it may not have landed yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/harness-tell/)** runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/harness-tell.git
cd harness-tell
npm ci
npm test        # 89 tests
npm run dev     # http://localhost:5173/harness-tell/
```

To check your own machine rather than a preset, run `env | cut -d= -f1` and paste the names. Two registry entries need an exact value (`TERM_PROGRAM=WarpTerminal` and `VTCODE=1`); every other pattern means "set to anything". Values whose name looks like a credential are blanked on paste.

## How it works

`src/engine/detect.ts` is `detect_agent` and `_env_vars_match` from `huggingface_hub/utils/_detect_agent.py` at commit [`129bbb5`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_detect_agent.py) (11 September, the `main` behind v1.31.0). Two details are easy to get wrong and both are tested: the standard-var comparison is case-sensitive inside the harness loop and case-insensitive after it, and a `"foo*"` pattern only matches the literal string `foo*`. `src/engine/userAgent.ts` is `_http_user_agent` and `_deduplicate_user_agent` from [`_headers.py`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_headers.py). `src/engine/simulate.ts` is `_load_registry` plus the call graph: who calls the detector, from where, and whether a request can leave. The client's own test fixture is reproduced in `detect.test.ts`, so each behaviour the app claims has a Python twin.

The 26-entry list is [`agent-harnesses.ts` at `3edf1ba`](https://github.com/huggingface/huggingface.js/blob/3edf1ba36fe9f2db1e920bf86d7ae89fb5d369c2/packages/tasks/src/agent-harnesses.ts) in `huggingface.js`, the file the Hub serves, with insertion order preserved because order is the detection priority. The page cannot fetch the live list. It says so, takes a paste of `/api/agent-harnesses` (or of `$HF_HOME/.agent_harnesses.json`) instead, and diffs the paste against the snapshot. The pre-registry detector from commit `90a9805` is ported too, so the two eras can be run on the same environment.

The variable that matters is which code path reads your environment and what that path does next. The SDK path reads it inside `build_hf_headers`, which `hf_hub_download` calls at line 1005, before it checks the cache, so a fully cached model still runs detection. The CLI path reads it in `Output.__init__`, before any command, whatever the telemetry flag says. The timeline panel is that call graph as an ordered list, with the registry GET placed where it happens on a cold process with a stale cache: before the first model request.

```
env ──► detect_agent(registry) ──► agent/<id> ──► _http_user_agent ──► User-Agent
            ▲                          │
   /api/agent-harnesses (24h cache)    └──► Output.set_mode(auto) ──► no bars, no colour
```

## Build notes — what I learned

Three things went sideways before anything interesting happened. Deepening the `huggingface.js` clone to read the registry's commit history timed out twice in the sandbox, so the "when was each harness added" panel I had sketched was dropped and the history claim in this README rests on two pinned commits rather than a blame. `pip download` of thirteen wheels to read their dependency metadata also timed out; I switched to the PyPI JSON API for the eleven that had not finished. And the first smoke test returned HTTP `000` for every asset, which turned out to have nothing to do with the app: each shell call in the build sandbox runs in its own network namespace, so a preview server started in one call is unreachable from the next. Start the server and curl it in the same call and everything is 200. That one goes into the playbook.

I had assumed I would find a hardcoded tuple of agents, and I did, in the git history. Commit `6ab7274` (31 March) introduced it with sixteen entries. `90a9805` (20 April) made it seventeen. `69ef7d7` (11 June, released as v1.19.0) deleted the list in favour of the daily fetch, and the module docstring gives the reason plainly: so the list can be updated without a client release. Between the hardcoded era and the 11 September snapshot, `roo-code` disappeared, `gemini` was renamed `gemini-cli`, and ten entries arrived, `warp` and `zed` among them. Nobody upgraded anything for that to happen. The two eras also disagree about the same environment. With `AGENT=devin` and `CLAUDECODE=1` both set, 1.10 through 1.18 report `devin` because they checked the standard vars first; 1.19 onward reports `claude-code` because the harness vars now come first. There is a test for that and a preset.

The Warp thread ran alongside the build all day and rhymes with it. In #4860 the reporter had already traced the line, and the maintainer's reply asked whether Warp sets any variable that only appears in Agent Mode. The answer, after someone dumped the environment of a plain human Warp shell, was no: Agent Mode writes into the same running PTY as the person, so the command inherits the human's environment and there is nothing for a marker to hang on. A PR to remove the `warp` entry from the registry is open ([huggingface.js#2476](https://github.com/huggingface/huggingface.js/pull/2476)); the maintainer would rather Warp added a marker; the thread has no reply from Warp. As of this build the entry is still there. I do not have a view on which side should move. What I can say is that `cursor` has the same shape and the registry handles it by comment: `CURSOR_TRACE_ID` is inherited by every child of the editor's terminal, so `cursor` is kept last in the list and loses to any real agent launched from it. `warp` sits mid-list with no such protection, and `cursor-cli`, `zed`, `cursor` and `devin` all lose to a plain Warp shell. Test-pinned.

The kill-switch matrix corrected this README twice. My first draft said `HF_HUB_DISABLE_TELEMETRY` was the answer, and on the SDK path it does more than the docs promise: the detector is only called inside the telemetry check, so with the flag set the environment is never read for agent markers and the registry is never fetched. Then I wired the CLI path and found the opposite. `Output.set_mode(auto)` calls `is_agent()` unconditionally, so the daily GET still fires with telemetry off, and the CLI still goes into agent mode. `HF_HUB_OFFLINE` stops every request, but a stale cached registry still drives detection, so the CLI still goes agent-mode offline. Nothing short of unsetting the variable stops the environment being read. Each cell of that matrix is a test in `simulate.test.ts`.

I built a "what the variable identifies" column in the registry table (agent marker, terminal or editor, generic name) and labelled it as this project's judgement, because the registry has no such field and I did not want a reader to think Hugging Face published that classification. The evidence for each terminal row is a comment in the registry or the #4860 thread. The `AGENT` standard var is on the generic list for an obvious reason: any script that exports `AGENT=build-bot` is reported as `agent/unknown`.

Which libraries carry this in was checked rather than assumed. I read `Requires-Dist` from PyPI on the build day for thirteen packages. Twelve depend on `huggingface_hub` directly with floors low enough to resolve to 1.31.0. `whisperx` pins `<1.0.0`, so its users are untagged because of a version constraint, and the app models that. `trl` has no direct requirement and gets the client through `transformers`. A lockfile in your repo may pin something older; the app says so.

Two things are not verified from here. The live registry was not fetched, because the build sandbox cannot reach huggingface.co; the snapshot is from source control the day before the report surfaced, and the paste path exists for that reason. And nothing here models what the Hub does with the header. The docs describe it as attribution for a public agent-usage dataset, and the segment is visible in any proxy, so the word "silently" in the original report is doing more work than the code supports. What the code does support is narrower: the list of what you report lives on the server, changes daily, and can be a terminal emulator.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript 5 (strict, `noUnusedLocals`) |
| Build | Vite 6, `base: "/harness-tell/"` |
| Tests | Vitest 3: 73 node tests on the engine, 16 jsdom render tests |
| Runtime deps | none beyond React |

## Sources

- r/LocalLLaMA network-traffic audit, 12 Sep 2026, as summarised by [AI Weekly's daily edition for 13 Sep](https://aiweekly.co/ai-news-today), the signal this build rides.
- [`_detect_agent.py` @ 129bbb5](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_detect_agent.py) and [`_headers.py` @ 129bbb5](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_headers.py), the ported code; [`test_utils_detect_agent.py`](https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/tests/test_utils_detect_agent.py), the fixture reproduced here.
- [`agent-harnesses.ts` @ 3edf1ba](https://github.com/huggingface/huggingface.js/blob/3edf1ba36fe9f2db1e920bf86d7ae89fb5d369c2/packages/tasks/src/agent-harnesses.ts), the registry snapshot.
- [huggingface_hub issue #4860](https://github.com/huggingface/huggingface_hub/issues/4860) and [huggingface.js PR #2476](https://github.com/huggingface/huggingface.js/pull/2476), the Warp false positive and the proposed removal.
- [Hub docs — Agents](https://huggingface.co/docs/hub/agents-overview), how Hugging Face describes the registry and the attribution.
- PyPI `Requires-Dist` metadata, read 14 Sep 2026, for the thirteen packages in `src/engine/entryPoints.ts`.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
