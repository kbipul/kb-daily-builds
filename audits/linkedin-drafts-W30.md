# LinkedIn drafts — Week 2026-W30 (Days 12–19)

Nothing auto-posts. Pick one, edit in your own voice, add the repo/demo link, post manually.
All three avoid engagement claims (stars/traffic) — only ship-facts and lessons, which are verified.

---

## Draft A — the agents arc (recommended)

**Everyone is building AI agents. Almost no one is building the tools that inspect them after they break.**

So this week I built four, one a day, each one level up from the last:

→ **Tool Caller** — validates the function call a model just produced against the tool's JSON Schema, then repairs it. Hallucinated tool name, wrong type, bad enum → a call that would actually run.
→ **Agent Scratchpad** — replays an agent's Thought → Action → Observation loop step by step and flags eight failure classes: stuck loops, oscillation, out-of-toolset calls, ungrounded answers.
→ **Handoff Inspector** — takes a *multi-agent* trace and finds the failures single-agent tools miss: dropped handoffs, delegation loops, context lost between agents, duplicated work.
→ **Agent Memory Inspector** — audits the memory an agent carries *between* runs. Expired TTLs, contradictions, scope leaks, candidate PII — plus a retrieval sim that shows when the memories your agent would recall are already poisoned.

One tool call → one agent's loop → many agents' coordination → the memory underneath all of it.

Every one runs 100% in your browser, no API key, and ships with its tests green. Microsoft Foundry just made agent memory an editable production primitive this month — so the last one mirrors that exact schema.

The honest line I held on all four: they detect *structure*, not meaning. A contradiction check cites the two memory IDs that fired it; it never claims to understand what the agent "meant." That distinction is the whole job.

Which of the four would you actually use? Links in comments.

#AI #Agents #MachineLearning #Azure #BuildInPublic

---

## Draft B — India / Bhasha Detect (the "AI voice of India" lane)

**India's edge in AI isn't scale. It's languages.**

While the global frontier commoditises — trillion-parameter open weights shipping weekly — India's differentiation is covering 22 scheduled languages well. So on my flagship build day I shipped **Bhasha Detect**: paste text in any of India's 22 official languages (plus Hinglish) and watch it get identified by Unicode script + character n-grams, entirely in your browser. No API key, no data leaving your machine.

What I'm most proud of isn't the accuracy number. It's the **honesty tiers.** The tool tells you exactly what it can and can't confirm: *content-profiled* (confident), *script-identified* (narrowed), or *script-only* (this is Devanagari, but I won't guess Hindi vs Marathi from one line). It shows its own confusion matrix — 87.5% leave-one-out, with every error living inside a shared script, never across one.

A tool that admits the boundary of what it knows is more useful to a decision-maker than one that fakes confidence. That's the stance I want the Indian AI conversation to take.

88 tests, zero model download, instant load. Link in comments.

#AI #India #IndicNLP #MachineLearning #BharatGen

---

## Draft C — the thesis post (short, punchy)

**"Everyone builds the store. Nobody audits it."**

That sentence is turning into the theme of my daily builds.

Everyone ships RAG pipelines — few check the retrieved chunks for injection payloads. Everyone wires up agent tool-calls — few validate them before they run. This month Microsoft Foundry made agent *memory* a first-class production primitive: procedural, user, session, each with a TTL. Everyone will now build agent memory. Almost no one will audit it.

So I did. **Agent Memory Inspector**: paste an agent's memory store, get a hygiene report — expired TTLs, contradictions, scope leaks, candidate PII, duplicates — and a retrieval simulation that shows *which* memories a query would actually pull back. Because a contradiction only matters if the model would have recalled it. The answer gets poisoned before the model even runs.

Client-side, no API key, 58 tests green.

The gap between "can build" and "can operate safely in production" is where I want to live. Link below.

#AI #Agents #LLMOps #Azure #AISafety

---

## Notes for Bipul
- **Draft A** is the strongest for the AI/ML-leader positioning — it makes the *coherent weekly arc* legible, which is your best differentiator vs. one-off demo accounts.
- **Draft B** is your India-lane play; post it if you're leaning into the "authentic AI voice in India" goal this cycle.
- **Draft C** is the short, repostable thesis — good midweek filler between the bigger posts.
- Suggested cadence: A now, B in 2–3 days, C as a quick follow-up. Add the live demo GIF (`docs/demo.png`) to whichever you post.
