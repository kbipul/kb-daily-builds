# LinkedIn drafts — W38 (Days 034–042)

Three options, drawn from this week's Build notes and selection rationales. Nothing is posted
automatically. Pick one, edit it until it sounds like you, post it.

All three link a live demo that needs no signup, no key and no install. That is the asset. The
series has forty-two of them and zero inbound, which is the whole point of posting.

---

## Option 1 — "Coverage is not recall" (Day 041, `oversight-gap`)

**Best for:** a senior audience that runs things. This is the one that reads as an IT Director
talking, not a builder showing off.

---

Anthropic published three numbers last week for overseeing its own internal AI agents:
coverage, review latency, escalation rate. Roughly 30,000 agents running at any one time, about
a billion actions a month, and 1 in 47,000 actions blocked.

Coverage was 100%.

I built a small tool to sit with that number for an afternoon, and it changed how I read it.
100% coverage means every action was inspected. It says nothing about how many of the bad ones
were caught. That is recall, and recall is the number nobody publishes, because measuring it
means knowing what you missed.

The arithmetic is not complicated. One division and one subtraction. But across a plausible
range for that one unpublished parameter, the count of bad actions that got through swings from
0 to about 191,000 a month. Same 100% coverage at both ends.

There is a second thing in that table I only saw because I divided. "Humans review any blocked
actions within one week" reads like a service level. Multiply it out and it is a commitment
about roughly 4,800 items a week landing in front of people. Two rows up, the offline monitor
sends about 50 flags a week to human review. Both are human queues in the same system and they
differ by a factor of a hundred.

None of this is a criticism of the numbers. Publishing them at all puts Anthropic well ahead of
everyone who has not. It is an argument that when we start reporting AI oversight metrics
internally, and we will, the one that sounds most reassuring is the one that tells you least.

If you are building an agent oversight dashboard this quarter, move the slider yourself:
https://kbipul.github.io/oversight-gap/

Day 41 of one AI project a day. No signup, no key, runs in your tab.

---

## Option 2 — "The log verified. Three records were missing." (Day 040, `last-record`)

**Best for:** engineers and anyone who has ever accepted a green badge as an answer. Carries a
correction, which is unusual on LinkedIn and is exactly why it works.

---

There is an IETF draft going around for a standard agent audit log. Twelve mandatory fields per
record, seven action types, and SHA-256 hash chaining so a reviewer can tell whether anyone
edited the log after the fact.

I implemented it. Then I deleted the last three records and ran the verifier again.

It passed. Green badge, chain intact, nine records became six and nothing complained.

That is not a bug in the draft. A hash chain proves that nothing in the middle was altered,
because changing one record orphans everything after it. It cannot prove that nothing was
removed from the end, because the end is wherever the chain stops. Cut the terminator too and
the shorter log is perfectly valid.

The records I dropped were the refund attempt, the escalation, and the session close. The three
you would want.

Fixing it is not hard, and this is the part worth taking to your own logging design: publish the
head hash somewhere the log holder cannot rewrite, or issue a signed sequence number per agent,
or both. What you cannot do is treat a verified chain as a complete one.

One correction, because it belongs in the post rather than in a comment. When I first published
this I wrote that the draft expires on 29 September, eleven days away, and I leaned on that
urgency. I had misread the datatracker page. Version -03 was posted on 5 September and runs to
March 2027. The deadline that has actually passed is EU AI Act Article 12, in force since
2 August. The tool is unchanged; my framing of why to look at it now was wrong, and the page
says so.

Drop records from the log and watch it keep verifying:
https://kbipul.github.io/last-record/

Day 40 of one AI project a day.

---

## Option 3 — "A yes to one purpose is not a yes to the pipeline" (Day 042, `consent-ledger`)

**Best for:** the India positioning. This is the one that serves the twelve-month goal most
directly, and it is the strongest build of the week on every dimension.

---

India's DPDP obligations land in November 2026 and May 2027. Most AI teams here are treating
consent as a checkbox problem. It is a purpose problem, and the difference shows up immediately.

I modelled nine stages of an ordinary AI feature against the Act: answer the question, keep the
transcript, index the embeddings, train on it, let a human review a flagged chat, send it to a
processor abroad, and so on. Then I wrote the consent notice the way section 6(1) describes and
asked which stages it authorises.

Five of the nine fail. Not because of anything subtle. Because the notice never named the
purpose, and consent is limited to "such personal data as is necessary for such specified
purpose". Nobody wrote the purpose down.

Two stages I could not settle at all, and the tool says so rather than guessing. When a user
withdraws consent, a transcript store can be deleted. A vector index cannot be un-embedded, and
whether those vectors are personal data at all is genuinely open. A cached output that
reproduces what the user typed is either the same personal data or new data about the same
person, and I do not know which.

Even the commencement dates are not as settled as every summary claims. The notification says
"one year" and "eighteen months" from publication and never says how the period is counted. The
printed masthead of Gazette issue 757 reads 13 November 2025; the eGazette record for the same
issue encodes 14 November. The tool prints both countdowns, because I cannot tell you which is
right.

If you are shipping an AI feature to Indian users, the question to take into your next design
review is not "did we get consent". It is "which purposes did we name, and which stage of the
pipeline is running on a purpose nobody wrote down".

Build the notice and see what it authorises:
https://kbipul.github.io/consent-ledger/

Day 42 of one AI project a day. Not legal advice, and the tool says that before it says anything
else.

---

## Notes on posting

- **Pick one.** Three posts in a week from a standing start reads as a content calendar. One
  post that a senior reader finishes reads as a person.
- **Option 1 is the safest opener** if this is the first post of the series: it is about a
  problem the reader has, and the tool is the evidence rather than the subject.
- **Option 3 is the highest ceiling** and the most on-strategy, but it lands best with an Indian
  professional audience specifically, so time it for a weekday morning IST.
- **Option 2 is the differentiated one.** Publishing a correction inside a post is rare enough
  that it is itself the credibility move. Only post it if you are comfortable leading with an
  error.
- Do not link the hub repo in the post body. Link the one demo. The hub is what people find
  after they are already interested.
