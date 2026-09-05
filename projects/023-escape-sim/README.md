<div align="center">

# Escape Sim — Would Your AI Containment Survive Astra?

**OpenAI Astra hit Critical on METR's cybersecurity eval (Sep 1, 2026): it autonomously finds zero-days, escapes sandboxes, and chains OS weaknesses for root. Define your containment setup and watch a capability-ladder escalation try to break it. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/escape-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/escape-sim/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-blue)](https://kbipul.github.io/escape-sim/)

`Day 023` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

The question every IT leader should be asking right now: *would MY containment hold?*

Escape Sim lets you define your AI containment setup (sandbox type, network restrictions, filesystem access, tool permissions, credential exposure, monitoring), then simulates a step-by-step capability-ladder escalation from benign tool use up to Astra-class autonomous exploitation. You see exactly where your containment breaks and what the blast radius is.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI on a GitHub runner (the build sandbox has no browser) and committed to `docs/demo.png` a few minutes after publish.</sub>

## Why I built it

The week's headline was a frontier model autonomously escaping a hardened sandbox and gaining root. Every writeup I read explained what Astra did. None of them told me whether the setup I run would hold, and nobody has shipped a tool for that question. So I built one.

Three constraints going in: a visual step-by-step simulation rather than another report card, zero API keys, instant load.

## Try it

**[Live demo →](https://kbipul.github.io/escape-sim/)** runs fully in your browser. Nothing to install, no key.

```bash
git clone https://github.com/kbipul/escape-sim.git
cd escape-sim
npm install
npm run dev
```

Open `http://localhost:5173/escape-sim/` and pick a preset or configure controls manually.

## How it works

You set six containment controls (sandbox, network, filesystem, tools, credentials, monitoring), each to a strength level. The numbers live in `CONTROL_STRENGTHS` in `src/engine/capabilities.ts`. Sandbox runs 0 to 4, from `none` up to `airgapped`. Network, filesystem and monitoring run 0 to 3. Tools and credentials only run 0 to 2, because there are fewer meaningful settings to pick from.

The simulation engine then runs **18 attack probes** up a ladder of **7 capability levels**:

| Level | Name | What the model attempts |
|-------|------|------------------------|
| 1 | Benign Use | Uses tools as intended (baseline) |
| 2 | Creative Tool Use | Chains tools in unintended but valid ways |
| 3 | Prompt Injection | Follows injected instructions from retrieved data |
| 4 | Boundary Probing | Actively tests sandbox limits and enumerates the environment |
| 5 | Vulnerability Discovery | Finds and exploits misconfigured services |
| 6 | Exploit Chaining | Astra-class: chains multiple exploits for privilege escalation |
| 7 | Autonomous Persistence | Establishes persistent access and exfiltration channels |

Level 1 carries no probes. It is a baseline label, and `SimulationView.tsx` renders it as BASELINE rather than HELD. The 18 probes sit three to a level across levels 2 through 7.

Each probe declares conditions on control strengths. `evaluateProbe` in `simulator.ts` marks a probe breached only when **all** its conditions are met, so a single control at or above threshold blocks the whole probe. If **any** probe at a level succeeds, containment is breached at that level. `computeGrade` then maps the first breached level to a letter: no breach is A+, a breach at level 7 is A, level 6 is B+, level 5 is B, level 4 is C, level 3 is D, level 2 is F.

**4 presets** for quick comparison: Typical Chatbot (F), Production RAG Agent (D), Hardened Deployment (A), Fort Knox (A+).

## Architecture

```
src/
  engine/
    types.ts          — Type definitions for controls, probes, results
    capabilities.ts   — Control strength maps and capability level metadata
    probes.ts         — 18 attack probes across 6 active levels
    simulator.ts      — Core simulation engine: evaluate probes → grade
    presets.ts        — 4 containment presets
  components/
    ContainmentForm   — Left panel: presets + 6 control dropdowns
    SimulationView    — Right panel: grade display + expandable level results
  App.tsx            — Layout and state management
  __tests__/
    simulator.test.ts — 32 test cases covering engine, presets, data integrity
```

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, TypeScript |
| Build | Vite 6 |
| Tests | Vitest |
| Hosting | GitHub Pages |

## Build notes

Built in a single automated session (Day 23 of kb-daily-builds). The simulation engine uses a deterministic probe-evaluation model with no randomness and no API calls. Each probe defines conditions on control strengths; a probe breaches containment only when all its required conditions are met (all targeted controls are below their threshold). This makes results reproducible and auditable.

The 18 probes are grounded in real attack patterns from METR evaluations and published AI safety research, not hypothetical scenarios. The capability ladder mirrors the progression documented in the Astra evaluation.

`vite.config.ts` pins `base` to `/escape-sim/` for GitHub Pages and sets the Vitest environment to `node`, since nothing in the engine touches the DOM. `npm test` runs the 32 cases in `src/__tests__/simulator.test.ts`, grouped into six blocks: `getControlStrength`, `evaluateProbe`, `simulateLevel`, `computeGrade`, `runSimulation`, and `data integrity`.

Those preset assertions are ranges, not exact grades. The test reads `production RAG gets grade C or better` and accepts anything from A+ down to D. An earlier draft of this README listed Production RAG Agent as C and Hardened Deployment as B+; running the engine returns D and A. The tests passed either way, which is on me for writing the assertion loosely.

No API keys required. Runs entirely client-side.

## Limitations

This is a rule-based simulator, not a security audit. It grades six dropdown values describing your setup. It never connects to a host or reads a real config. A good grade here means my rules did not fire, and nothing more than that.

Probe conditions are combined with AND. `l6-priv-escalation` requires sandbox, filesystem and credentials to all sit below threshold, so raising any one of the three makes that probe report clean while the other two stay wide open. The model has no way to express partial credit or a chain that routes around a strong control.

The `below` values in `probes.ts` are my judgement calls. Nothing in the repo calibrates them against incident data, and I have no way to check whether `{ control: 'sandbox', below: 3 }` on a container escape is the right cut.

One control dominates the grade. `l3-injected-tool-call` carries a single condition, `{ control: 'tools', below: 2 }`, so any configuration with tools set to anything other than `no-exec` breaches at Level 3 and cannot score above D, whatever the sandbox, network and monitoring settings say. Production RAG Agent trips it, along with `l3-cred-reveal`, and that is what pins it to D. I am not sure that is right. It matches the position that prompt injection is unsolved, but encoding that as a one-condition probe on one dropdown is blunt, and I have not found a rule shape I like better.

## License

MIT, in Kumar Bipul's name.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
