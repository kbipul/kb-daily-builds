<div align="center">

# Agent Memory Inspector

**Microsoft Foundry just shipped editable agent memory to production. Paste an agent's memory store (procedural / user / session scopes) and get an instant hygiene report — expired TTLs, contradictions, scope leaks, candidate PII, duplicates — plus a retrieval simulation showing which memories a query would actually recall. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/agent-memory-inspector/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/agent-memory-inspector/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://kbipul.github.io/agent-memory-inspector/)

`Day 019` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This month Microsoft Foundry's Agent Service reached GA for **hosted agents**, and with it a **memory-management view**: agents now keep memory across three scopes — **procedural**, **user**, **session** — each with a time-to-live you can inspect and edit. The obvious next question for anyone shipping agents is the one nobody built a tool for: *is what my agents remember actually safe, fresh, and self-consistent?*

Agent Memory Inspector answers it. Paste a memory store as JSON and a deterministic rule engine flags nine classes of problem — **expired TTLs**, **stale** memories with no expiry, **scope leaks** (a durable fact trapped in session scope, or transient state wrongly persisted to user scope), **contradictions** (two memories asserting conflicting values for the same subject), **candidate PII/secrets**, **near-duplicates**, **missing provenance**, and **unbounded growth** — then grades the store A–F. A built-in **retrieval simulation** runs BM25 over the store for a query you type and shows the payoff: when the memories the agent would actually recall are expired or contradict each other, the answer is poisoned before the model even runs.

![Screenshot](docs/demo.png)

> The screenshot above is captured automatically by CI on a GitHub runner (the build sandbox has no browser) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/agent-memory-inspector/)** — runs fully in your browser, nothing to install. It opens on a messy support-agent store that grades **F**; switch to the healthy store to see an **A**.

```bash
git clone https://github.com/kbipul/agent-memory-inspector.git
cd agent-memory-inspector
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the Vitest suite
npm run build    # type-check + production build
```

## How it works

The whole thing is pure, deterministic TypeScript — no model, no network, no API key.

```
JSON store ──▶ parse + normalize ──▶ 9 detectors ──▶ findings ──▶ A–F grade
   (TTL / expiresAt resolved to        │
    absolute epochs)                    └──▶ BM25 retrieval sim ──▶ "poisoned recall" warnings
```

Three decisions worth calling out:

- **The schema mirrors the real primitive.** Records carry `scope` (procedural/user/session), `ttlSeconds` or `expiresAt`, `createdAt`, `source` and `tags` — the same shape Foundry's memory view exposes — so findings map onto something you can actually act on.
- **Contradiction detection is structural, not semantic.** It extracts `subject is/= value` and `X prefers value` assertions, normalizes the subject (drops articles and possessives so *"the user's timezone"* and *"user timezone"* collapse), and flags a subject that holds two different values across currently-valid memories. It never claims to understand meaning — every finding cites the memory ids that triggered it and is labelled a pattern match.
- **The retrieval sim turns findings into consequences.** A list of hygiene warnings is easy to ignore; *"the two memories your agent would recall for this query contradict each other"* is not. BM25 (k1=1.5, b=0.75) ranks the store, and the analysis cross-references the hits against the findings to surface expired, contradictory, or PII-carrying recalls.

## Build notes — what I learned

The trigger for this build was a Microsoft-stack signal, not a model release: Foundry's Agent Service hit GA for hosted agents in July 2026 and exposed an editable memory store with procedural/user/session scopes and TTLs. Every prior build in this week's agent arc looked at a single moment — Day 16 validated one tool call, Day 17 replayed one agent's reasoning loop, Day 18 traced coordination *between* agents. Memory is the axis none of them touched: it's the state an agent carries *between* runs, and it's exactly where quietly-wrong data accumulates.

The hard part was drawing the honesty line on contradiction detection. It's tempting to reach for embeddings and claim semantic understanding, but that would over-promise — an embedding model would happily "detect" contradictions that aren't there and miss ones that are, with no way for a user to see why. So I kept it deliberately structural: only `subject is value` / `prefers value` patterns, subject-normalized so real duplicates collapse, and every finding labelled a pattern match that cites its evidence. It catches the contradictions that matter in practice (timezone IST vs PST, language Hindi vs English, deployment target Azure vs AWS) without pretending to be something it isn't. That restraint is the whole point — an IT Director signing off on an agent needs a tool whose false-positive story it can explain, not a black box.

The scope-leak heuristic was the surprising one. The dangerous direction isn't the obvious one. Everyone worries about durable facts stored too narrowly (a preference trapped in session scope, forgotten next run) — but the quieter risk is *transient* state promoted to user scope, where "currently on a free trial" persists forever and the agent keeps acting on a fact that expired weeks ago. Modelling both directions, with plain-language phrase cues, made the tool feel like it understood how these stores actually rot.

One deliberate constraint shaped the fixtures: this repo runs a mechanical secret scan before every publish, so the PII/secret detector had to ship real capability (it matches `sk-`, `ghp_`, `AKIA`, `AIza` key formats) without ever embedding a literal secret in a committed file. The detector regexes are built so the source never contains a matching token, and the unit test constructs a fake key at runtime with `.repeat()`. The example stores demonstrate PII with an email, a phone number, and a Luhn-valid test card instead — provable, and safe to commit.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: /agent-memory-inspector/` for Pages) |
| Tests | Vitest — 50+ cases across parser, detectors, scoring, retrieval, examples |
| Retrieval | Okapi BM25, hand-written, no dependencies |
| Runtime deps | none beyond React — no model, no network, no API key |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
