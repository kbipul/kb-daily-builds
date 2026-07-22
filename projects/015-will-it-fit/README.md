<div align="center">

# Will It Fit?

**Pick an open-weight LLM (Kimi K3, LongCat-2.0, GPT-OSS…), a quantization, and your GPU or Azure VM — instantly see if it fits in VRAM and how fast it decodes. 100% in your browser, no API key.**

[![CI](https://github.com/kbipul/will-it-fit/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/will-it-fit/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ec16a)](https://kbipul.github.io/will-it-fit/)

`Day 15` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

This week the open-weight frontier got enormous — **Kimi K3** (2.8T params, 1M context, weights dropping 27 Jul 2026) and **LongCat-2.0** (1.6T). The moment those weights land, everyone asks the same practical question: *can I actually run this, and on what?* **Will It Fit?** answers it before you provision a single GPU. Pick a model, a quantization, and a context length; it computes the real VRAM footprint (weights + KV cache + overhead) and lights up a grid of consumer GPUs, datacenter cards, and Azure VM SKUs as **Fits / Tight / Multi-GPU / Won't fit**, with a memory-bandwidth-bound decode-throughput estimate for each.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured automatically by this repo's CI on a GitHub runner and committed to `docs/demo.png` a few minutes after publish — the build sandbox can't run a browser, so it is never faked.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/will-it-fit/)** — runs fully in your browser, nothing to install, no key.

```bash
git clone https://github.com/kbipul/will-it-fit.git
cd will-it-fit
npm ci
npm run dev      # open the printed localhost URL
npm test         # 15 unit tests over the sizing + fit math
```

## How it works

Three pure functions, each unit-tested, do all the reasoning:

```
memoryFootprint(model, quant, ctx, batch)
   weights  = totalParams × bytesPerParam        ← ALL experts, even in MoE
   kvCache  = 2 × layers × (hidden ÷ GQA) × ctx × batch × 2B
   overhead = 10% of weights + 1GB
evaluateFit(mem, hardware)  → Fits | Tight | Multi-GPU | Won't fit  (+ GPUs needed)
throughput(model, quant, hw) → tok/s ≈ bandwidth ÷ (activeParams × bytesPerParam)
```

The one insight the whole tool is built around: **a Mixture-of-Experts model is sized by its *total* parameters, not its active ones.** Kimi K3 is marketed as "32B active", but all 2.8T weights must be resident in VRAM — only a subset *activate* per token. Weights follow the full 2.8T; decode speed follows the 32B active. That split is why MoE models get badly under-provisioned, and the app calls it out explicitly.

## Build notes — what I learned

I set out to build a cost calculator and ended up building a humility machine. The first "aha" was writing the MoE test: Kimi K3 in its native MXFP4 (0.53 bytes/param) is 2800 × 0.53 ≈ **1,484 GB of weights alone**. My gut said "an 8×MI300X box has 1,536 GB, it'll just fit." The test disagreed — once you add the ~10% activation/framework overhead you're at ~1,634 GB, and it *doesn't* fit on a single 8-GPU node at all. I'd written the assertion expecting `multi`; the code returned `no`, and the code was right. I changed the test, not the math. That failing-test-that-was-actually-correct is now one of the more interesting things the demo teaches.

The KV-cache term is where honesty gets hard. The exact per-model head geometry for brand-new releases (Kimi K3's KDA attention, LongCat's expert layout) isn't fully public yet, so I model the cache from hidden-size ÷ a GQA grouping factor and make **every architecture field editable** — the calculator's arithmetic is exact, but I refuse to pretend the inputs for a six-day-old model are gospel. Kimi K3's own KDA reportedly cuts KV by ~75%; rather than hard-code that, I let you dial the context and watch the cache term move.

Throughput is the classic back-of-envelope: decode is memory-bandwidth bound, so tok/s ≈ bandwidth ÷ active-bytes-per-token. It's deliberately labelled an estimate — paged KV, KV quantization, and tensor-parallel communication each move the real number, and multi-GPU I discount to 70% efficiency. The point isn't a benchmark; it's the *shape* of the trade-off: why a 120B MoE with 5B active out-decodes a dense 405B on the very same H100.

Keeping it a pile of pure functions paid off twice — the 15 Vitest cases run in 2 ms and gave me the confidence to trust a counter-intuitive result over my intuition, and the whole thing ships as a static page with zero model download, so the live demo never spins a loader. As an IT Director this is the layer I actually care about: not "look, a model," but "here's the VM SKU you provision and the token rate you'll get for it."

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 (`base: /will-it-fit/` for Pages) |
| Tests | Vitest (15 cases over the sizing/fit/throughput math) |
| Data | Curated model, quant, GPU & Azure-VM tables — all editable, no backend |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
