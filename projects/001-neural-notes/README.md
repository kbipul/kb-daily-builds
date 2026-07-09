<div align="center">

# Neural Notes — AI Search That Understands Meaning

**Semantic note search running 100% in your browser. No server, no API key, your notes never leave the tab.**

[![CI](https://github.com/kbipul/neural-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/neural-notes/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-9B0000)](https://kbipul.github.io/neural-notes/)

`Day 001` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)**, one AI project a day.

</div>

## What it does

Search for "car trouble" and it finds your note about squeaking brake pads, even though the two share no words. Neural Notes embeds each note into a 384-dimension vector with MiniLM (running in the browser tab via transformers.js) and ranks notes by cosine similarity to your query. There's a toggle that shows plain keyword search next to the semantic results so you can compare the two directly. Notes are kept in localStorage; nothing is sent anywhere.

![Neural Notes screenshot](docs/demo.png)
<sub>The screenshot is captured by CI on push. If it's missing here, the workflow probably hasn't finished yet.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/neural-notes/)**. The first load pulls the ~23 MB quantized model once and caches it after that. Try `feeling stressed`, `car trouble`, or `money planning` against the seed notes.

```bash
git clone https://github.com/kbipul/neural-notes.git
cd neural-notes
npm install
npm test        # 15 unit tests on the search core
npm run dev     # http://localhost:5173
```

## How it works

```
your note ──▶ MiniLM-L6-v2 (ONNX, WASM/WebGPU) ──▶ 384-dim vector
                                                        │
query ──▶ same model ──▶ query vector ──▶ cosine similarity ──▶ ranked results
```

A few things I settled on while building it:

1. **The model is a lazy import.** The app paints immediately and transformers.js plus the ONNX model load in the background, with progress shown in the UI. If the download fails, it falls back to keyword search rather than breaking.
2. **The search core is plain TypeScript**, with no React, no model, and no I/O, so it can be unit-tested on its own. The embedder sits behind a one-method interface and the tests feed it vectors directly.
3. **Vectors aren't persisted.** localStorage holds only the note text (small and private) and embeddings are recomputed on load. Model versions change, and stale vectors on disk are the kind of silent-corruption bug you don't notice until it's a problem.

## Build notes

Quantized `q8` MiniLM is about a quarter the size of the full model and, for note search, I couldn't tell the difference in quality. The part that tripped me up was scoring. Normalized MiniLM cosine similarities mostly land between 0.1 and 0.8, so a raw 0.45 looks weak on screen when it's actually a solid match. Mapping `(cos+1)/2` onto a bar keeps the display honest without pretending it's a percentage match.

The bigger takeaway was architectural. Moving the whole pipeline into the browser isn't only a privacy angle; it removes three operational headaches at once: no inference server to scale, no key to rotate, no user data to store. For a lot of internal tooling (this is day one of a series poking at exactly that), shipping the model to the browser is a real option worth considering.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 |
| Inference | transformers.js (`Xenova/all-MiniLM-L6-v2`, q8 ONNX) |
| Build / test | Vite 6, Vitest |
| Hosting | GitHub Pages (static, no backend) |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
