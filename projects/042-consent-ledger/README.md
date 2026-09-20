<div align="center">

# Consent Ledger

**A yes to one purpose is not a yes to the pipeline behind it.**

[![CI](https://github.com/kbipul/consent-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/consent-ledger/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-5ac8fa)](https://kbipul.github.io/consent-ledger/)

`Day 042` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

India's Digital Personal Data Protection Act says consent must be "limited to such personal data as is necessary for such specified purpose". Every Indian team shipping an AI feature will meet that sentence: the commencement notification gives section 6(9) one year from 13 November 2025 and the consent, purpose-limitation and erasure duties eighteen months.

This app turns that sentence into a ledger. Tick the purposes your notice actually names, and nine pipeline stages sort themselves into authorised, not authorised, and unsettled, each with the provision it turns on. Tick only "deliver the assistant" and two of the nine are clean, five are outside the consent, and two are questions the Act does not answer.

Then there is the third panel, which is the part a consent screen never shows. Section 6(6) tells a fiduciary to *cease* processing on withdrawal. Section 8(7) tells it to *erase*. Those land very differently on a transcript table, a vector index, and a fine-tuned checkpoint, and the app prints which of your stores a delete request can actually reach.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects has no browser, so it cannot screenshot. The repo's CI captures `docs/demo.png` on a GitHub runner and commits it back, usually within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/consent-ledger/)** — runs fully in your browser, nothing to install, no key.

```bash
git clone https://github.com/kbipul/consent-ledger.git
cd consent-ledger
npm ci
npm test          # 59 tests
npm run dev       # http://localhost:5173/consent-ledger/
```

## How it works

### Quoted text only, and a test that guards the vocabulary

`src/dpdp/provisions.ts` holds eight items: sections 2(t), 6(1), 6(4), 6(5), 6(6), 8(7) and 9(3), plus clauses (b) and (c) of commencement notification G.S.R. 843(E). Each carries its Gazette text verbatim, its citation, and its commencement status. The notification's printed text contains `section 6,sections 7 to 10` with no space after the comma, and a test pins that typo so nobody tidies it into a paraphrase.

A second test asserts something about the whole set at once: none of those eight provisions matches `/artificial intelligence|machine learning|\bmodel\b|\btraining\b|algorithm/i`. The duties an Indian AI team is about to be held to are written about personal data and purposes. The one place I found the framework naming algorithmic software is Rule 13(3) of the DPDP Rules 2025, and only for Significant Data Fiduciaries, which this app does not model.

### The verdict is a set membership test

`evaluate()` in `src/dpdp/evaluate.ts` is about thirty lines and the order of its branches is the design:

```
child + advertising  → s.9(3) prohibition, consent is irrelevant
withdrawn            → s.6(6) cease, and cause processors to cease
purpose not named    → s.6(1) limitation
stage has an open Q  → unsettled, with s.2(t) and s.8(7) attached
otherwise            → authorised
```

Purpose limitation is checked before the open questions, so ticking nothing and asking about embeddings gets you "not authorised" rather than a philosophical answer. A test pins that ordering directly.

### Stores, not rows

`src/dpdp/residue.ts` scores six stores on what a delete request reaches: `erased`, `erasable-if-instrumented`, `contractual-only`, `no-erase-primitive`. The transcript store is the case the drafting clearly imagines. The vector index is erasable only if each vector kept a reverse mapping to the principal. The processor's copy is section 8(7)(b), which obliges the fiduciary to *cause* its processor to erase, making it a contract fact rather than something you can confirm from your own systems. Model weights have no delete at all.

`weakestReach()` then reports the worst store in the set, because a withdrawal is only honoured as well as its weakest one. Ticking "train our models" moves the whole pipeline from "delete works if you planned for it" to "there is no delete", and nothing else in the app changes when you do it.

## Build notes — what I learned

Two tests failed on the first run, for opposite reasons.

The first was `cache-generations: expected 'A cached output can restate what the …' to match /\?/`. I had written a rule that every unsettled stage must state its open question as a question, then written one of the strings as a statement. The test was right and my prose was wrong, so I rewrote the source: the cache row now asks whether a generated string that reproduces what the user typed counts as the same personal data or as new data about the same person. Writing it as a question forced me to notice I had two readings and no way to pick between them.

The second, `processor-copy: expected false to be true`, was the test being wrong. I had asserted that every store in the residue table is declared by some pipeline stage, and `processor-copy` is not: it enters scope whenever an authorised stage has `foreignProcessor` set. That is actually how 8(7)(b) behaves, the duty following the data out rather than being declared at a stage, so I changed the assertion and added a second test that pins the property deliberately instead of by accident.

What I cut: Significant Data Fiduciary obligations, and cross-border transfer under section 16. Section 16 is currently a single boolean on the record, `usesForeignProcessor`, which is enough to put a processor copy in the residue table and not enough to say anything about restricted countries. Rule 13(3) is the provision an AI team would most want modelled and it is the one I left out, because doing it honestly means quoting the Rules and I had only verified the Act text. Nine stages with verified citations beat twelve with two guessed ones.

The verdict I left open sits in the dates. Almost every summary of this law gives November 2026 and May 2027 as if the Gazette printed them. It did not: the notification says "one year" and "eighteen months" from publication and never says how the period is counted. The printed masthead of issue No. 757 reads 13 November 2025; the eGazette record for the same issue carries a code embedding 14112025. That is a one-day difference, `countdown()` returns both readings, and the panel shows both because I cannot tell you which is right.

The thing I did not expect was how boring the consent logic turned out to be. There is no inference in `evaluate()`, no scoring, no model. It is `specifiedPurposes.includes(...)`. Five of nine stages fail on the default notice for no cleverer reason than that nobody wrote the purpose down. The two that do survive still put a vector index in the residue panel, and whether that index holds personal data at all is one of the two questions the app refuses to answer.

## What this does not do

It is not legal advice, and it is not a compliance assessment of anything. It models a small, explicit subset: nine pipeline stages, five purposes, six stores, eight provisions. It does not cover legitimate uses under section 7, exemptions under section 17, Significant Data Fiduciary duties, the Consent Manager mechanics of section 6(7) to (9), or the Third Schedule retention periods. None of the duties it models is in force today, and the app says so on its own fourth panel before it says anything else.

## Stack

| | |
|---|---|
| UI | React 18, TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2, 59 tests |
| Demo | GitHub Pages, no network calls at runtime |

## Sources

- The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), sections 2(t), 6, 8 and 9. Gazette print hosted by MeitY.
- Commencement notification G.S.R. 843(E), Gazette issue No. 757, printed date 13 November 2025, clauses (b) and (c), page 2.
- The Digital Personal Data Protection Rules, 2025 (G.S.R. 846(E)), Rule 13(3), described rather than quoted.

Read 20 September 2026. Every quoted string in `src/dpdp/provisions.ts` is Gazette text.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
