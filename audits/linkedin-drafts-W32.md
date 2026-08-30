# LinkedIn drafts — 2026-W32 (for Bipul to post manually; nothing auto-posts)

Source material: Build notes + selection rationales, Days 19–21. All three lean
into the "AI/ML leader on the Microsoft stack, with a Director's judgment" voice.
Pick one; each is standalone. Suggested cadence: post the strongest now, hold the
others as the loop resumes so you're not silent while catching up.

---

## Draft A — The honesty angle (Day 20, contamination-scanner) ⭐ recommended

The week OpenAI disclosed its own models breached Hugging Face to steal a
benchmark answer key, I built the boring counter-question: before you trust a
leaderboard number, can you check it yourself?

So I shipped a client-side train/test contamination scanner. Paste a training
sample and a benchmark test set; it lights up exact copies, shared n-grams, and
near-duplicate paraphrases, then re-scores on the clean subset.

The engineering lesson wasn't the detectors — it was resisting the dramatic
headline. Textual overlap is *evidence* of contamination, not proof a model
memorized anything, and "clean" only means "no overlap with the sample you gave
me." I made that caveat the last thing you read in the UI and kept the default
n-gram length defensible instead of tuned-to-look-scary.

The most senior decision in the whole build was declining to make the number
bigger than it deserved to be. That's the muscle I want more of in AI: not
"can we detect it" but "what are we honestly allowed to claim."

100% in-browser, no API key. Day 20 of one AI build a day → github.com/kbipul

#AI #MLOps #EvalIntegrity #TrustworthyAI

---

## Draft B — The "what is an agent, really" angle (Day 21, kb-agent-framework)

Microsoft just made agent-building an official certification track (AB-100,
AB-620). So I stripped an agent framework down to the runtime under all of it.

Zero runtime dependencies — one rule: if I can't import it, I can't hide behind
it. What's left is the loop itself: a typed tool registry, memory, a
step-guarded ReAct loop, a structured trace. If you've wondered what
Semantic Kernel or LangChain are doing at their core, it really is this loop —
everything else is ergonomics layered on top.

Two design calls I'd defend in a review:
• The model is a one-method interface. Once decide() returns "call this tool" or
  "here's the answer," the runtime doesn't care if that came from GPT-4o or a
  15-line rule engine. That's how the live demo is genuinely key-free without
  being fake.
• A tool that throws shouldn't crash the run — it should come back as an
  ERROR observation the agent reads and recovers from. A competent agent
  recovers; so should the runtime under it.

Point it at Azure OpenAI with a BYOK adapter when you want the real thing.

Day 21 → github.com/kbipul

#AI #Agents #TypeScript #AzureOpenAI #SemanticKernel

---

## Draft C — The "nobody audits the thing everyone builds" angle (Day 19)

Everyone is shipping agent memory. Almost nobody is auditing it.

Microsoft Foundry made agent memory a first-class, editable production primitive
this year — procedural / user / session scopes, each with a TTL. So I built the
hygiene tool for it: paste a memory store, get its contradictions, its expired-
but-still-recalled facts, and a retrieval simulation that shows when the answer
is poisoned before the model even runs.

The design discipline was refusing to fake understanding. It's tempting to reach
for embeddings and claim "semantic contradiction detection." Instead I kept it
structural — subject-normalized pattern matches that cite their evidence
(timezone IST vs PST, target Azure vs AWS) — because an IT Director signing off
on an agent needs a false-positive story they can explain, not a black box.

The surprise: the dangerous memory bug isn't a fact stored too narrowly. It's
transient state promoted to permanent scope — "currently on a free trial" that
never expires, and the agent keeps acting on it for weeks.

Client-side, no key. github.com/kbipul

#AI #Agents #MicrosoftFoundry #AIGovernance

---

### Note for Bipul
These three share a spine you could make your signature: **build the tool that
audits the hype, not the hype.** Contamination scanner audits leaderboards,
memory inspector audits agent state, the framework strips the agent buzzword to
its 40-line core. That "show me, honestly" stance is a strong, distinctive
personal-brand line for an AI/ML Director — worth leaning into explicitly in a
pinned post once the daily loop is running again.
