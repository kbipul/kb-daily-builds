<div align="center">

# kb-agent-framework

**A minimal, typed, dependency-free agent runtime you can read in one sitting — tools, memory, a step-guarded ReAct loop, and a structured trace.**

[![CI](https://github.com/kbipul/kb-agent-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/kb-agent-framework/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea043)](https://kbipul.github.io/kb-agent-framework/)

`Day 21` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This week Microsoft turned agent-building into an official skill track: the new **AB-100 (Agentic AI Business Solutions Architect)** and **AB-620 (AI Agent Builder Associate)** certifications. This is the runtime under all of that jargon, stripped to its irreducible core. An agent is just a loop that asks a model what to do, runs the tool it asked for, feeds the result back, and repeats until the model answers or a step budget runs out.

`src/lib` is 810 lines of dependency-free TypeScript across ten files. A typed tool registry validates every call before it runs. Memory is split into an episodic transcript and a scratchpad. The loop is step-guarded and can't spin forever, and every thought, tool call, and observation lands in a structured trace. The same runtime drives the tests, a CLI example, and the live demo.

![Screenshot](docs/demo.png)

> The sandbox that builds this can't run a browser, so the screenshot above is captured by CI on a GitHub runner and committed within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/kb-agent-framework/)** runs fully in your browser, nothing to install, **no API key**. It drives the agent with a deterministic in-browser model so you can watch the ReAct loop stream one step at a time.

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

The model is a plug, not the framework. `Model` is a one-method interface (`decide(messages, tools) → tool_call | final`). The demo and tests use `RuleModel`, a deterministic rule-based planner that is honest about *not* being an LLM, which is what keeps them key-free and reproducible. `OpenAIModel` is a drop-in BYOK adapter (OpenAI or Azure OpenAI) that asks a real model for the same JSON envelope. Swapping brains changes nothing else.

A model can *ask* for anything. Only registered tools with well-typed, validated, coerced arguments ever execute, which makes `ToolRegistry` the safety boundary. Coercion is deliberate: `coerce()` in `src/lib/tools.ts` turns the string `"21"` into the number `21` because models emit numbers as strings, and raises `ToolValidationError` when it can't. The built-in `calculator` is a hand-written shunting-yard evaluator, **not `eval`**, precisely because "let the agent run code" is where things go wrong. There is a test named `rejects code / stray characters (no eval)` holding that line.

Every transition comes out as an event. The `Tracer` emits a typed `TraceEvent` for each thought, call, observation, error, and final answer. `App.tsx` renders that stream live in the browser and `examples/run.ts` prints it in the terminal. Tests read the same array: `emits a start event and an ordered trace` asserts that `trace[0].type` is `start` and that the timestamps come back sorted.

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

## What I learned building it

The hardest part of a "minimal" agent framework is deciding what to leave out. It's tempting to reach for a schema library, a prompt-template engine, a streaming abstraction. I forced a rule: zero runtime dependencies. The only entries under `dependencies` in `package.json` are `react` and `react-dom`, and those exist for the demo UI. That constraint turned out to be clarifying. It made the *shape* of an agent obvious, because there's nowhere to hide the loop. If you've ever wondered what LangChain or Semantic Kernel are doing at their core, it really is this loop; everything else is ergonomics and integrations layered on top.

The design decision I'm happiest with is making the model a one-method interface. Once `decide()` returns either "call this tool" or "here's the answer," the runtime doesn't care whether that decision came from GPT-4o or a 134-line rule engine. That's what let the live demo be key-free without being fake. `RuleModel` is a real, deterministic planner that plans tool calls from the task text, and the code says out loud that it isn't an LLM, both in the class docstring and in `readonly name = "rule-model (deterministic)"`. Reproducible tests and a public demo fell out of the same abstraction.

What I underestimated was error recovery. My first loop crashed the whole run when a tool threw. But a thrown tool error is exactly the kind of thing a competent agent should *recover* from, so now a validation failure or a division-by-zero comes back as an `ERROR: …` observation the model can read and correct on the next step. Testing that meant writing a deliberately "flaky" model that asks for `1/0` once, reads the error message off the transcript, and adapts. It's the fourth test in `agent.test.ts`, `recovers from a tool error by feeding it back`. Being able to inject pathological behavior on demand is where the model-as-plug design pays off, and the test right above it does the same trick in reverse: a `spinner` model that never finalizes, to prove `maxSteps` trips.

If I extended this, the two obvious moves are streaming token-level output from `OpenAIModel` and swapping `Memory`'s scratchpad for a vector store behind the same interface so recall becomes semantic. Both fit the existing shapes without touching the loop.

## What it won't do

"Minimal" is doing real work in that tagline, so here's the bill.

Tool parameters can be `"string"`, `"number"` or `"boolean"` and nothing else. That's the whole of `ParamType` in `src/lib/types.ts`. No objects, no arrays, no enums, no ranges, no defaults beyond `required: false`. A tool that wants a nested payload takes a string and parses it itself. `defineTool` is an identity function: it buys you type-checking at the definition site and does nothing at runtime.

One tool per step, always. `ModelResponse` is either a single `tool_call` or a `final`, so there's no parallel or batched calling, and no way for the model to ask for two lookups at once.

The recovery story is narrower than the previous section makes it sound. `this.tools.call()` runs inside a try/catch in `Agent.run()`; `this.model.decide()` does not. So a tool that throws becomes an observation, but an HTTP failure inside `OpenAIModel`, which throws `OpenAIModel: HTTP <status>` on any non-OK response, propagates straight out of `run()` to the caller. No retry, no backoff, no timeout, and no partial trace handed back.

Memory only grows. `Memory.transcript(n)` can cap history and keeps the leading system message when it does, but `Agent.run()` calls `this.memory.transcript()` with no argument on every step, so a long run sends the entire transcript each time. Nothing here manages a context window, counts tokens, or records cost. `TraceEvent` has no field for any of it.

The `search` tool is four hard-coded entries in a `CORPUS` object scored by keyword overlap. It exists so the browser demo has a retrieval tool with no network and no key, and the source comment says to replace the body with a vector store or web search behind the same `ToolSpec`.

The part I genuinely don't know is whether the JSON-envelope protocol survives contact with real models. `OpenAIModel` asks for a single JSON object and `parseEnvelope` digs it out of surrounding prose; when nothing parses, it falls back to treating the raw output as a final answer. That fallback has a test, `falls back to treating unparseable output as a final answer`, but every case in it is a string I wrote. `openai-model.test.ts` injects a `fetchImpl` returning a canned response, so CI never touches a real endpoint, and the live demo runs on `RuleModel`. How often a real model wanders off the envelope, and whether silently promoting its rambling to a final answer is the right move when it does, is unsettled. I'd want that answered before calling the BYOK path production-ready.

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
