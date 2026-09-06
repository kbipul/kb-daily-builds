# LinkedIn drafts — Week 36 (2026-09-06)

Three options from this week's Build notes. Nothing auto-posts. Pick one, edit the
voice until it sounds like you, post it yourself.

Ranked by what I think does most for the "authentic AI/ML voice in India" goal.
Draft C is the one I would post.

---

## Draft A — "I turned on prompt caching and my bill went up 22%"
*Source: Day 024 cache-cliff. Broadest appeal — everyone shipping on Claude has this problem.*

I turned on prompt caching for a coding agent and the bill went up 22%.

Not down. Up. $15,124 a month to $18,473, for switching on the feature whose entire
purpose is to make it cheaper.

The cause was twelve tokens. A line reading "Current date and time: ..." sat at
position 3 of the prompt, ahead of 32,300 tokens of tool definitions and repo map.
That line changes every request, so the cached prefix broke there. Everything behind
it got rewritten at $12.50/M every single call and read back never.

Move that one line to the end of the prompt and the same workload costs $5,228. That
is 72% off for relocating a timestamp.

The part that bothers me is that no dashboard would have caught it. Cache hit *rate*
looked fine. Cache hit *cost* was the disaster, and almost nobody reports that.

On Claude Fable 5.1 the gap between a hit and a miss is 50x. At that ratio, "should I
cache?" is answered for everyone. The only question left is whether your prefix
actually holds — and that is structural, not arithmetic.

I built a tool to lay out a prompt stack and find the block that breaks it. Free,
runs entirely in your browser, no key:
https://kbipul.github.io/cache-cliff/

Day 24 of building and shipping one AI project a day.

---

## Draft B — "Your fleet has eight GPUs. The scheduler can see two."
*Source: Day 025 pair-planner. Best for the IT-director audience specifically.*

NVIDIA shipped PAIR last week — free software that pools every idle GPU on your
network into one inference cluster. I modelled it against a realistic office setup
before getting excited.

Four capable machines. Combined speedup: none. 38 minutes 30 seconds with all four,
38 minutes 30 seconds with one.

Not a hardware problem. Every machine was ineligible for a different boring reason.
The gaming PC was mid-session. The study desktop had only ever pulled Phi-4 mini, so
it did not have the requested model. The mini PC had no inference engine running at all.

Make the same four machines eligible and the job finishes in 8 minutes 17 seconds.
The single highest-value fix in the whole simulation was closing a game — worth 28
minutes.

That is a sleep-policy and `ollama pull` problem. It will never show up on a hardware
budget, and it is exactly the kind of thing that decides whether an infrastructure
investment returns anything.

The uncomfortable version for those of us who sign off on capacity: the binding
constraint is usually eligibility, not silicon. We buy the silicon anyway.

Simulator here, runs in the browser:
https://kbipul.github.io/pair-planner/

Day 25 of one AI project a day.

---

## Draft C — "I wrote a test to prove my own claim. It could not fail." ⭐
*Source: this week's audit finding on Day 022. The most honest thing I have to post,
and the one that best earns the word "authentic".*

My README made a claim. I wrote a test to prove it. I cited the test in the README so
the claim "could not rot".

The test could not fail. I found out during a routine audit, three days later.

The claim was that moving batch AI work to the weekend saves more than shifting it to
cheaper hours within the day. The test compared the two. Except it passed an empty
object where the shifted schedule should have gone, so the shifting function never
ran. It was comparing my weekend plan against a saving of zero, computed from a
different baseline. Green tick, every time, no matter what the code did.

I rewrote it to actually run the shift. It failed immediately.

The two levers save exactly the same amount — $792.00 a week on my test profile, equal
to the cent. They share one ceiling: every deferrable token at the off-peak rate, and
there is no third, cheaper rate to reach. Wherever you can shift hours freely, the
weekend buys you nothing extra.

The honest claim turned out to be better than the one I made up. The weekend move wins
on *reachability*, not size. It needs no burst headroom and no shift window. Give a job
a one-hour shift window, or bury it inside a peak band, and intra-day shifting saves
literally nothing while the weekend move still saves in full. That is a stronger, more
useful thing to tell someone — and I only have it because the test broke.

Two things I am taking from this.

A test that names the right behaviour in its title and asserts something else is worse
than no test. It converts an unverified claim into a verified-looking one.

And I only caught it because a weekly audit re-opens the published work with fresh
eyes. Shipping daily is easy to be proud of. Re-reading what you shipped is where the
errors actually live.

Corrected build, and the four tests that now pin it properly:
https://github.com/kbipul/token-clock

Day 22, re-opened on day 26.

---

## Notes for whichever you pick

- Every figure above is reproducible from the bundled presets in the live demos. If
  someone challenges a number in the comments, the demo is the answer.
- Draft C names a mistake in public. That is the point of it — it is the only one of
  the three that could not have been written by someone who did not do the work.
- If you want an India-specific angle instead, Day 022 has the strongest one and it is
  unused: identical AI traffic on an Indian clock costs 35% more than on US Pacific,
  purely because 11:30–15:30 IST sits inside DeepSeek's peak window. 79.9% peak
  exposure for an Indian SaaS profile. Say the word and I will draft it for next week.
