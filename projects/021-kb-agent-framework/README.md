<div align="center">

# kb-agent-framework

**A minimal, typed, dependency-free agent runtime you can read in one sitting — tools, memory, a step-guarded ReAct loop, and a structured trace.**

[![CI](https://github.com/kbipul/kb-agent-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/kb-agent-framework/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea043)](https://kbipul.github.io/kb-agent-framework/)

`Day 21` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This week Microsoft turned agent-building into an official skill track — the new **AB-100 (Agentic AI Business Solutions Architect)** and **AB-620 (AI Agent Builder Associate)** certifications. This is the runtime under all of that jargon, stripped to its irreducible core: an agent is just a loop that asks a model what to do, runs the tool it asked for, feeds the result back, and repeats until the model answers or a step budget runs out.

The whole framework is a few hundred lines of dependency-free TypeScript: a **typed tool registry** that validates every call before it runs, **episodic + scratchpad memory**, a **step-guarded loop** that can't spin forever, and a **structured trace** of every thought, tool call, and observation. The same runtime drives the tests, a CLI example, and the live demo.

![Screenshot](docs/demo.png)

> The sandbox that builds this can't run a browser, so the screenshot above is captured by CI on a GitHub runner and committed within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/kb-agent-framework/)** — runs fully in your browser, nothing to install, **no API key**. It drives the agent with a deterministic in-browser model so you can watch the ReAct loop stream one step at a time.

```bash
git clone https://github.com/kbipul/kb-agent-framework.git
cd kb-agent-framework
npm ci
npm test          # 30+ assertions across the runtime
npm run example   # run an agent end-to-end in the terminal (no key)
npm run dev       # the live trace playground on localhost
```

## How it works

```
task ─▶ model.decide() ─▶ tool_call ─▶ registry.call() ─▶ observation ─┐
           ▲                                                           │
           └──────────────── feed observation back ◀───────────────────┘
                      (until `final`, or maxSteps trips the guard)
```

Three decisions shape the design:

1. **The model is a plug, not the framework.** `Model` is a one-method interface (`decide(messages, tools) → tool_call | final`). The demo and tests use `RuleModel`, a deterministic rule-based planner that is honest about *not* being an LLM — that's what keeps them key-free and reproducible. `OpenAIModel` is a drop-in BYOK adapter (OpenAI or Azure OpenAI) that asks a real model for the same JSON envelope. Swapping brains changes nothing else.

2. **Tools are the safety boundary.** A model can *ask* for anything; only registered tools with well-typed, validated, coerced arguments ever execute. The built-in `calculator` is a hand-written shunting-yard evaluator — **not `eval`** — precisely because "let the agent run code" is where things go wrong.

3. **Every transition is an event.** The `Tracer` emits a typed `TraceEvent` for each thought, call, observation, error, and final answer. That single stream is what the browser renders live, what a CLI prints, and what a test asserts against.

```ts
import { Agent, ToolRegistry, RuleModel, builtinTools } from "kb-agent-framework";

const agent = new Agent({
  model: new RuleModel(),                 // ← swap for OpenAIModel (BYOK)
  tools: new ToolRegistry(builtinTools),
  maxSteps: 6,                            // the loop guard
});

const { answer, trace, halted } = await agent.run(
  "What is (12 + 8) * 3, and how many words are in 'agent tool loop'?"
);
```

Point it at a real model with your own key (kept in an env var, never in code):

```ts
import { OpenAIModel } from "kb-agent-framework";

const model = new OpenAIModel({
  apiKey: process.env.AZURE_OPENAI_KEY!,   // or OPENAI_API_KEY
  model: "gpt-4o-mini",                    // or your Azure deployment name
  baseURL: process.env.AZURE_OPENAI_ENDPOINT, // omit for OpenAI
  headers: { "api-key": process.env.AZURE_OPENAI_KEY! }, // Azure auth style
});
```

## Build notes — what I learned

The hardest part of a "minimal" agent framework is deciding what to leave out. It's tempting to reach for a schema library, a prompt-template engine, a streaming abstraction. I forced a rule: zero runtime dependencies. That constraint turned out to be clarifying — it made the *shape* of an agent obvious, because there's nowhere to hide the loop. If you've ever wondered what LangChain or Semantic Kernel are doing at their core, it really is this loop; everything else is ergonomics and integrations layered on top.

The design decision I'm happiest with is making the **model a one-method interface**. Once `decide()` returns either "call this tool" or "here's the answer," the runtime doesn't care whether that decision came from GPT-4o or a fifteen-line rule engine. That's what let the live demo be genuinely key-free without being fake: the `RuleModel` is a real, deterministic planner that plans tool calls from the task text — it just isn't an LLM, and the code says so out loud. Reproducible tests and a public demo fell out of the same abstraction for free.

The thing I underestimated was **error recovery**. My first loop crashed the whole run when a tool threw. But a thrown tool error is exactly the kind of thing a competent agent should *recover* from — so now a validation failure or a division-by-zero comes back as an `ERROR: …` observation the model can read and correct on the next step. Testing that meant writing a deliberately "flaky" model that asks for `1/0` once and then adapts, which is a nice illustration of why the model-as-plug design pays off: I can inject pathological behavior to test the runtime in isolation.

If I extended this, the two obvious moves are streaming token-level output from `OpenAIModel` and swapping `Memory`'s scratchpad for a vector store behind the same interface so recall becomes semantic. Both fit the existing shapes without touching the loop — which is the whole point.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript 5 (strict) |
| Runtime | Zero dependencies (React only for the demo UI) |
| Demo | React 18 + Vite, GitHub Pages |
| Tests | Vitest (runtime, tools, memory, tracer, both models) |
| Model adapters | Deterministic `RuleModel` (demo/tests) · `OpenAIModel` for OpenAI / Azure OpenAI (BYOK) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
