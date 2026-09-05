<div align="center">

# Agent Memory Inspector

**Microsoft Foundry just shipped editable agent memory to production. Paste an agent's memory store (procedural / user / session scopes) and get an instant hygiene report — expired TTLs, contradictions, scope leaks, candidate PII, duplicates — plus a retrieval simulation showing which memories a query would actually recall. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/agent-memory-inspector/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/agent-memory-inspector/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://kbipul.github.io/agent-memory-inspector/)

`Day 019` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This month Microsoft Foundry's Agent Service reached GA for **hosted agents**, and with it came a **memory-management view**. Agents now keep memory across three scopes, **procedural**, **user** and **session**, each with a time-to-live you can inspect and edit. The obvious next question for anyone shipping agents is the one nobody built a tool for: *is what my agents remember actually safe, fresh, and self-consistent?*

Agent Memory Inspector answers it. Paste a memory store as JSON and a deterministic rule engine flags nine classes of problem: **expired TTLs**; **stale** memories with no expiry; **scope leaks** in both directions (a durable fact trapped in session scope, or transient state wrongly persisted to user scope, which is why nine classes come out of eight detector functions); **contradictions**, where two memories assert conflicting values for the same subject; **candidate PII/secrets**; **near-duplicates**; **missing provenance**; and **unbounded growth**. It then grades the store A–F. A built-in **retrieval simulation** runs BM25 over the store for a query you type and shows the payoff: when the memories the agent would actually recall are expired or contradict each other, the answer is poisoned before the model even runs.

![Screenshot](docs/demo.png)

> The screenshot above is captured automatically by CI on a GitHub runner (the build sandbox has no browser) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/agent-memory-inspector/)** runs fully in your browser, nothing to install. It opens on a messy support-agent store that grades **F**: 12 findings across 12 memories, a score of 1 out of 100, and eight of the nine detector classes firing. Switch to the healthy store to see an **A** at 100 with zero findings. A third bundled example, 60 un-pruned session turns, lands on a B and exists mainly to trip the growth detector.

```bash
git clone https://github.com/kbipul/agent-memory-inspector.git
cd agent-memory-inspector
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the Vitest suite
npm run build    # type-check + production build
```

## How it works

The whole thing is pure, deterministic TypeScript: no model, no network, no API key.

```
JSON store ──▶ parse + normalize ──▶ 9 detectors ──▶ findings ──▶ A–F grade
   (TTL / expiresAt resolved to        │
    absolute epochs)                    └──▶ BM25 retrieval sim ──▶ "poisoned recall" warnings
```

The schema mirrors the real primitive. Records carry `scope` (procedural/user/session), `ttlSeconds` or `expiresAt`, `createdAt`, `source` and `tags`, the same shape Foundry's memory view exposes, so findings map onto something you can actually act on. `parse.ts` resolves whichever expiry field is present into an absolute epoch; `expiresAt` wins when both are set.

Contradiction detection is structural. `extractAssertions` splits each memory on `.`, `;` and newlines, then pulls `<subject> is/are/=/: <value>` and `<x> prefers <value>` out of the clauses. It normalizes the subject, dropping articles and possessives so *"the user's timezone"* and *"user timezone"* collapse to one key. `detectContradictions` then flags any subject holding two different values across memories that are still live; expired memories are excluded on purpose, because an expired memory conflicting with a live one is an expiry problem. Every finding cites the memory ids that fired it and says in its own text that it is a pattern match, not a semantic judgement.

The retrieval sim is the part that turns findings into consequences. A list of hygiene warnings is easy to ignore. *"The two memories your agent would recall for this query contradict each other"* is harder to ignore. `bm25Rank` (k1=1.5, b=0.75, top five hits by default) ranks the store, and `simulateRetrieval` cross-references those hits against the findings to surface expired, contradictory, or PII-carrying recalls.

## Build notes

The trigger for this build was a Microsoft-stack signal rather than a model release. Foundry's Agent Service hit GA for hosted agents in July 2026 and exposed an editable memory store with procedural/user/session scopes and TTLs. Every prior build in this week's agent arc looked at a single moment. Day 16 validated one tool call. Day 17 replayed one agent's reasoning loop. Day 18 traced coordination *between* agents. Memory is the axis none of them touched: it is the state an agent carries *between* runs, and it is exactly where quietly-wrong data accumulates.

The hard part was drawing the honesty line on contradiction detection. Embeddings were the tempting route, and they would have over-promised: an embedding model will happily "detect" contradictions that aren't there and miss ones that are, with no way for a user to see why, and an IT Director signing off on an agent needs a tool whose false-positive story they can explain. So I kept it deliberately structural. Only `is`/`=`/`prefers` patterns, subject-normalized so real duplicates collapse, every finding labelled and carrying its evidence. On the bundled messy store that catches two genuine conflicts: preferred language Hindi vs English, and timezone IST vs PST.

The scope-leak heuristic was the surprising one, because the dangerous direction turned out to be the unobvious one. Everyone worries about durable facts stored too narrowly, a preference trapped in session scope and forgotten by the next run. The quieter risk runs the other way. Transient state gets promoted to user scope, "currently on a free trial" persists forever, and the agent keeps acting on a fact that expired weeks ago. `detectScopeLeaks` models both directions off two phrase lists in `detectors.ts`: `DURABLE_RE` (prefers, always, never, timezone is, based in, works at) and `EPHEMERAL_RE` (currently, right now, today, temporarily, at the moment). Each direction emits its own id, `scope-durable-in-session` and `scope-ephemeral-in-user`.

One constraint shaped the fixtures. This repo runs a mechanical secret scan before every publish, so the PII/secret detector had to ship real capability (it matches `sk-`, `ghp_`, `AKIA` and `AIza` key formats) without any committed file containing a literal secret. The regexes in `detectors.ts` are assembled from string fragments so the source never holds a matching token, and the unit test builds a fake key at runtime as `"sk-" + "A".repeat(24)`. The example stores demonstrate PII with an email, a phone number, and a Luhn-valid test card instead.

## What it will miss

Contradiction detection only fires on clauses shaped like `<subject> is/are/=/: <value>` or `<x> prefers <value>`, with the subject capped at six words and the value at 40 characters. A store that phrases the same conflict any other way walks straight past it. I have no measurement of how much that leaves uncovered, and the fixtures in this repo are ones I wrote, so they are not evidence either way.

The scope-leak cues are two fixed regexes. I wrote them by reading example memories rather than by sampling real stores. A store worded differently gets a clean bill of health it may not have earned.

The thresholds in `DEFAULT_OPTIONS` are choices I made by eye: `staleDays: 90`, `dupThreshold: 0.8` (Jaccard over unique token sets), `recordCap: 40`, `tokenCap: 6000`. The grading in `score.ts` is the same kind of choice: 15 points off per high-severity finding, 7 per medium, 2 per low, capped at 30 per detector class so one repeated issue cannot sink the whole score on its own. Whether that ranking matches how anyone else would rank these problems is genuinely open. The messy fixture lands on 1 out of 100, which reads dramatically and may well be harsher than the store deserves.

Two smaller gaps. Token counts come from `estimateTokens`, which is `length / 4` rather than a real BPE tokenizer, so the `tokenCap` numbers are order-of-magnitude only. And there is no Foundry connector: the schema mirrors the primitive, but you paste the JSON in by hand. `now` defaults to `2026-07-26` so the bundled examples tell a consistent story, and the app lets you move it.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: /agent-memory-inspector/` for Pages) |
| Tests | Vitest, 50+ cases across parser, detectors, scoring, retrieval, examples |
| Retrieval | Okapi BM25, hand-written, no dependencies |
| Runtime deps | none beyond React |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
