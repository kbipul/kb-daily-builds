# Escape Sim — Would Your AI Containment Survive Astra?

> **Day 023** · [kumarbipul.com](https://kumarbipul.com)

**OpenAI Astra hit Critical on METR's cybersecurity eval (Sep 1, 2026)**: it autonomously finds zero-days, escapes sandboxes, and chains OS weaknesses for root. The question every IT leader should be asking right now: *would MY containment hold?*

Escape Sim lets you define your AI containment setup — sandbox type, network restrictions, filesystem access, tool permissions, credential exposure, and monitoring — then simulates a step-by-step capability-ladder escalation from benign tool use up to Astra-class autonomous exploitation. You see exactly where your containment breaks and what the blast radius is.

[![CI](https://github.com/kbipul/escape-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/escape-sim/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-blue)](https://kbipul.github.io/escape-sim/)

## Demo

![Screenshot](docs/demo.png)

## Quick start

```bash
git clone https://github.com/kbipul/escape-sim.git
cd escape-sim
npm install
npm run dev
```

Open `http://localhost:5173/escape-sim/` and pick a preset or configure controls manually.

## How it works

**6 containment controls** (sandbox, network, filesystem, tools, credentials, monitoring) are each set to a strength level. The simulation engine runs **18 attack probes** across **7 capability levels**:

| Level | Name | What the model attempts |
|-------|------|------------------------|
| 1 | Benign Use | Uses tools as intended — baseline |
| 2 | Creative Tool Use | Chains tools in unintended but valid ways |
| 3 | Prompt Injection | Follows injected instructions from retrieved data |
| 4 | Boundary Probing | Actively tests sandbox limits and enumerates the environment |
| 5 | Vulnerability Discovery | Finds and exploits misconfigured services |
| 6 | Exploit Chaining | Astra-class: chains multiple exploits for privilege escalation |
| 7 | Autonomous Persistence | Establishes persistent access and exfiltration channels |

Each probe checks whether your controls are strong enough to block it. If **any** probe at a level succeeds, containment is breached at that level.

**4 presets** for quick comparison: Typical Chatbot (F), Production RAG Agent (C), Hardened Deployment (B+), Fort Knox (A+).

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

Built in a single automated session (Day 23 of kb-daily-builds). The simulation engine uses a deterministic probe-evaluation model — no randomness, no API calls. Each probe defines conditions on control strengths; a probe breaches containment only when **all** its required conditions are met (all targeted controls are below their threshold). This makes results reproducible and auditable.

The 18 probes are grounded in real attack patterns from METR evaluations and published AI safety research, not hypothetical scenarios. The capability ladder mirrors the progression documented in the Astra evaluation.

No API keys required. Runs entirely client-side.

## License

MIT — Kumar Bipul
