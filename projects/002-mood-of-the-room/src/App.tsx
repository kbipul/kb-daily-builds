import { useState } from "react";
import { getSentiment, scoreSentence } from "./lib/sentiment";
import {
  splitSentences,
  summarize,
  scoreToColor,
  formatScore,
  moodLabel,
  type MoodSummary,
} from "./lib/text";
import { SAMPLE_TEXT } from "./lib/seed";

interface Scored {
  sentence: string;
  signed: number;
}

type Phase = "idle" | "loading" | "scoring" | "done";

export default function App() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadPct, setLoadPct] = useState(0);
  const [rows, setRows] = useState<Scored[]>([]);
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function analyze() {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;

    setPhase("loading");
    setRows([]);
    setSummary(null);
    // Warm up the model (first call downloads + compiles; cached afterwards).
    await getSentiment((status, pct) => {
      setLoadPct(pct);
      if (status === "ready" || status === "done") setLoadPct(100);
    });

    setPhase("scoring");
    setProgress({ done: 0, total: sentences.length });
    const scored: Scored[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const signed = await scoreSentence(sentences[i]);
      scored.push({ sentence: sentences[i], signed });
      setRows([...scored]);
      setProgress({ done: i + 1, total: sentences.length });
    }
    setSummary(summarize(scored.map((s) => s.signed)));
    setPhase("done");
  }

  const busy = phase === "loading" || phase === "scoring";

  return (
    <main>
      <header>
        <h1>Mood of the Room</h1>
        <p className="sub">
          Paste any text or chat export and see its emotional temperature{" "}
          <strong>sentence by sentence</strong>. The model runs 100% in your
          browser — nothing is uploaded, no API key required.
        </p>
      </header>

      <section className="panel">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={8}
          placeholder="Paste a conversation, a review dump, a stand-up thread…"
        />
        <div className="actions">
          <button onClick={analyze} disabled={busy}>
            {phase === "loading"
              ? `Loading model… ${loadPct}%`
              : phase === "scoring"
                ? `Reading… ${progress.done}/${progress.total}`
                : "Analyze mood"}
          </button>
          <button
            className="ghost"
            onClick={() => setText(SAMPLE_TEXT)}
            disabled={busy}
          >
            Reset sample
          </button>
        </div>
      </section>

      {summary && (
        <section className={`summary ${summary.overall}`}>
          <div className="big">
            Overall mood: <strong>{summary.overall}</strong>{" "}
            <span className="mean">({formatScore(summary.mean)})</span>
          </div>
          <div className="bar">
            <span
              className="seg pos"
              style={{ flexGrow: summary.positive || 0.001 }}
              title={`${summary.positive} positive`}
            />
            <span
              className="seg neu"
              style={{ flexGrow: summary.neutral || 0.001 }}
              title={`${summary.neutral} neutral`}
            />
            <span
              className="seg neg"
              style={{ flexGrow: summary.negative || 0.001 }}
              title={`${summary.negative} negative`}
            />
          </div>
          <div className="legend">
            <span>😊 {summary.positive} positive</span>
            <span>😐 {summary.neutral} neutral</span>
            <span>😞 {summary.negative} negative</span>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="rows">
          {rows.map((r, i) => (
            <div key={i} className="row">
              <span
                className="chip"
                style={{ background: scoreToColor(r.signed) }}
                title={moodLabel(r.signed)}
              >
                {formatScore(r.signed)}
              </span>
              <span className="text">{r.sentence}</span>
            </div>
          ))}
        </section>
      )}

      <footer>
        <span>
          Day 2 of{" "}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>{" "}
          · DistilBERT SST-2 via transformers.js · built by{" "}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </span>
      </footer>
    </main>
  );
}
