import { useState } from "react";
import { getClassifier, classify } from "./lib/classifier";
import {
  parseLabels,
  canClassify,
  topLabel,
  toPercent,
  type Scored,
} from "./lib/labels";
import { PRESETS } from "./lib/seed";

type Phase = "idle" | "loading" | "classifying" | "done";

export default function App() {
  const [text, setText] = useState(PRESETS[0].text);
  const [labelInput, setLabelInput] = useState(PRESETS[0].labels);
  const [multiLabel, setMultiLabel] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadPct, setLoadPct] = useState(0);
  const [results, setResults] = useState<Scored[]>([]);

  const labels = parseLabels(labelInput);
  const ready = canClassify(text, labels);
  const busy = phase === "loading" || phase === "classifying";

  function applyPreset(i: number) {
    setText(PRESETS[i].text);
    setLabelInput(PRESETS[i].labels);
    setResults([]);
    setPhase("idle");
  }

  async function run() {
    if (!ready) return;
    setPhase("loading");
    setResults([]);
    await getClassifier((status, pct) => {
      setLoadPct(pct);
      if (status === "ready" || status === "done") setLoadPct(100);
    });
    setPhase("classifying");
    const scored = await classify(text, labels, multiLabel);
    setResults(scored);
    setPhase("done");
  }

  const winner = topLabel(results);

  return (
    <main>
      <header>
        <h1>Zero-Shot Tagger</h1>
        <p className="sub">
          Invent your own labels, paste any text, and get an instant
          classification — with <strong>no training data</strong>. A zero-shot
          NLI model runs 100% in your browser; nothing is uploaded.
        </p>
      </header>

      <section className="panel">
        <label className="field-label">Text to classify</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder="Paste a sentence, a ticket, a review…"
        />

        <label className="field-label">
          Candidate labels <span className="hint">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          spellCheck={false}
          placeholder="billing, bug report, feature request…"
        />

        <div className="chips">
          {labels.map((l) => (
            <span key={l} className="pill">
              {l}
            </span>
          ))}
          {labels.length < 2 && (
            <span className="warn">Add at least two labels.</span>
          )}
        </div>

        <div className="options">
          <label className="toggle">
            <input
              type="checkbox"
              checked={multiLabel}
              onChange={(e) => setMultiLabel(e.target.checked)}
            />
            Multi-label{" "}
            <span className="hint">(score each label independently)</span>
          </label>
        </div>

        <div className="actions">
          <button onClick={run} disabled={!ready || busy}>
            {phase === "loading"
              ? `Loading model… ${loadPct}%`
              : phase === "classifying"
                ? "Classifying…"
                : "Classify"}
          </button>
          <div className="presets">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                className="ghost"
                onClick={() => applyPreset(i)}
                disabled={busy}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {winner && (
        <section className="results">
          <div className="verdict">
            Best match: <strong>{winner.label}</strong>{" "}
            <span className="pct">{toPercent(winner.score)}%</span>
          </div>
          {results.map((r) => (
            <div key={r.label} className="result-row">
              <span className="rlabel">{r.label}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{ width: `${toPercent(r.score)}%` }}
                />
              </span>
              <span className="rpct">{toPercent(r.score)}%</span>
            </div>
          ))}
        </section>
      )}

      <footer>
        <span>
          Day 3 of{" "}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>{" "}
          · DeBERTa-NLI via transformers.js · built by{" "}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </span>
      </footer>
    </main>
  );
}
