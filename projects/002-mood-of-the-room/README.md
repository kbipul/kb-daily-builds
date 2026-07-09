<div align="center">

# Mood of the Room — Per-Sentence Sentiment in Your Browser

**Paste any text or chat export and watch its emotional temperature light up sentence by sentence — 100% client-side, no API key.**

[![CI](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/mood-of-the-room/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2f81f7)](https://kbipul.github.io/mood-of-the-room/)

`Day 2` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Most sentiment tools hand you a single number for a whole document, which hides the story — the paragraph that swings from panic to relief reads as "neutral" and you learn nothing. **Mood of the Room** scores every sentence individually and renders the result as a red→green heatmap, so you can *see* where a conversation turned. Paste a support thread, a batch of reviews, or a stand-up recap and the emotional arc is obvious at a glance, plus a room-level summary of how many sentences landed positive, neutral, or negative.

It rides this week's release of **transformers.js v4**: a DistilBERT model fine-tuned on SST-2 is downloaded once from the Hugging Face CDN and then runs entirely on your device. Your text never leaves the tab — no server, no upload, no key.

![Screenshot](docs/demo.png)

> The screenshot above is captured automatically by this repo's CI (a headless-browser job) and committed to `docs/demo.png` within a few minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/mood-of-the-room/)** — runs fully in your browser, nothing to install.

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
    │  splitSentences()            ← pure, tested
    ▼
 [ "s1", "s2", … ]
    │  scoreSentence()  ──▶  transformers.js pipeline("text-classification")
    ▼                          Xenova/distilbert-base-uncased-finetuned-sst-2-english
 { label, score }  ──▶ toSigned()  → signed sentiment in [-1, 1]
    │                                    │
    │  scoreToColor()  ← HSL heatmap     │  summarize()  → room-level rollup
    ▼                                    ▼
 per-sentence chips                  overall mood bar
```

Three decisions worth calling out:

1. **Logic and model are separated on purpose.** Everything worth testing — sentence splitting, the label→signed-score mapping, the HSL color ramp, the roll-up math — lives in `src/lib/text.ts` as pure functions with no ML dependency. The model wrapper (`sentiment.ts`) is a thin lazy singleton. That keeps the test suite fast and deterministic in CI, where downloading a model is neither wanted nor reliable.
2. **The model loads once, lazily.** The pipeline is constructed on first "Analyze" and cached, with a progress callback driving the button label so the ~65 MB first-load isn't a mystery hang.
3. **Signed sentiment, not two labels.** SST-2 emits POSITIVE/NEGATIVE + confidence; collapsing that to a single signed number in `[-1, 1]` makes both the heatmap ramp and the averaging trivial.

## Build notes — what I learned

The interesting design tension on this one was *where the intelligence lives*. It would have been easy to let React components call the pipeline directly and sprinkle scoring math through the UI. I've been burned by that before — the moment your ML call is entangled with rendering, you can't test either half. So I drew a hard line: `text.ts` is pure and carries 100% of the testable logic, `sentiment.ts` is the only file that imports the model, and `App.tsx` just orchestrates. The payoff is a test file that runs in milliseconds and actually pins down behavior (color ramp, bucket thresholds, the empty-input case) without ever touching a neural net.

The per-sentence framing turned out to matter more than I expected. A whole-document sentiment score is almost always "mildly positive" and tells you nothing. Scoring each sentence surfaces the *shape* of a conversation — the demo sample deliberately swings from "I was terrified" to "genuinely proud," and seeing those two poles colored red and green in the same block is the whole point. It's a good reminder that the model was never the hard part; the framing of the output is what makes it useful.

The honest rough edge is the neutral band. SST-2 is a binary classifier trained to be confident, so it rarely emits a genuinely middling score — a flat, factual sentence still comes back as 85% something. I fake a neutral bucket with a threshold around the mean, which is a heuristic, not ground truth. A three-class model (positive/neutral/negative) would be the correct fix; I kept the smaller binary model to keep first-load fast, and noted the trade rather than hiding it.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| ML | transformers.js (DistilBERT SST-2), runs in-browser via WASM |
| Build | Vite 6 |
| Tests | Vitest 2 |
| Demo | GitHub Pages (client-side only) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
