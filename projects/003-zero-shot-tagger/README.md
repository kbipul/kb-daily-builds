<div align="center">

# Zero-Shot Tagger — Classify Anything Into Your Own Labels

**Type your own labels, paste some text, get an instant classification with no training data. A zero-shot NLI model running in your browser.**

[![CI](https://github.com/kbipul/zero-shot-tagger/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/zero-shot-tagger/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-a371f7)](https://kbipul.github.io/zero-shot-tagger/)

`Day 3` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one AI project a day.

</div>

## What it does

A normal text classifier needs a labelled dataset and a training run before it can tell "billing" from "bug report." Zero-Shot Tagger skips that. You type whatever labels you want for this one piece of text, and the model classifies against them on the spot, having never seen them before. Change "billing, bug, feature" to "urgent, can-wait, spam" and run it again. No retraining, no data.

The mechanism is zero-shot classification via natural-language inference. Each candidate label becomes a hypothesis ("This text is about billing") and the model scores how strongly the input entails it. `classifier.ts` pins one model ID, `Xenova/nli-deberta-v3-xsmall`, a small DeBERTa-NLI model downloaded once from the Hugging Face CDN and run entirely on your device. Nothing is uploaded and there's no API key.

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

The multi-label checkbox is not decoration. Leave it off and the pipeline returns one softmax distribution that sums to 1: which single bucket does this belong in? Turn it on and every hypothesis is scored on its own, so several labels can come back high at once. `classify()` in `classifier.ts` passes `multi_label` straight through to the pipeline. The toggle changes the math, not the presentation.

Everything worth unit-testing sits in `src/lib/labels.ts`, which imports nothing at all: `parseLabels`, `normalizeResult`, `topLabel`, `toPercent`, `canClassify`. `classifier.ts` is the only file in the repo that touches transformers.js. It holds `MODEL_ID`, a lazy `getClassifier()` that caches the built pipeline in `pipePromise`, and a `classify()` whose last act is to hand the raw output to `normalizeResult`.

Model download is deferred until you actually press Classify. A `progress_callback` writes the download percentage into the button label itself, which counts up from `Loading model…` to `Classifying…` and then back to `Classify` for every run after. `App.tsx` blocks the button entirely until `canClassify()` is satisfied, and shows "Add at least two labels." underneath while it isn't.

## Build notes

Zero-shot still feels a little like a trick even when you know how it works, and building the UI made me explain it to myself properly. There's no classifier head mapping to fixed classes here. The model is a general entailment engine, and "classification" is a framing move: wrap each label in a template sentence, ask "does the input imply this?", and read off the scores. Watching it correctly tag a made-up label set it clearly never trained on is the whole point, so the demo puts the editable labels front and center instead of burying them in a settings panel.

The pure-core, thin-model-shell split is a pattern I keep coming back to across this series. Single- versus multi-label is easy to get backwards in your head, and I wanted the shaping logic under test without loading a 60 MB model in CI. Keeping it in `labels.ts` bought me fifteen assertions across ten `it()` blocks in `labels.test.ts`, all of which run without a network. They pin the small decisions I'd otherwise forget: `parseLabels("Bug, bug, BUG, feature")` keeps the first spelling and returns `["Bug", "feature"]`, `normalizeResult` tolerates a scores array shorter than its labels array and fills the gap with 0, and `canClassify` rejects whitespace-only text. `classifier.ts` stayed a pass-through, which is the point of putting it on the other side of the line.

## What I don't know yet

Model size is the limitation I can name. `nli-deberta-v3-xsmall` is chosen for a fast first load, and on subtle or long inputs a bigger NLI model would be more accurate; you can feel it hesitate on ambiguous sentences. For a browser demo that has to download before it can do anything, I'd rather ship something usable in a few seconds and be upfront that accuracy scales with model size. Swapping the model ID is a one-line change in `classifier.ts` if you want to trade load time for precision.

The one I can't name is label wording. Every label goes into the NLI template as a hypothesis, so the phrasing of the label is part of the prompt. Rename "bug report" to "software defect" and the entailment scores move, on the same input, with the same model. The seed presets in `seed.ts` use labels I picked because they read well, not because I compared them against alternatives. And there is nothing in this repo that would tell me if I'd picked badly: `labels.test.ts` checks parsing, sorting and rounding, none of which say anything about whether a classification is right. There's no held-out set here, no accuracy number anywhere in the project, and I don't currently know how much of the demo's apparent competence is the model and how much is me having phrased the labels in its favour.

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
