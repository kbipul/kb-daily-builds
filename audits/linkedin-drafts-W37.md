# LinkedIn drafts — W37 (Days 026–032)

Three options. Nothing auto-posts. Pick one, edit the voice until it sounds like you,
post it. Each links a live demo a stranger can open without signing up for anything.

Drawn from the week's Build notes and selection rationales — the moments where building
the thing changed what I believed, which is the only part of a daily-build habit worth
anyone else's attention.

---

## Draft 1 — "I built the tool to test X and X wasn't the answer" *(recommended)*

**Why this one:** it is the strongest thing that happened all week, it is a finding rather
than an announcement, and the lesson is useful to someone who will never open the demo.
Nothing in it asks to be admired.

> Your AI agent has a rule: no production restart without a named approver.
>
> I spent a day building a simulator to find out which compaction policy keeps that rule
> in context through a long session. I expected the policy choice to dominate.
>
> It came second.
>
> What dominates is **where the rule came from.**
>
> The approval gate written into the system prompt survived every compaction round under
> every policy I modelled. The change freeze the session *discovered at turn 4 from a tool
> result* was gone by turn 63 — under every compacting policy, without exception.
>
> The rule you thought hardest about is the safest one. The rule the session learned for
> itself is the one at risk. And nobody writes those down, because by definition you
> didn't know them when you started.
>
> There's a sharper version that doesn't rest on my modelling at all. Anthropic publishes
> its compaction contract: user messages kept verbatim, assistant turns and tool calls
> summarised into an opaque item. So the best-documented compaction policy available
> protects everything you typed — and nothing the session found out on its own. That comes
> from reading the contract, not from my numbers.
>
> OpenAI's Agents API went to public beta on 10 September. It now compacts your session
> for you, "preserving information the agent needs to continue."
>
> A standing rule is not information the agent needs to continue. It is information the
> agent needs once, later, at the exact moment it is about to break it.
>
> Live demo, runs in your browser, no signup, no key:
> https://kbipul.github.io/compaction-drift/
>
> Day 31 of shipping one AI/ML project a day. Every retention number in it is drag-adjustable,
> because they're my engineering judgement and you should be able to disagree with them
> numerically without disagreeing structurally.

---

## Draft 2 — "Read-only doesn't mean what your policy thinks it means"

**Why this one:** the most concrete and the most immediately actionable for a security or
platform audience. It's the one most likely to be forwarded into a team channel. The
counter-intuitive result is the hook — resist the urge to explain it in the post.

> "The agent is read-only. It can't write anything."
>
> Your policy blocks the verb. The other end of the connection cares about the effect.
> Those are different statements, and thirteen documented mechanisms live in the gap.
>
> MediaWiki accepts page edits over GET. Rails and Symfony tunnel the real method through a
> `_method` parameter. Gateways honour `X-HTTP-Method-Override`. GraphQL-over-HTTP only
> *should* reject mutations over GET. A webhook catch-hook will fire on a GET. HEAD still
> reaches the origin. RFC 9110 §9.2.1 has said GETs can be unsafe for years.
>
> I built a simulator: set a policy, watch thirteen real request shapes go through it,
> scored two ways — what your policy decided, and what the request actually does.
>
> A plain read-only verb allowlist lets **11 of 13** through. It also blocks one harmless
> read. Wrong in both directions at once.
>
> Then the part I didn't expect, which is why I build these instead of writing think-pieces:
>
> **A plain destination allowlist beats the hardened verb policy.** Patch every trick from
> the post-mortem — method overrides, write-intent params, private destinations, DNS entropy
> — and you're left with more breaches than if you'd simply constrained where traffic may go.
> Every one of those patches targets requests that *look* like writes. A webhook URL, a
> cancellation link and a tracking pixel don't look like anything.
>
> There's a test in the repo asserting that inequality, so a future refactor can't quietly
> erase the most useful thing the tool says.
>
> It also ships with its own counterexample: an effect-based gate cannot stop
> `GET 169.254.169.254/…/security-credentials/`. That's a genuine read, it changes nothing,
> and it hands back cloud role credentials. Closing the verb/effect gap closes one category,
> not all of them.
>
> https://kbipul.github.io/readonly-illusion/
>
> Day 29. Runs entirely in your browser.

---

## Draft 3 — "Would you notice?" *(the one with the uncomfortable ending)*

**Why this one:** the sharpest positioning for an IT-director audience, because it's a
buyer-side question nobody else is asking. Longer and more sombre than the other two; the
statistical payoff is the substance. Trim the middle if it runs long.

> On 8 September, NSA, CISA and the FBI published a joint advisory on industrial-scale
> model distillation.
>
> Everyone read the attribution half. I went to the mitigations, and the third recommendation
> is written for providers, about customers:
>
> Serve suspected accounts a **downgraded model**. **Vary** the alteration across requests,
> specifically so response-quality evaluation can't pin it down. **Don't inform the user.**
>
> Then I read the detection indicators the advisory lists. Round-the-clock usage with no
> human rhythm. New subscription straight to maximum throughput. One credential across many
> IPs and user agents. Enterprise throughput on a non-enterprise plan. Automated failover.
> A framework that evaluates output quality.
>
> That's not a description of a distillation operation. That's a description of a normal
> enterprise AI platform. It's a description of *mine*.
>
> So I built the buyer-side view: lay out your fleet, see your overlap with the published
> indicators, then — the part that matters — calculate **how long a silent downgrade would
> survive inside your own eval noise.**
>
> Building it corrected my pitch twice, in opposite directions.
>
> I'd drafted "a nightly suite sits blind for weeks." The engine said 3.6 days and I had to
> rewrite it. But 3.6 days is the expected wait for the *first* run to cross significance —
> at 31% power, that's a signal you'd go and confirm, not a finding. The honest number is the
> 90%-cumulative-confidence window: **7 days** for a well-instrumented fleet, **91 days and
> 3.6 million degraded requests** for a team running 40 cases a week.
>
> Intermittency is the whole trick. An 8-point quality drop applied to 30% of responses is a
> 2.4-point drop in your measured rate. 2.4 points is genuinely hard for 150 cases to resolve.
>
> The tenth indicator is the uncomfortable one, and it ships as-is. A harness that tracks
> output-quality drift is the only instrument that catches a silent downgrade — and the
> advisory lists exactly that capability as a distiller behaviour to detect. Its mitigation
> field in my tool reads: *no mitigation offered, and none should be.*
>
> https://kbipul.github.io/quiet-throttle/
>
> Day 30. The advisory is linked in three places. No claim that any provider has flagged or
> degraded anyone — this measures overlap, not guilt.

---

## Notes for whichever you pick

- **Post one, not three.** Three posts in a week from a two-follower account reads as
  automation. One post that took a position reads as a person.
- **Drafts 1 and 2 are the safest openers.** Draft 3 names a live geopolitical advisory;
  it's accurate and carefully hedged, but it's the one to read twice before posting.
- **The comment is where the reach is.** If you post Draft 1, the natural follow-up comment
  is the null result: externalising state to durable storage — the published long-session
  guidance — measured as doing *nothing* in my presets, because the only fact anyone had
  externalised was already protected by the pinned prefix. The advice is right. The way it
  gets applied is backwards. That's a whole second post if the first one lands.
- **Tag the primary source, not the vendor.** AA26-251A, the Agents API compaction guide,
  the Astra system card. Linking what you read is the cheapest credibility in the format.
- **After posting, set `"posted": true` on the week's entry in `state.json`.** Right now the
  audit genuinely cannot tell whether any of six weeks of drafts ever went out, which is
  why it keeps recommending the same thing.
