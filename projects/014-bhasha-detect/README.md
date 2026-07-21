<div align="center">

# Bhasha Detect — Identify India's 22 Scheduled Languages In Your Browser

**Paste text in any of India's 22 scheduled languages — plus Hinglish — and watch it get identified by Unicode script and character n-grams, with an honest confusion-matrix explorer. 100% client-side, no API key.**

[![CI](https://github.com/kbipul/bhasha-detect/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/bhasha-detect/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen)](https://kbipul.github.io/bhasha-detect/)

`Day 14` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

The week India's sovereign-AI push crossed its headline milestone — **BharatGen covering all 22 scheduled Indian languages** — I built the honest flip side of that coin: a tiny tool that tries to tell those languages apart, and shows you exactly where it can't. Paste a sentence in Hindi, Tamil, Assamese, Urdu, Hinglish — any of the 22 languages of the Eighth Schedule — and it names the language, the script, and its confidence, running entirely in your browser with **no model download and nothing leaving the tab**.

It works in two stages. **Script detection** (Unicode blocks) is near-exact and instantly narrows 22+ languages to the handful that share a script. **Character n-grams + marker words** then rank the same-script siblings — Hindi vs Marathi vs Sanskrit vs Nepali, Bengali vs Assamese, English vs Hinglish. The interesting part is the built-in **confusion matrix**: it's computed live by leave-one-out over the embedded samples, and it's deliberately block-diagonal by script, because every mistake the tool makes is between languages that share a script.

![Screenshot](docs/demo.png)

<sub>The screenshot above is captured automatically by CI on a real browser (the build sandbox can't run one) and committed to `docs/demo.png` within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/bhasha-detect/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/bhasha-detect.git
cd bhasha-detect
npm ci
npm test        # 88 tests, incl. leave-one-out confusion accuracy gate
npm run dev     # open the printed localhost URL
```

## How it works

```
input text
   │
   ▼
scriptHistogram()  ── tally Unicode-block per character (digits/punct ignored)
   │  dominant script + coverage %
   ▼
candidates = languages sharing that script
   │
   ├─ unique-script owner (Tamil, Telugu, Ol Chiki→Santali …) → answer by script alone
   │
   └─ shared script (Devanagari / Bengali–Assamese / Perso-Arabic / Latin)
          │
          ▼
      score = 0.55·cosine(charTrigrams) + 0.45·markerWordHits
          │  softmax → per-language confidence
          ▼
      ranked siblings + honest "also written in this script" caveat
```

Three decisions worth calling out:

1. **Script detection is the reliable half, so it's separated from the guessing half.** A Tamil letter can only be Tamil; the code returns the script with its own confidence (share of characters), independent of the language guess. All real uncertainty lives in the n-gram stage, and the UI keeps the two numbers apart.
2. **Honest capability tiers, not a fake "we do all 22" claim.** Each language is tagged `content-profiled` (has samples, joins the n-gram ranking + confusion matrix), `script-identified` (owns a unique script — Santali/Ol Chiki, Manipuri/Meitei Mayek — so script alone names it), or `script-only` (shares a script with profiled languages, reported down to its script but not yet individually confirmed: Konkani, Maithili, Bodo, Dogri, Sindhi, Kashmiri). The tool tells you which promise it's making for your input.
3. **The confusion matrix is computed, never decorative.** It re-classifies every embedded sample using profiles built from all *other* samples (leave-one-out), so nothing trivially matches itself. Current score: **56/64 = 87.5%**, with all 8 errors inside shared scripts (Hindi↔Nepali, Bengali↔Assamese).

## Build notes — what I learned

The seductive idea was "train a 22-language classifier." The honest reality is that **script does most of the work and language ID does the rest** — and for India that split is unusually kind. Twelve of the 22 languages own their script outright (Tamil, Telugu, Kannada, Malayalam, Gujarati, Gurmukhi/Punjabi, Odia, Ol Chiki/Santali, Meitei Mayek/Manipuri), so a Unicode-block histogram nails them with zero machine learning. The genuinely hard cases collapse to three shared scripts: Devanagari (Hindi, Marathi, Sanskrit, Nepali + four more), Bengali–Assamese, and Perso-Arabic. Building the tool around that structure — reliable stage, then uncertain stage — made it both simpler and more truthful than a single opaque model.

The bug that taught me the most was a one-character marker. My first marker matcher used substring search, and Nepali's function word **र** ("and") is a single Devanagari letter that appears *inside* the conjuncts of ordinary Hindi and Marathi words. So a plain Hindi imperative got classified as Nepali, twice, because "र" lit up everywhere. The fix was to normalise on Unicode letter/mark boundaries (`\p{L}\p{M}`, which also cleanly strips the danda "।" and the Urdu full stop "۔") and match markers as **whole tokens**. Same lesson every NLP person relearns: tokenisation is where the accuracy actually hides.

The most satisfying discriminator is Assamese vs Bengali. They share a script, but Assamese uses **ৰ** (U+09F0) and **ৱ** (U+09F1) where Bengali uses র and ব-য় — a script-level fingerprint, not a statistical one. Encode that as a marker and the two separate cleanly even on short text, which is exactly what the confusion matrix shows.

What I'd do differently with more than one day: the `script-only` tier (Konkani, Maithili, Bodo, Dogri, Sindhi, Kashmiri) deserves real profiles, which means a vetted corpus per language rather than my hand-written sample sentences. I deliberately did **not** fake it — I'd rather ship a tool that says "this is Devanagari; it could be Konkani but I can't yet confirm it" than one that guesses confidently and is quietly wrong. For an IT-Director-shaped portfolio, *knowing the boundary of what your system can claim* is the whole point.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Classifier | Hand-written: Unicode-block script detection + char-trigram cosine + marker words (no ML libraries, no model download) |
| Build / dev | Vite 6 |
| Tests | Vitest — 88 tests incl. a leave-one-out confusion-accuracy gate |
| Demo | GitHub Pages (fully client-side) |

Sample sentences are short, hand-written declaratives/greetings that seed each language's n-gram profile — they are a seed, not a corpus, and the accuracy numbers should be read in that light.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
