<div align="center">

# Bhasha Detect — Identify India's 22 Scheduled Languages In Your Browser

**Paste text in any of India's 22 scheduled languages, plus Hinglish, and watch it get identified by Unicode script and character n-grams, with a confusion-matrix explorer that shows where it fails. 100% client-side, no API key.**

[![CI](https://github.com/kbipul/bhasha-detect/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/bhasha-detect/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen)](https://kbipul.github.io/bhasha-detect/)

`Day 14` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Paste a sentence in Hindi, Tamil, Assamese, Urdu, Hinglish, or any of the 22 languages of the Eighth Schedule. The page names the language, the script, and its confidence. There is no model download and nothing leaves the tab.

I built it the week India's sovereign-AI push crossed its headline milestone, BharatGen covering all 22 scheduled Indian languages. This is the flip side of that coin: a tiny tool that tries to tell those languages apart, and shows you exactly where it can't.

Two stages do the work. Script detection over Unicode blocks is near-exact, and instantly narrows 22+ languages to the handful that share a script. Character n-grams plus marker words then rank the same-script siblings: Hindi vs Marathi vs Sanskrit vs Nepali, Bengali vs Assamese, English vs Hinglish.

The confusion matrix in the UI is computed live by leave-one-out over the embedded samples. It comes out block-diagonal by script, because every mistake the tool makes is between languages that share a script.

![Screenshot](docs/demo.png)

<sub>The screenshot above is captured automatically by CI on a real browser (the build sandbox can't run one) and committed to `docs/demo.png` within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/bhasha-detect/)**. Runs fully in your browser, nothing to install.

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

Three decisions worth calling out.

Script detection is the reliable half, so I kept it apart from the guessing half. A Tamil letter can only be Tamil. `detect()` in `src/lib/detect.ts` returns the script with its own confidence, which is just the share of characters in the dominant block, independent of the language guess. All real uncertainty lives in the n-gram stage, and the UI keeps the two numbers apart.

The second is capability tiers rather than a flat "we do all 22" claim. `src/lib/languages.ts` tags each language `content-profiled` (has samples, joins the n-gram ranking + confusion matrix), `script-identified` (owns a unique script, so script alone names it: Santali/Ol Chiki, Manipuri/Meitei Mayek), or `script-only` (shares a script with profiled languages, reported down to its script but not yet individually confirmed: Konkani, Maithili, Bodo, Dogri, Sindhi, Kashmiri). `TIER_LABEL` in `src/App.tsx` puts that tag on screen, so the tool tells you which promise it's making for your input.

Third, the confusion matrix is computed at load time rather than drawn by hand. `buildConfusion()` in `src/lib/confusion.ts` re-classifies every embedded sample using profiles built from all *other* samples (leave-one-out), so nothing trivially matches itself. Current score: **56/64 = 87.5%**, with all 8 errors inside shared scripts (Hindi↔Nepali, Bengali↔Assamese).

## Build notes — what I learned

The seductive idea was "train a 22-language classifier." What actually happens is that script does most of the work and language ID does the rest, and for India that split is unusually kind. Nine of the 22 languages own their script outright (Tamil, Telugu, Kannada, Malayalam, Gujarati, Gurmukhi/Punjabi, Odia, Ol Chiki/Santali, Meitei Mayek/Manipuri), so a Unicode-block histogram nails them with zero machine learning. The genuinely hard cases collapse to three shared scripts: Devanagari (Hindi, Marathi, Sanskrit, Nepali + four more), Bengali–Assamese, and Perso-Arabic. Building the tool around that structure, reliable stage then uncertain stage, made it both simpler and more truthful than a single opaque model.

The bug that taught me the most was a one-character marker. My first version of `markerScore` used substring search. Nepali's function word **र** ("and") is a single Devanagari letter, and it appears *inside* the conjuncts of ordinary Hindi and Marathi words. A plain Hindi imperative got classified as Nepali, twice, because "र" lit up everywhere. The fix lives in `normalise()` in `src/lib/ngram.ts`: split on Unicode letter/mark boundaries (`\p{L}\p{M}`, which also cleanly strips the danda "।" and the Urdu full stop "۔") and match markers as **whole tokens**. Tokenisation is where the accuracy was hiding.

## Where it gets things wrong

The sharpest discriminator I have is Assamese vs Bengali. The two share a script, but Assamese uses **ৰ** (U+09F0) and **ৱ** (U+09F1) where Bengali uses র and ব-য় — a script-level fingerprint, not a statistical one. It works when those letters stand alone as tokens: the test `Bengali vs Assamese (the ৰ / আৰু discriminator)` in `src/lib/__tests__/detect.test.ts` passes on held-out sentences built around আৰু.

It stops working the moment ৰ is welded into a word, and that is where the whole-token fix from the previous section bites back. `markerScore` only counts a marker that is the entire token, so the ৰ inside ভাৰতৰ, সুন্দৰ and ৰাজ্য scores nothing at all. The first embedded Assamese sample contains all three of those words and still returns a marker score of 0.000, leaving cosine similarity to carry the decision on its own.

That shows up in the matrix. Of the 8 leave-one-out errors, 5 are this pair: Assamese read as Bengali three times, Bengali read as Assamese twice. The remaining 3 are Devanagari, where Nepali is read as Hindi twice and Hindi as Nepali once. Marathi and Sanskrit are never confused with anything, which I did not expect from four sample sentences each.

I do not know whether a longer Assamese marker list would beat the token problem or simply overfit four sentences. The 0.55 / 0.45 cosine-to-marker split and the softmax temperature of 0.12 in `detect.ts` were picked by hand and never swept, so I cannot tell you the displayed confidences are calibrated. The gate in `detect.test.ts` only asserts `cm.accuracy >= 0.8`, which means 87.5% has room to drift down before a build turns red.

With more than one day, the `script-only` tier (Konkani, Maithili, Bodo, Dogri, Sindhi, Kashmiri) is what I would fix first, and that needs a vetted corpus per language rather than my hand-written sample sentences. I deliberately did **not** fake it. I would rather ship a tool that says "this is Devanagari; it could be Konkani but I can't yet confirm it" than one that guesses confidently and is quietly wrong.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Classifier | Hand-written: Unicode-block script detection + char-trigram cosine + marker words (no ML libraries, no model download) |
| Build / dev | Vite 6 |
| Tests | Vitest, 88 tests incl. a leave-one-out confusion-accuracy gate |
| Demo | GitHub Pages (fully client-side) |

Sample sentences are short, hand-written declaratives/greetings that seed each language's n-gram profile. They are a seed rather than a corpus, and the accuracy numbers should be read in that light.

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
