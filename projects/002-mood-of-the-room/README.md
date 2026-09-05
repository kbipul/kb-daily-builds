<div align="center">

# Mood of the Room — Per-Sentence Sentiment in Your Browser

**Paste any text or chat export and see its emotional temperature sentence by sentence. Runs client-side, no API key.**

[![CI](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2f81f7)](https://kbipul.github.io/mood-of-the-room/)

`Day 2` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one AI project a day.

</div>

## What it does

Most sentiment tools give you one number for a whole document, which hides the interesting part. The paragraph that swings from panic to relief comes back as "neutral" and you learn nothing.

Mood of the Room scores each sentence on its own and draws the result as a red-to-green heatmap, so you can see where a conversation actually turned. Paste a support thread or a batch of reviews and you get the emotional shape at a glance, plus a count of how many sentences landed positive, neutral, or negative.

The model is DistilBERT fine-tuned on SST-2, loaded once from the Hugging Face CDN through transformers.js and then run entirely on your device. The text never leaves the tab. No server, no key.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI (a headless-browser job) and committed to `docs/demo.png` shortly after publish, so it may be missing for a few minutes on a fresh deploy.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/mood-of-the-room/)**, runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/mood-of-the-room.git
cd mood-of-the-room
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the unit tests
npm run build    # production build into dist/
```

## How it works

```
 textarea
    │  splitSentences()            (pure, tested)
    ▼
 [ "s1", "s2", … ]
    │  scoreSentence()  ──▶  transformers.js pipeline("text-classification")
    ▼                          Xenova/distilbert-base-uncased-finetuned-sst-2-english
 { label, score }  ──▶ toSigned()  → signed sentiment in [-1, 1]
    │                                    │
    │  scoreToColor()  (HSL heatmap)     │  summarize()  → room-level rollup
    ▼                                    ▼
 per-sentence chips                  overall mood bar
```

Everything worth testing lives in `src/lib/text.ts` and has no ML dependency: `splitSentences`, `toSigned`, `moodLabel`, `scoreToColor`, `summarize`, `formatScore`. `sentiment.ts` is the only file that imports `@huggingface/transformers`, and it does that through a dynamic import behind a lazy singleton. `App.tsx` wires the two together and holds the state. `text.test.ts` covers those six functions in fifteen cases and never touches the network, which is what makes it safe to run in CI, where downloading a model is neither wanted nor reliable.

The pipeline is built on the first "Analyze" and cached in `pipePromise`. A progress callback drives the button label, first `Loading model… n%` and then `Reading… n/total`, so the ~65 MB first load isn't a mystery hang.

SST-2 returns POSITIVE or NEGATIVE plus a confidence. `toSigned` keeps the confidence for POSITIVE, negates it for NEGATIVE, and maps anything else to 0, which gives one number in `[-1, 1]`. That single number feeds both halves of the UI: `scoreToColor` turns it into a hue from 0 to 140 with saturation rising as the score gets more extreme, and `summarize` averages it and counts the buckets.

## Build notes

The real design question was where to put the intelligence. Calling the pipeline straight from the React components and scattering the scoring math through the UI would have been faster to write, and I've been burned by that before. Once the ML call is tangled up with rendering you can't test either half cleanly. So the line is drawn at the file boundary: `text.ts` pure, `sentiment.ts` the only importer of the model. The payoff is a test file that runs in milliseconds and pins down real behavior, including the exact HSL strings at both ends of the ramp, the ±0.2 bucket edges, and what `summarize([])` returns.

The per-sentence framing mattered more than I expected. The demo sample in `seed.ts` is nine lines that run from "I was terrified" through a database outage and back to "genuinely proud." A whole-document score flattens all of that into one mildly positive number.

## What it gets wrong

The neutral band is the weakest part. SST-2 is a binary classifier trained to be confident, so it rarely returns a genuinely middling score; a flat, factual sentence still comes back as 85% one way or the other. `moodLabel` calls anything between -0.2 and +0.2 neutral, which is a threshold I picked, not a class the model has. The right fix is a three-class model (positive/neutral/negative), and I kept the smaller binary one to keep first load fast.

Sentences are scored alone. `scoreSentence` hands the model one sentence with nothing around it, so sarcasm and negation that depend on the previous line are invisible to it. `splitSentences` breaks on `.`, `!`, `?` and newlines, so an abbreviation splits one sentence into two fragments and each fragment gets scored as if it were whole. A sentence carrying praise and complaint at once collapses to a single signed number and a single chip.

There is no accuracy measurement in this repo. `text.test.ts` tests the plumbing: splitting, the label mapping, the color ramp, the roll-up math. Nothing in it checks what the model says about any particular sentence, and I have no numbers on how it holds up on text that looks nothing like the sample. If you paste something and the chip is obviously wrong, that sentence and its score are the bug report I want.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| ML | transformers.js (DistilBERT SST-2), in-browser via WASM |
| Build | Vite 6 |
| Tests | Vitest 2 |
| Demo | GitHub Pages (client-side only) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
