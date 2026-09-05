<div align="center">

# Tool Caller — Validate & Repair an LLM's Function Calls Before They Run

**Paste the tool call a model just produced and watch it get checked against the tool's JSON Schema (hallucinated names, wrong types, bad enums, malformed JSON), then auto-repaired into a call that would actually run. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/tool-caller-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/tool-caller-ts/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-4f8cff)](https://kbipul.github.io/tool-caller-ts/)

`Day 16` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

The week I built this, GitHub trending filled up with agents that call tools: `openai/codex-plugin-cc`, `agentskills/agentskills`, `anthropics/claude-code`, `ChromeDevTools/chrome-devtools-mcp`. In the same stretch, [OpenAI paused a model](https://www.unite.ai/openai-paused-its-erdos-model-after-sandbox-escapes/) for acting outside its sandbox. The unglamorous truth is that most agent failures aren't dramatic escapes. They're **malformed tool calls**: a stringified number, a misspelled enum, a hallucinated tool name, JSON wrapped in prose.

Tool Caller is a client-side validator for exactly that failure. Paste the raw output a model emitted, pick nothing, and it recovers the JSON, matches the call to a tool, validates every argument against the tool's JSON Schema, tags each problem with a failure type from the tool-use taxonomy, and, where a fix is meaning-preserving, repairs it into a call that re-validates clean. The input can be a bare `{name, arguments}`, an OpenAI `tool_calls` block, an Anthropic `{name, input}`, or any of those fenced in prose.

It never guesses intent. An out-of-range number, or a missing field with no default, is reported as **invalid**, not silently patched.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured automatically by this repo's CI on a GitHub runner (the build sandbox can't run a browser) and committed to `docs/demo.png` a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/tool-caller-ts/)** runs fully in your browser, nothing to install. Click one of the seven built-in scenarios or paste your own model output.

```bash
git clone https://github.com/kbipul/tool-caller-ts.git
cd tool-caller-ts
npm ci
npm test        # 38 unit tests
npm run dev     # open the printed localhost URL
```

## How it works

Three deterministic stages, no model in the loop:

```
raw model text
   │  parse.ts      tolerant JSON recovery: strip fences, pull the {…} out of
   │                prose, fix trailing commas / unquoted keys / Python
   │                literals / single quotes / stringified arguments
   ▼
 ToolCall { name, arguments }
   │  validate.ts   match name to a tool (Levenshtein suggests near-misses),
   │                then hand the arguments to…
   ▼
 schema.ts          a small JSON-Schema validator → Finding[] + a repaired copy
   │                (type coercion, enum near-match, drop forbidden args, fill
   │                defaults). Range / length / pattern breaks are reported,
   ▼                never "fixed".
 verdict: valid | repairable | invalid   (+ the repaired call, re-checked clean)
```

Every finding carries one of seven failure types drawn from the tool-use error taxonomy in recent research (ToolCritic / ToolFailBench, 2026). They live in `types.ts` as the `FailureType` union: `unparseable`, `unknown_tool`, `missing_required`, `unexpected_arg`, `wrong_type`, `enum_violation`, `constraint_violation`.

The key honesty rule lives in `validate.ts`. `decideVerdict` proposes a verdict from the findings, but before the UI is allowed to say **repairable**, `validateArguments` runs again over the repaired arguments from scratch. If anything still errors, the verdict is downgraded to **invalid**. A green badge always means a genuinely runnable call.

## Build notes

The interesting design tension in a "repair" tool is knowing when *not* to. It's tempting to make every red turn green: clamp the 45°C thermostat down to the schema maximum of 30, coerce anything to anything. But a tool call is a statement of the model's intent, and a validator that fabricates intent is worse than useless in an agent loop, because it turns a catchable error into a silent wrong action. So I drew a hard line in `schema.ts`. A coercion happens only when it's information-preserving and reversible: `"2"` becomes `2`; `"buisness"` becomes `"business"`, a one-edit enum neighbour found by the hand-written `levenshtein` in `text.ts`; an argument the schema forbids gets dropped. Anything that requires guessing a value (an out-of-range number, a missing field with no default, a regex that doesn't match) is reported, and the call stays **invalid**. The taxonomy came straight from this week's tool-use-failure papers.

`parse.ts` grew the most. My first version just stripped code fences. Then real model outputs kept breaking it: trailing commas, `True`/`None`, single quotes, and OpenAI's habit of *stringifying* the arguments object so you have to parse twice. `looseParse` now applies one lenient transform at a time and re-tries `JSON.parse` after each, recording every fix as a note the UI shows ("had to clean the JSON: removed trailing commas, converted single quotes"). Recovering a call is not the same as the model having produced a valid one, and the notes are what keep those two apart on screen.

Of the 38 tests, the one I'd keep if I could keep only one is the last in `validate.test.ts`: *every repairable result actually re-validates clean*. It loops all seven scenarios, and for each **repairable** verdict it feeds the repaired call back through `validateRaw` and asserts the second verdict is `valid`. It caught two bugs where a "fix" left a nested problem behind.

What the tool can't see is anything outside a single call. Two entries in the taxonomy, *insufficient* and *redundant* tool calls, only exist across a sequence, so catching them needs a call-list view: paste a whole trajectory, flag the duplicate `get_weather`. That's the natural next build.

I also don't know how far the tolerant parser generalises. It handles the malformations I hit, and the seven scenarios in `src/data/tools.ts` are the ones that broke earlier versions, but that's my own pile of bad outputs, not a sample I could call representative. The JSON-Schema subset in `types.ts` is deliberately small too: no `oneOf`, `anyOf`, `$ref`, `patternProperties`. Point it at a real tool definition that uses those and it will validate against a schema it only partly understands, and I have no evidence yet about whether the coercion line still holds there.

## Stack

| Piece | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Tests | Vitest 2 (38 tests) |
| Deps | none at runtime; the validator is hand-written, zero libraries |
| Demo | GitHub Pages, 100% client-side |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
