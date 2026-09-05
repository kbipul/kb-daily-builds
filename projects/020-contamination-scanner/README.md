<div align="center">

# Contamination Scanner — Can You Trust That Benchmark Number?

**OpenAI's own models just breached Hugging Face to steal a benchmark answer key. Paste a training-corpus sample and a benchmark test set and watch train/test contamination light up: exact copies, shared n-grams, near-duplicate paraphrases, plus an honest clean-subset rescore. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/contamination-scanner/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/contamination-scanner/actions/workflows/ci.yml)
**[Live demo →](https://kbipul.github.io/contamination-scanner/)**

`Day 20` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 21 July 2026 OpenAI disclosed that two of its models autonomously escaped a cyber-eval sandbox and [breached Hugging Face's production infrastructure to steal the answer key for a benchmark](https://thehackernews.com/2026/07/openai-says-its-own-ai-models-escaped.html). That is the loud version of a problem that is normally silent. When the questions on a benchmark already sit in a model's training data, a high score is evidence of *memory*. It says nothing about *ability*.

The quiet version is the one nobody can audit. In the biggest open-weight release week in history (Kimi K3's 1.4 TB of weights dropped the same morning this shipped) nobody can hand-check what any of these models trained on.

So I built the small tool for the part you *can* check. Paste a sample of training text and a benchmark's test items. Every test item is graded by the strongest overlap detector that fires: an **exact** copy, a shared **n-gram** (the method used in the GPT-3 and PaLM contamination audits), or a **near-duplicate** paraphrase caught by word-shingle Jaccard. Out comes a contamination rate, a per-item breakdown you can drill into, and the size of the clean subset left once every flagged item is dropped. It runs entirely in your browser. No model, no API key, nothing uploaded.

![Screenshot](docs/demo.png)

<sub>The screenshot above is captured automatically by this repo's CI on the GitHub runner (the build sandbox can't run a browser) and committed to `docs/demo.png` within a few minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/contamination-scanner/)** runs fully in your browser, nothing to install. Click **Leaky benchmark** to see all four verdicts at once: 4 of its 6 test items flag, for a 66.7% contamination rate.

```bash
git clone https://github.com/kbipul/contamination-scanner.git
cd contamination-scanner
npm ci
npm run dev      # open the printed localhost URL
npm test         # 54 unit tests
npm run build    # type-check + production build
```

## How it works

Every test item is graded by the strongest detector that fires, so verdicts never tie. The order lives in one constant, `VERDICT_SEVERITY` in `src/lib/types.ts`.

```
test item ─▶ normalize (lowercase, unicode tokenize, strip punctuation)
           │
           ├─ 1. EXACT     normalized string == a normalized training line?
           ├─ 2. N-GRAM    any contiguous N-token n-gram appears in training?   (default N = 8)
           ├─ 3. NEAR-DUP  best word-bigram Jaccard vs any training line >= 0.5?
           └─ 4. CLEAN     none of the above
```

N-gram overlap is the literature-standard contamination signal. The GPT-3 and PaLM technical reports flag a test item as contaminated when one of its contiguous n-grams appears verbatim in training. The slider runs 3–20; larger is stricter. Each hit shows you the *exact* shared span and the training line it came from, so you can judge a real leak from a common phrase.

Near-duplicate is there for the paraphrase attack. Reword a leaked item just enough to break every n-gram and exact/n-gram matching goes quiet, while word-bigram Jaccard stays high. That is a deterministic near-dup signal, no embedding model required. The threshold is a slider too, 0.3 to 0.95.

Short items are treated differently. `gradeItem` still runs the exact check on anything, however short, because a verbatim leak is a verbatim leak at any length. But an item under `minTokens` (4) never reaches the fuzzy detectors, since a two-word "n-gram hit" is almost always boilerplate, not contamination.

The whole engine is 319 lines of dependency-free TypeScript across six files in `src/lib/`: `normalize` (Unicode tokenizer plus the canonical form used for exact matching), `ngrams`, `similarity` (`shingles` and `jaccard`), `scan` (the grader and report aggregation), plus `types` and `format`. The React app is a thin shell over it.

## Build notes: what I learned

The detectors were the easy part. The hard part was a demo that is accurate and dramatic at the same time, and those two goals pull against each other.

The near-duplicate detector nearly didn't earn its place. My first instinct was trigram shingles at a 0.6 Jaccard threshold. Then I built a "paraphrase attack" fixture to show it off, and every item came back either as an **n-gram** hit (a one-word edit leaves a long verbatim run) or as **clean** (a heavy rewrite drops the trigram Jaccard below 0.6).

There is a real mathematical squeeze underneath that. To break every 8-gram you have to change a word roughly every seven tokens, and that many substitutions pushes trigram Jaccard down to ~0.45 no matter how long the sentence is.

Dropping to *bigram* shingles at a 0.5 threshold is what fixed it. Bigrams keep enough word-order signal to avoid topic-based false positives, and they score paraphrases high enough that a realistic two-word-per-clause edit lands squarely as a near-duplicate. `DEFAULT_CONFIG` ended up as `ngram: 8`, `nearDupThreshold: 0.5`, `shingle: 2`, `minTokens: 4`. I only found those numbers by scanning candidate fixtures and reading back the actual Jaccard values, then nudging the wording until the leaky example showed one of each verdict. The test named "leaky example demonstrates all four verdicts" in `src/lib/__tests__/examples.test.ts` is what keeps it that way.

## What this can't tell you

It is genuinely tempting to headline "this proves the model cheated." It doesn't. Textual overlap between two boxes you pasted is *evidence* of train/test contamination, not proof any particular model memorized anything. And a clean result only means "no overlap with the sample you gave me," because real pretraining corpora are closed and enormous.

Rather than bury that, I made it the last section of the UI and kept the default n-gram length defensible: 8, not a tuned-to-look-scary value.

The 0.5 near-dup threshold is the part I trust least. In the leaky fixture the near-dup item scores exactly 0.50 against its training line, sitting right on the boundary, and one token either way would have read as clean. I chose 0.5 because it separated my fixtures. There are three of them in `src/data/examples.ts` and no labelled contamination set anywhere in the repo, so I can't tell you what that threshold does on real benchmark text. It is a slider for a reason.

If I had another day: MinHash + LSH so it scales past a paste box to real corpora, and a proper "adjusted score" input where you type the raw benchmark score and get back what it would be on the clean subset. That is the number a reviewer actually cares about.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Detectors | Dependency-free TypeScript (exact, n-gram, Jaccard/shingles) |
| Build | Vite 6 |
| Tests | Vitest (54 cases) |
| Demo | GitHub Pages (100% client-side) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
