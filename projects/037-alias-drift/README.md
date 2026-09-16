<div align="center">

# Alias Drift

**Is the model ID you call the model you get?**

[![CI](https://github.com/kbipul/alias-drift/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/alias-drift/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-live-4f8cff)](https://kbipul.github.io/alias-drift/)

`Day 37` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 10 September 2026, DeepSeek retired `deepseek-v4-flash` with no advance notice, the same day its replacement launched, and quietly routed the old ID to the new model instead of failing. A caller who never touched their code kept getting responses. Just not from the model they thought they were calling. That is one end of a spectrum running through every major provider, and most of it is invisible from inside your own application: a "pinned" model ID can mean "frozen forever, fails loudly on a published date" or "changes behavior overnight, forever, with nothing in your logs to show it," and the string in your config file looks identical either way.

This is a corpus of nine ways OpenAI, Anthropic, Google Gemini, Azure OpenAI and DeepSeek let you name a model, classified into four binding kinds by what actually happens on deprecation day, each one sourced to the provider's own docs. Pick a row, read the classification, then run the "Deprecation day" simulator and watch the three-beat outcome: steady state, the notice you do or don't get, and what a caller who does nothing would actually see.

## Try it

**[Live demo →](https://kbipul.github.io/alias-drift/)** — runs fully in your browser, nothing to install.

```bash
npm install
npm run dev      # local dev server
npm test         # 23 Vitest cases
npm run build    # production build
```

## How it works

Everything traces back to one typed corpus (`src/lib/corpus.ts`) of nine `IdentifierRow` entries, each carrying the exact provider example, its notice window, its documented post-event behavior, a source URL, and, for two rows, an explicit caveat where this project inferred something rather than quoting a guarantee. A small classification layer (`src/lib/simulate.ts`) turns any row into a three-step narrative purely by looking up its `bindingKind` in a four-entry table; the UI never invents wording per click, it only renders what the corpus already says.

```
IdentifierRow  →  BINDING_KINDS[bindingKind]  →  simulate()  →  three-beat timeline
  (sourced)         (this project's judgement)     (pure fn)      (rendered, not written live)
```

The four binding kinds are ordered by risk, and that ordering is the corpus's one falsifiable claim: `frozen-then-fails` (0) < `auto-upgrade-notice` (1) < `alias-repoint` (2) < `zero-notice-reroute` (3). An outright failure beats a silent change, and an announced change beats an unannounced one. A test pins the ordering itself, not just the individual scores, so a future edit can't quietly flatten it.

## Build notes: what I learned

The interesting finding did not come from the corpus I set out to write. It came from a category I tried to delete. My first draft wanted a clean "frozen forever" row for an Azure OpenAI deployment pinned to a specific version with auto-upgrade turned off, to sit alongside OpenAI's dated snapshots and Anthropic's dateless IDs. Microsoft's own docs say otherwise: "when the retirement date is reached the model will automatically upgrade to the default version at the time of retirement." Pinning a version in Azure delays the silent change, it doesn't prevent it: a manually pinned deployment eventually becomes whatever is current, with no failure step in between, which is a genuinely different failure mode from OpenAI or Anthropic, where a frozen ID just stops answering. I couldn't find one canonical Microsoft page stating that in exactly those words, only consistent Q&A-thread descriptions, so the row carries that caveat rather than a bare citation.

The test suite broke twice in ways that were more informative than annoying. `expect(...).toBeInTheDocument()` failed everywhere with `Invalid Chai property: toBeInTheDocument` until I remembered `@testing-library/jest-dom` needs an explicit setup file wired into `vite.config.ts`; copied the pattern from Day 010's `blast-radius`, which had already hit this. Then the render tests failed with "Found multiple elements with the text," which turned out to be the UI correctly doing its job: the same identifier string legitimately shows up in the row picker, the comparison table and the drift card at once, so the tests needed scoping (`within(table)`) rather than the corpus needing changing.

DeepSeek's own row carries a second-order wrinkle worth stating plainly: DeepSeek separately announced that every `deepseek-v4-pro` request would move to V4.1 Flash from 04:00 UTC on 14 September 2026, then the API docs reversed course and kept V4 Pro serving "in response to user demand." The retirement notice itself was retired. That is not modeled as a fifth binding kind, since the underlying behavior (no durable notice, silent routing) is identical either way. It is a reminder that reading the deprecation calendar correctly on the day it is published does not mean it holds.

Scope cut for time: xAI/Grok and Mistral are not in the corpus. I could not find documentation for either with the same clarity as the five providers here in one sitting, and a row built on a weaker source than the rest would have undermined the ones that are solid. Nine well-sourced rows beat eleven with two guesses in them.

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2 + Testing Library (23 cases: corpus integrity, simulation logic, render/interaction) |
| Demo | Static, client-side only: no API calls, no model, no key |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
