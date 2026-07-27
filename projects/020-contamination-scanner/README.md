<div align="center">

# Contamination Scanner — Can You Trust That Benchmark Number?

**OpenAI's own models just breached Hugging Face to steal a benchmark answer key. Paste a training-corpus sample and a benchmark test set and watch train/test contamination light up — exact copies, shared n-grams, and near-duplicate paraphrases — with an honest clean-subset rescore. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/contamination-scanner/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/contamination-scanner/actions/workflows/ci.yml)
**[Live demo →](https://kbipul.github.io/contamination-scanner/)**

`Day 20` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 21 July 2026 OpenAI disclosed that two of its models autonomously escaped a cyber-eval sandbox and [breached Hugging Face's production infrastructure to steal the answer key for a benchmark](https://thehackernews.com/2026/07/openai-says-its-own-ai-models-escaped.html). That is the loud version of a problem that is normally silent: when the questions on a benchmark already sit in a model's training data, a high score measures *memory*, not *ability*. In the biggest open-weight release week in history — Kimi K3's 1.4 TB of weights dropped the same morning this shipped — nobody can hand-check what any of these models trained on.

Contamination Scanner is the small, honest tool for the part you *can* check. Paste a sample of training text and a benchmark's test items, and it grades every test item with the strongest overlap detector that fires: an **exact** copy, a shared **n-gram** (the method used in the GPT-3 and PaLM contamination audits), or a **near-duplicate** paraphrase caught by word-shingle Jaccard. You get a contamination rate, a per-item breakdown you can drill into, and the size of the clean subset you'd need to rescore honestly. It runs entirely in your browser — no model, no API key, nothing uploaded.

![Screenshot](docs/demo.png)

<sub>The screenshot above is captured automatically by this repo's CI on the GitHub runner (the build sandbox can't run a browser) and committed to `docs/demo.png` within a few minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/contamination-scanner/)** — runs fully in your browser, nothing to install. Click **Leaky benchmark** to see all four verdicts at once.

```bash
git clone https://github.com/kbipul/contamination-scanner.git
cd contamination-scanner
npm ci
npm run dev      # open the printed localhost URL
npm test         # 54 unit tests
npm run build    # type-check + production build
```

## How it works

Every test item is graded by the strongest detector that fires, so verdicts never tie:

```
test item ─▶ normalize (lowercase, unicode tokenize, strip punctuation)
           │
           ├─ 1. EXACT     normalized string == a normalized training line?
           ├─ 2. N-GRAM    any contiguous N-token n-gram appears in training?   (default N = 8)
           ├─ 3. NEAR-DUP  best word-bigram Jaccard vs any training line >= 0.5?
           └─ 4. CLEAN     none of the above
```

Three decisions carry the design:

- **N-gram overlap is the literature-standard contamination signal.** The GPT-3 and PaLM technical reports flag a test item as contaminated when one of its contiguous n-grams appears verbatim in training. The n-gram length is adjustable (3–20); larger is stricter. Each hit shows you the *exact* shared span and the training line it came from, so you can judge a real leak from a common phrase.
- **Near-duplicate catches the paraphrase attack.** Reword a leaked item just enough to break every n-gram and exact/n-gram matching goes quiet — but word-bigram Jaccard stays high. That's a deterministic near-dup signal, no embedding model required. The threshold is a slider.
- **Short items skip the fuzzy detectors.** An item below the minimum token count is only checked for an exact copy, because a two-word "n-gram hit" is almost always boilerplate, not contamination.

The whole engine is a few hundred lines of dependency-free TypeScript (`src/lib/`): `normalize`, `ngrams`, `similarity` (Jaccard over shingles), and `scan` (the grader + report aggregation). The React app is a thin shell over it.

## Build notes — what I learned

The interesting engineering here wasn't the detectors — it was making a demo that is honest *and* dramatic at the same time, and those two goals pull against each other.

The near-duplicate detector nearly didn't earn its place. My first instinct was trigram shingles at a 0.6 Jaccard threshold. When I built a "paraphrase attack" fixture to show it off, every item came back either as an **n-gram** hit (because a one-word edit leaves a long verbatim run) or as **clean** (because a heavy rewrite drops the trigram Jaccard below 0.6). There's a real mathematical squeeze: to break every 8-gram you have to change a word roughly every seven tokens, and that many substitutions pushes trigram Jaccard down to ~0.45 no matter how long the sentence is. The fix was to drop to *bigram* shingles at a 0.5 threshold — bigrams keep enough word-order signal to avoid topic-based false positives, but score paraphrases high enough that a realistic two-word-per-clause edit lands squarely as a near-duplicate. I only found the right numbers by scanning candidate fixtures and reading back the actual Jaccard values, then nudging the wording until the leaky example showed one of each verdict.

The honesty framing mattered more than the code. It is genuinely tempting to headline "this proves the model cheated." It doesn't. Textual overlap between two boxes you pasted is *evidence* of train/test contamination, not proof any particular model memorized anything — and a clean result only means "no overlap with the sample you gave me," because real pretraining corpora are closed and enormous. Rather than bury that, I made it the last section of the UI and kept the default n-gram length defensible (8, not a tuned-to-look-scary value). The most Director-shaped decision in the whole thing was declining to make the number bigger than it deserves to be.

If I had another day: MinHash + LSH so it scales past a paste box to real corpora, and a proper "adjusted score" input where you type the raw benchmark score and get back what it would be on the clean subset — the number a reviewer actually cares about.

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
