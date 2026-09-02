<div align="center">

# Token Cost Lab — See What a Prompt Actually Costs

**Paste a prompt, pick your models, and watch the per-request cost light up across GPT-5.6 Sol/Terra/Luna, Claude Fable 5/Opus 5/Sonnet 5/Haiku 4.5 and Grok 4.5 — tokenized 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/token-cost-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/token-cost-lab/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-34d399)](https://kbipul.github.io/token-cost-lab/)

`Day 4` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Between 30 July and 21 August 2026, OpenAI cut GPT‑5.6 prices twice — Terra by 20%, Luna by roughly **80%** — and on 10 August Anthropic **cancelled** the Sonnet 5 price increase that was due to land on 1 September, making the $2/$10 introductory rate permanent. If you picked a model on July pricing, at least three of your numbers are now wrong, and one of them is wrong by 50%.

Token Cost Lab answers "which model is actually cheapest for *my* workload?": paste a prompt, set an expected reply length, and it tokenizes the text in your browser and ranks eight frontier models by real per‑request cost, then projects it to a monthly bill at your request volume.

The twist is honesty about tokenization. Sonnet 5 ships a tokenizer that emits roughly 42% more tokens on English text than an OpenAI‑style one, so a headline "$/token" hides real spend. Every model carries an editable **token multiplier** that nudges the browser's count toward that model's actual billing — and every price is editable, because, as the last eight weeks demonstrated, list prices move.

![Screenshot](docs/demo.png)

> The screenshot is captured automatically by this repo's CI on a GitHub runner (the build sandbox can't run a browser) and committed to `docs/demo.png` within minutes of publish.

## Try it

**[Live demo →](https://kbipul.github.io/token-cost-lab/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/token-cost-lab
cd token-cost-lab
npm ci
npm run dev      # open the printed localhost URL
npm test         # run the cost-math unit tests
npm run build    # type-check + production build
```

## How it works

```
prompt ──► gpt-tokenizer (o200k_base) ──► base token count
                                              │
   per model:  base × tokenMultiplier ──► billed tokens
                                              │
   (tokens ÷ 1e6) × price/1M ──► input$ + output$ ──► ranked bars ──► ×volume ──► monthly$
```

Three deliberate decisions:

1. **One tokenizer, explicit corrections.** Shipping a separate exact tokenizer for every vendor bloats the bundle and still drifts. Instead the app counts once with `o200k_base` and exposes a per‑model multiplier — transparent, editable, and testable — rather than pretending to bill each provider perfectly.
2. **Pure cost math, isolated from React and from the tokenizer.** All pricing arithmetic lives in `src/lib/cost.ts` with zero imports from React or `gpt-tokenizer`, so the logic is covered by fast unit tests and the UI is a thin wiring layer.
3. **Prices are inputs, not facts.** Defaults are seeded from publicly cited list rates, stamped with an "as of" date, and annotated with what changed and when — but the whole table is editable and resettable. The tool's value is the math, not a claim to be a live price feed.

## Build notes — what I learned

I started this thinking the hard part was pricing data. It wasn't — it was tokenization. The moment you compare providers you're implicitly claiming their token counts are comparable, and they aren't. Sonnet 5's tokenizer change is the clearest example: the same paragraph can be ~40% more tokens, which quietly erases an apparent price advantage. Rather than hide that, I made it a first‑class, editable knob and put the caveat on the screen. It turned a "cost calculator" into something that actually teaches the reader why headline prices mislead.

Keeping the money math pure paid off immediately. Because `cost.ts` never imports React or the tokenizer, I could test six functions — rounding, multiplier application, ranking, monthly scaling, and the currency formatter that has to stay useful from sub‑cent requests to five‑figure monthly bills — without spinning up a DOM or downloading a tokenizer. The React component ended up being almost entirely presentation.

The honesty constraint shaped the product more than any feature did. I only shipped default prices for models I could ground in public reporting this week (GPT‑5.6 Terra/Luna, Sonnet 5, Grok 4.5) and made every field editable with a visible "verify before you rely on this" disclaimer, so the tool is useful without pretending to be a pricing oracle. If I extend it, the next step is an import/export of pricing tables so teams can pin their negotiated enterprise rates.

### Refresh — 2026-09-02

I came back to this eight weeks after building it, and the tool had quietly become wrong. That is the more interesting lesson than anything in the original build.

Three of the four shipped prices had moved. OpenAI cut Terra 20% and Luna about 80% on 30 July, then cut Sol again on 21 August. Anthropic cancelled the Sonnet 5 step‑up on 10 August. That last one is the instructive failure: the original table hard‑coded $3/$15 with a note saying "intro $2/$10 through Aug 2026", so it wasn't merely out of date, it had **pre‑committed to a future that never happened** and overstated Sonnet 5 by 50% from 1 September onward. Encoding a scheduled change as fact is worse than encoding today's price, because it fails silently on a date nobody is watching.

Finding it also required searching the right way. Re‑reading the launch‑week explainers I originally cited would have confirmed every stale number, because those articles are still perfectly accurate *about the launch* and simply silent about anything after it. Re‑verifying a snapshot is not a freshness check. The query that found the truth was for the *change* — "did this price move since" — not for the price.

What changed in the code: the catalogue went from four models to eight (adding GPT‑5.6 Sol, Claude Opus 5, Haiku 4.5, and Fable 5), and I added `pricing.test.ts` — twelve tests that guard the invariants a hand‑edited data refresh actually breaks: duplicate ids, a decimal typo that prices output below input, a multiplier outside a sane band, an "as of" stamp in the future, or a model whose sourcing note went missing. Data can't be unit‑tested for correctness, but it can be tested for coherence.

Two honesty notes I chose not to paper over. Opus 5 and Fable 5 keep a 1.0x token multiplier even though they are gen‑5 siblings of Sonnet 5, because the ~1.42x inflation has only been publicly measured on Sonnet 5 — guessing would have been the same mistake in a new place. And the high‑context surcharges (Grok doubles above 200K tokens, Sol bills 2x input above 272K) are documented in the model notes but deliberately not modelled, because modelling them halfway would be worse than saying so.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Tokenizer | `gpt-tokenizer` (o200k_base, client‑side) |
| Build/test | Vite 6, Vitest 2 |
| Deploy | GitHub Pages (static, no backend) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
