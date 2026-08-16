# LinkedIn drafts — W33 (2026-08-16)

Nothing auto-posts. Pick one, edit it in your own voice, post manually.

> ⚠️ **Drafts 1 and 3 reference repos that are not live yet.** Do not post them
> until the token is replaced and Day 021 / Day 022 have fanned out. Draft 2
> references no repo and can go out today.

---

## Draft 1 — **Token Clock / the India cost gap** ⭐ recommended

*Why this one: it is a specific, quantified, unpublished finding about Indian
engineering teams, it is timestamped to today, and it needs no self-promotion to
be interesting. This is the single best "authentic AI voice in India" post the
series has produced.*

> Today at 16:00 UTC, DeepSeek stops charging one price for a token.
>
> Its API moves to peak/off-peak pricing — expensive during 01:00–04:00 and
> 06:00–10:00 UTC, half price outside those windows. The headlines are reading
> this as "DeepSeek got more expensive."
>
> That is not the interesting part. The interesting part is that a token's price
> is now a function of *when* you send it. Every FinOps model I have seen —
> including the cost calculator I built myself a few weeks ago — assumes price
> is a function of *what* you send. That assumption expired this afternoon.
>
> So I built a tool to see what it means for us specifically, and the number
> surprised me:
>
> **An Indian SaaS workload lands 79.9% of its daily token spend inside the peak
> band.** Not because of anything the team did wrong. Because the peak windows
> are drawn around Beijing business hours, IST is 2.5 hours behind Beijing, and
> 11:30–15:30 IST therefore sits entirely inside a peak window.
>
> The identical traffic, identical volumes, read against a US Pacific clock:
> **53% cheaper.** $462 a day versus $708. The only variable is where the users
> are.
>
> This is the kind of cost asymmetry that does not show up in any pricing page,
> any comparison table, or any architecture review — and it arrived with zero
> code change on anyone's side. If you run inference for Indian users, some of
> your batch work is now worth moving. Some of it isn't, and pretending
> interactive traffic can be rescheduled is how savings decks become fiction.
>
> The tool is open source, runs entirely in your browser, no API key. Map your
> own hourly traffic, see your peak exposure, and see how much only the genuinely
> deferrable work could save.
>
> 🔗 https://kbipul.github.io/token-clock/
>
> Day 22 of shipping one AI project a day.

*Technical detail worth adding as a first comment (it is the best engineering
story in the build and reads as credibility, not filler):*

> One implementation note, because it nearly went out wrong. My first version
> mapped a local hour to a UTC hour with integer arithmetic. Every test passed.
> It was silently incorrect for exactly the timezone the project is about — IST's
> half-hour offset means 06:00–07:00 IST is 00:30–01:30 UTC, straddling a band
> edge, so half that hour is peak-priced and half isn't. A whole-hour model has
> to pick one and is wrong either way. I only caught it writing the Beijing test,
> where everything landed on clean hour boundaries and looked suspiciously tidy.
> The fix was ~20 lines of minute-resolution coverage. The test I would keep if I
> could keep only one asserts that peak fractions sum to exactly 7 hours in every
> timezone.

---

## Draft 2 — **The credential nobody was watching** (safe to post today)

*Why this one: it is an IT Director post, not an AI post, and it is honest about
a failure. Those travel well and it references no unpublished repo. Slightly
uncomfortable to publish — which is the reason it is worth publishing.*

> I run an automated pipeline that ships one AI project to GitHub every morning
> at 6 AM. It has been running for weeks. This morning I found out it stopped
> publishing on 28 July.
>
> Nineteen days. Every single run in that window worked perfectly — picked a
> project, built it, ran the tests, wrote the README, passed every quality gate —
> and then failed silently at the last step, because the GitHub token had
> expired.
>
> Three things made this worse than it needed to be, and all three are things I
> would flag in someone else's architecture review:
>
> **1. The failure was invisible.** The pipeline wrote a detailed report about
> the problem into a folder and waited for someone to read it. Nothing paged, no
> mail, no message. An automated system that cannot interrupt you is not
> automated, it is just unattended.
>
> **2. The health check was checking the wrong thing.** `git clone` and
> `ls-remote` against the repo kept succeeding, so everything looked fine. The
> repo is public — those succeed *anonymously*. A completely fake token passes
> that check identically. Only a write actually exercises the credential. If your
> monitoring only ever reads, it is testing your network, not your auth.
>
> **3. One malformed record killed an unrelated job.** Separately, a publish
> Action was iterating over pending work and one entry was missing a field. The
> guard was `exit 1`. So a single bad record took down publishing for everything
> else in the queue. It should have logged loudly, skipped that one, published
> the rest, and failed at the end. That is a five-line change I have now made and
> should have made on day one.
>
> None of this is sophisticated. Expired credential, read-only health check,
> fail-fast in the wrong place. That is exactly why it is worth writing down —
> the outages that actually happen are rarely the interesting ones.
>
> Two-minute fix. Nineteen days of streak. Go check what your unattended jobs
> are quietly failing at.

---

## Draft 3 — **kb-agent-framework / what's actually under the frameworks**

*Why this one: it pairs with Microsoft's new AB-100 and AB-620 agent
certifications, which is a live topic for anyone on the Microsoft stack in India
right now. Post this one after Day 021 fans out.*

> Microsoft just made agent-building an official certification track — AB-100
> (Agentic AI Solutions Architect) and AB-620 (AI Agent Builder). Which means a
> lot of people are about to learn agents through a framework's documentation.
>
> That is a fine way to get productive and a bad way to understand what you are
> running.
>
> So I wrote the runtime underneath: a typed agent framework in TypeScript with
> **zero runtime dependencies**. Tool registry, episodic + scratchpad memory, a
> step-guarded ReAct loop, structured tracing. Small enough to read in one
> sitting.
>
> Three things fell out of the constraint that I did not expect:
>
> **The model is a one-method interface.** `decide()` returns either "call this
> tool" or "here is the answer." Once that is the contract, the runtime does not
> care whether the decision came from GPT-4o or a fifteen-line rule engine. That
> is what made a genuinely key-free live demo possible without faking anything —
> the demo planner is a real deterministic planner, and the code says so out loud.
>
> **Errors are observations, not crashes.** My first loop died when a tool threw.
> But recovering from a failed tool call is precisely what separates a competent
> agent from a script. Now a validation failure comes back as `ERROR: …` for the
> model to read and correct on the next step.
>
> **The step guard is the whole safety story.** Everything people worry about
> with runaway agents lives in about ten lines. Worth seeing those ten lines
> before trusting a framework to have written them well.
>
> If you have wondered what LangChain or Semantic Kernel are doing at their core:
> it really is this loop. Everything else is ergonomics and integrations layered
> on top — valuable, but not the thing you need to understand to reason about
> what your agent will do at 3 AM.
>
> Open source, MIT, live browser demo, no API key.
>
> 🔗 https://github.com/kbipul/kb-agent-framework
>
> Day 21 of shipping one AI project a day.

---

## Posting note

If you post more than one this week, order them: **Draft 2 today** (it stands
alone and is time-insensitive), then **Draft 1 the moment Token Clock is live**
— its entire value is being early to the 16:00 UTC repricing. Draft 3 is
evergreen and can wait.
