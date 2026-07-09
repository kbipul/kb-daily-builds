<div align="center">

# Mood of the Room — Per-Sentence Sentiment in Your Browser

**Paste any text or chat export and see its emotional temperature sentence by sentence. Runs client-side, no API key.**

[![CI](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2f81f7)](https://kbipul.github.io/mood-of-the-room/)

`Day 2` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one AI project a day.

</div>

## What it does

Most sentiment tools give you one number for a whole document, which hides the interesting part. The paragraph that swings from panic to relief comes back as "neutral" and you learn nothing. Mood of the Room scores each sentence on its own and draws the result as a red-to-green heatmap, so you can see where a conversation actually turned. Paste a support thread, a batch of reviews, or a stand-up recap and you get the emotional shape at a glance, plus a summary of how many sentences landed positive, neutral, or negative.

Under the hood it uses a DistilBERT model fine-tuned on SST-2, loaded once from the Hugging Face CDN through transformers.js and then run entirely on your device. The text never leaves the tab. No server, no key.

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

Three things worth pointing out:

1. **Logic and model are kept apart on purpose.** Everything I'd want to test (sentence splitting, the label-to-signed-score mapping, the HSL color ramp, the roll-up math) lives in `src/lib/text.ts` as pure functions with no ML dependency. The model wrapper in `sentiment.ts` is a thin lazy singleton. That keeps the test suite fast and deterministic in CI, where downloading a model is neither wanted nor reliable.
2. **The model loads once, lazily.** The pipeline is built on the first "Analyze" and cached, with a progress callback driving the button label so the ~65 MB first load isn't a mystery hang.
3. **Signed sentiment instead of two labels.** SST-2 gives POSITIVE/NEGATIVE plus a confidence; collapsing that into a single number in `[-1, 1]` makes both the color ramp and the averaging trivial.

## Build notes

The real design question here was where to put the intelligence. It would have been easy to call the pipeline straight from the React components and scatter the scoring math through the UI, but I've been burned by that before. Once the ML call is tangled up with rendering you can't test either half cleanly. So I drew a hard line: `text.ts` is pure and holds all the testable logic, `sentiment.ts` is the only file that imports the model, and `App.tsx` just wires them together. The payoff is a test file that runs in milliseconds and actually pins down the behavior (color ramp, bucket thresholds, the empty-input case) without ever loading a neural net.

The per-sentence framing mattered more than I expected. A whole-document score is almost always "mildly positive" and tells you nothing. Scoring each sentence shows the shape of a conversation instead. The demo sample deliberately runs from "I was terrified" to "genuinely proud," and seeing those two ends colored red and green in the same block is the whole reason the tool exists. The model was never the hard part; getting the output to actually say something was.

The honest rough edge is the neutral band. SST-2 is a binary classifier trained to be confident, so it rarely returns a genuinely middling score. A flat, factual sentence still comes back as 85% one way or the other. I fake a neutral bucket with a threshold near the mean, which is a heuristic, not truth. The right fix is a three-class model (positive/neutral/negative), but I kept the smaller binary one to keep first load fast and noted the trade rather than hiding it.

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
