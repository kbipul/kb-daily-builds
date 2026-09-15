<div align="center">

# Conduct Gap

**The rules are written down. Which ones could you ever catch a violation of?**

[![CI](https://github.com/kbipul/conduct-gap/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/conduct-gap/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-5aa9ff)](https://kbipul.github.io/conduct-gap/)

`Day 035` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 14 September 2026 Microsoft AI published a draft [Code of Conduct for its MAI
models](https://microsoft.ai/code-of-conduct/) and opened a six-week comment window. It bars its
models from resisting shutdown, widening their own scope, taking on goals nobody gave them, or
hiding their reasoning from auditors. The coverage argued about whether the rules are the right
ones. This asks a different question: for each rule, what would you have to observe to know it had
been broken, and do you hold that observation?

Forty-two commitments are quoted verbatim from the document. Each is tagged with the class of
evidence that would falsify it. You pick the surface you run on and the access you actually hold,
and the page sorts the commitments into what you could catch, what needs access you do not have,
and what nothing in the catalogue can settle.

The short version of the answer: a typical enterprise tenant can check seven of forty-two, and
three of those seven sit in the layer the document says an operator is allowed to change.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI on a GitHub runner and committed back; it
appears within a few minutes of the first publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/conduct-gap/)** — runs fully in your browser. No model, no
network call, nothing typed leaves the page.

```bash
git clone https://github.com/kbipul/conduct-gap.git
cd conduct-gap
npm ci
npm test     # 46 tests
npm run dev
```

## How it works

Two vocabularies do the work, and every result falls out of the map between them.

`EvidenceClass` describes what a clause demands: reading a response, constructing an input, reading
your action log, reading your own config, comparing against what was withheld, opening the model,
reading the vendor's files, or nothing, for clauses that state no behavioural observable at all.

`EvidenceSource` describes access somebody might hold: an endpoint, a red-team budget, action
traces, operator configuration, raw chain of thought, population telemetry, a vendor attestation,
or independent-evaluator access at employee level.

```
clause ──requires──▶ EvidenceClass ◀──grants── EvidenceSource ◀──held by── you
                            │
                            └──▶ checkable / needs-access / unfalsifiable
```

Two mappings decide almost everything the tool says. The counterfactual class is granted by exactly
one source, because catching a concealment means holding both what was shown and what was true, and
only a party who can compare against unshipped checkpoints holds both. And a vendor attestation
grants nothing at all. A system card is the vendor describing its own conduct, and that is the
claim under test.

Scope is a separate axis, and it is the one that can zero the whole board. The glossary says the
document *"sets the intended behavior of MAI Models, including when deployed by Operators; it does
not extend to other models simply because Microsoft uses or hosts them."* Point a capable team with
a harness and a red team at a GPT or Claude deployment on Azure and all forty-two commitments
detach at once.

## Build notes

The first version had a bug that no unit test would have caught, because every function in it was
correct. I had one evidence class called `internal-artifact` covering both the model's raw
reasoning and the vendor's review records. Printing the full preset-by-clause matrix showed
chain-of-thought access apparently settling *"MAI Models undergo red-teaming, safety evaluations,
and pre- and post-deployment review"*, which reading a chain of thought plainly does not settle.
Splitting it into `model-internals` and `vendor-records` changed the headline result: raw
chain-of-thought access now moves exactly one clause instead of two. There is a test named `moves
exactly one clause when raw chain of thought arrives, and not the ones about it`, and the second
half of that name is the point. Clause 22 forbids tampering with the chain of thought and clause 26
forbids concealing behaviour under evaluation. Holding the reasoning you were handed settles
neither, because both are claims about the reasoning you were not.

The second bug turned out to be a finding. I defined a `deployment-config` evidence class, wired the
toggle, and then found that no clause in the corpus requires it. My first instinct was to delete the
class. It is still there, pinned by a test called `settles no clause at all by reading your own
configuration`, because the reason is worth more than the tidiness: every clause in the document is
about the model, and your own configuration tells you what you asked for, which is a different
question from what the model did.

That left two toggles that move nothing, and they turn out to be the two things an enterprise
actually holds. The tenant preset and the reader preset produce identical scoreboards. Somebody who
bought seats, wrote a system prompt and requested the system card is in exactly the epistemic
position of somebody with a chat window and no contract: seven of forty-two. I did not set out to
build that comparison and it is the result I would put first.

What those seven are is the second thread. Four of them are honest wins: a model claiming feelings,
a refusal arriving without a reason, a fabricated citation, a denial of being AI. The other three
are Part 4 defaults, and section 4.3 says system instructions *"may change defaults described in
this Part"*. So a meaningful share of what an ordinary user can verify is exactly the layer the
operator is permitted to switch off. Filed in that same changeable layer, incidentally, is *"not
claim to have performed actions it has not taken or fabricated results from tools it has not
called"*, which sits alongside tone and writing style.

Two clauses are worth opening the document for. Section 3.3 forbids active
deception and then, in the very next sentence, passive deception. Fabrication puts something into
the output and you can go and resolve the citation; omission takes something out, and an output
cannot show you a subtraction. The pair sits one sentence apart and on opposite sides of the line
this whole tool draws. And clause 26 commits the models not to conceal behaviour *"if they infer
that an interaction or wider environment is being monitored, evaluated, or tested"*, which is a
promise a test cannot settle, because probing harder only makes your observation more like the case
the clause is about.

I want to be plain about which half of this is mine. The quotes are verbatim, with their sections,
and the only edits are removing the source page's italics on "MAI Models" and marking omissions with
ellipses. The classification is judgement: deciding that the shutdown commitment needs an action
trace rather than a careful reading is a call I made, and the whole argument rests on those calls,
so each one is written out on its row instead of folded into a score. Disagree with a row and the
count moves.

Not built, and the strongest objection to shipping it this way: there is no control that lets a
visitor reclassify a clause and watch the board move. If the classification is the argument, the
honest interface lets you argue with it, and right now all it does is show you the reasoning and
invite you to disagree somewhere else. I would build that next.

Three of the Absolute Constraints carry no test procedure at all. Weapons, offensive cyber and child
safety are constructible as tests and this repository is not where those get written down; each of
those rows says so and says who the testing belongs to. For the constraints generally there is an
asymmetry worth naming: a refusal tells you that the framings you tried were caught, and only a
compliance tells you something about the model.

Nothing here was run against a model. No claim is made that any model has violated any clause. The
tool is about what is knowable, and the document is its own best witness on that: it says it is
*"a north star"* and *"not a guarantee of present-day performance"*, that *"written objectives
alone can never ensure alignment"*, and that Microsoft is *"not using it to train our models
today"*. Those seven self-descriptions are shown on the page and deliberately left unscored, since
none of them is a claim about how a model behaves.

## Stack

| Piece | What for |
|---|---|
| React 18 + TypeScript 5 | UI, strict mode with `noUnusedLocals` |
| Vite 6 | Build and the Pages base path |
| Vitest 3 | 33 engine tests (node) + 13 render tests (jsdom) |
| No runtime dependencies | The corpus is data; the triage is a pure function |

## Sources

- [Humanist AI Code of Conduct](https://microsoft.ai/code-of-conduct/), Microsoft AI, 14 September 2026 ([PDF](https://microsoft.ai/pdf/MAI_CodeOfConduct.pdf))
- [Humanist AI in practice: a public consultation](https://microsoft.ai/news/mai-code-of-conduct/), Microsoft AI, 14 September 2026
- [Microsoft floats rules for AI models as industry weighs slowdown](https://www.geekwire.com/2026/microsoft-floats-rules-for-its-own-ai-models-as-industry-debates-a-slowdown/), GeekWire, 14 September 2026
- [We Must Pace the Frontier](https://darioamodei.com/post/we-must-pace-the-frontier), Dario Amodei, September 2026, for the independent-evaluator access the last eight clauses wait on

## License

MIT © Kumar Bipul

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
