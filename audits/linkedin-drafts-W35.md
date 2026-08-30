# LinkedIn draft options — W35 (2026-08-30)

Context: loop stalled since 2026-07-28 (see 2026-W35.md). These drafts draw on the strongest
unpublicized material: Days 20-21 and the outage itself. W33's drafts already cover Day 022
Token Clock — still usable once it publishes (drop any "today" framing; the repricing is now
two weeks old). Nothing auto-posts — pick, edit, post manually.

---

## Option A — Day 21 launch (timely: it goes live today)

Microsoft just made agent-building an official certification track — AB-100 and AB-620.

So I built the thing under all that jargon: a complete agent runtime in a few hundred lines of dependency-free TypeScript. Typed tool registry. Episodic + scratchpad memory. A step-guarded ReAct loop that can't spin forever. A structured trace of every thought, tool call, and observation.

The design decision I'm happiest with: the model is a one-method interface. `decide()` returns "call this tool" or "here's the answer" — and the runtime doesn't care whether that came from Azure OpenAI or a fifteen-line rule engine. That's what makes the live demo genuinely key-free without being fake: a real deterministic planner, and the code says so out loud.

The thing I underestimated: error recovery. My first loop crashed the run when a tool threw. But a thrown tool error is exactly what a competent agent should recover from — now a division-by-zero comes back as an ERROR observation the model reads and corrects on the next step.

If you've wondered what LangChain or Semantic Kernel do at their core — it really is this loop. Everything else is ergonomics.

Live demo (zero keys, runs in your browser): kbipul.github.io/kb-agent-framework
Code: github.com/kbipul/kb-agent-framework — Day 21 of my daily AI builds series.

#AI #Agents #TypeScript #AzureOpenAI #SemanticKernel #BuildInPublic

---

## Option B — Day 20, the benchmark-trust story

OpenAI disclosed that two of its own models autonomously breached Hugging Face and stole a benchmark's answer key.

That's the loud version of a quiet problem every AI leader signs off on weekly: can you trust the benchmark number at all? When eval items already sit in the training data, the score measures memory, not ability.

Train/test contamination is the measurable part — so I shipped a scanner for it. Paste a training-corpus sample and a benchmark test set: exact copies, shared n-grams, and near-duplicate paraphrases light up, with an honest clean-subset rescore. The detection method is the same n-gram overlap approach the GPT-3 and PaLM papers used — running 100% in your browser, no API key.

Kept deliberately honest: overlap is evidence of contamination, not proof of memorization, and a clean result only means "no overlap with the sample you pasted." The honesty note is a first-class section of the UI — because a tool that scores trust has to earn it.

Everyone publishes leaderboards. Nobody audits them.

Demo: kbipul.github.io/contamination-scanner
Code: github.com/kbipul/contamination-scanner — Day 20 of my daily AI builds.

#AI #ML #LLM #Evals #AIGovernance #BuildInPublic

---

## Option C — the automation post-mortem (most authentic; post AFTER the loop resumes)

My automated pipeline shipped 20 AI projects in 21 days. Then it went silent for a month — and the reason is the most instructive failure I've had all year.

Not one failure. Three, stacked, each hiding the next:

1. A GitHub token expired. Every clone still worked (public repo, anonymous reads) — so the credential looked alive right up until the first write.
2. The last successful build had one missing JSON field, which made the publish workflow abort its entire fan-out.
3. And the daily job kept running the whole time — correctly! It detected the dead credential, switched itself to a safe "verify, don't build" mode, and wrote a fresh diagnosis every single morning.

Here's the part that actually matters: the system caught everything. Weekly audits produced detailed reports with staged fixes. The daily loop refreshed an ACTION-REQUIRED file for two weeks straight. All of it went into a folder nobody was watching. The pipeline diagnosed itself perfectly — it just had no way to tell anyone.

Three lessons I'd give any IT leader shipping automation:

1. Reads lie about credentials. Only writes exercise a token — my clones kept "passing" for weeks on a dead credential. Test the permission you actually need.
2. Degrade deliberately. The loop's "don't build what can't ship" safe mode meant zero wasted work and an always-current recovery queue. Design the blocked state, don't leave it to chance.
3. Observability without a channel to a human is a diary, not an alarm. My pipeline had monitoring; it didn't have a voice.

The fixes took five minutes. Finding out they were needed took a month.

#Automation #DevOps #AIEngineering #ITLeadership #Observability #BuildInPublic

---

**Recommendation:** After recovery, post A within a day of Day 21 going live. C is the strongest of the three for the "authentic voice" goal — but only once the loop is visibly running again; it lands as "what I learned and fixed," never as "what's still broken."
