<div align="center">

# Zero-Shot Tagger — Classify Anything Into Your Own Labels

**Type your own labels, paste some text, get an instant classification with no training data. A zero-shot NLI model running in your browser.**

[![CI](https://github.com/kbipul/zero-shot-tagger/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/zero-shot-tagger/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-a371f7)](https://kbipul.github.io/zero-shot-tagger/)

`Day 3` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one AI project a day.

</div>

## What it does

A normal text classifier needs a labelled dataset and a training run before it can tell "billing" from "bug report." Zero-Shot Tagger skips that. You type whatever labels you want for this one piece of text, and the model classifies against them on the spot, having never seen them before. Change "billing, bug, feature" to "urgent, can-wait, spam" and run it again. No retraining, no data, no wait.

The mechanism is zero-shot classification via natural-language inference: each candidate label becomes a hypothesis ("This text is about billing") and the model scores how strongly the input entails it. A small DeBERTa-NLI model is downloaded once from the Hugging Face CDN and runs entirely on your device. Nothing is uploaded and there's no API key.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI (a headless-browser job) and committed to `docs/demo.png` shortly after publish, so it may be missing for a few minutes on a fresh deploy.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/zero-shot-tagger/)**, runs fully in your browser, nothing to install. Three presets (support ticket, product review, news headline) are wired up so you can see it work in one click.

```bash
git clone https://github.com/kbipul/zero-shot-tagger.git
cd zero-shot-tagger
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the unit tests
npm run build    # production build into dist/
```

## How it works

```
 text + "billing, bug, feature"
        │  parseLabels()  (pure, tested: trim, dedupe, cap)
        ▼
 classify(text, labels, multiLabel)
        │        └─▶ transformers.js pipeline("zero-shot-classification")
        │              Xenova/nli-deberta-v3-xsmall
        │              each label → NLI hypothesis → entailment score
        ▼
 { labels[], scores[] }  ──▶ normalizeResult()  → sorted [{label, score}]
        ▼
 ranked bars + best-match verdict
```

A few notes:

1. **Single- vs multi-label is a real switch, not decoration.** In single-label mode the scores are one softmax distribution that sums to 1 ("which one bucket?"). Multi-label scores each hypothesis independently ("which of these apply, maybe several?"). The `multi_label` flag is passed straight through to the pipeline and changes the math, so the toggle does what it says.
2. **The pure logic is kept away from the model.** `parseLabels`, `normalizeResult`, ranking, and percentage formatting live in `src/lib/labels.ts` with no ML imports, and that's the whole tested surface. `classifier.ts` is the only file that touches transformers.js.
3. **Lazy, cached pipeline.** The model is built on the first "Classify" with a progress callback driving the button, then reused for every run after.

## Build notes

Zero-shot still feels a little like a trick even when you know how it works, and building the UI made me explain it to myself properly. There's no classifier head mapping to fixed classes here. The model is a general entailment engine, and "classification" is a framing move: wrap each label in a template sentence, ask "does the input imply this?", and read off the scores. Watching it correctly tag a made-up label set it clearly never trained on is the whole point, so the demo puts the editable labels front and center instead of burying them in a settings panel.

The pure-core, thin-model-shell split is a pattern I keep coming back to across this series, and this one made the payoff obvious. The single-vs-multi-label distinction is genuinely easy to get wrong in your head, so I wanted the shaping logic (parsing, deduping, sorting, the "you need at least two labels" guard) fully under test without loading a 60 MB model in CI. Keeping all of that in `labels.ts` meant I could write a dozen fast assertions that pin the behavior and leave `classifier.ts` as a boring pass-through. When the interesting logic is deterministic and the non-deterministic part is one library call, the tests end up both fast and meaningful.

The obvious limitation is model size. `nli-deberta-v3-xsmall` is chosen for a fast first load, and on subtle or long inputs a bigger NLI model would be more accurate; you can feel it hesitate on ambiguous sentences. For a browser demo that has to download before it can do anything, I'd rather ship something usable in a few seconds and be upfront that accuracy scales with model size. Swapping the model ID is a one-line change if you want to trade load time for precision.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| ML | transformers.js (DeBERTa-v3 NLI, zero-shot), in-browser via WASM |
| Build | Vite 6 |
| Tests | Vitest 2 |
| Demo | GitHub Pages (client-side only) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
