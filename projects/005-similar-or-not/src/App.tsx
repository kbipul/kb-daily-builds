import { useMemo, useState } from "react";
import { embed, getEmbedder, type ProgressCallback } from "./lib/embed";
import { similarityMatrix, pca2d, fitToBox, type Vec } from "./lib/vec";
import { SAMPLE_SETS } from "./lib/samples";

const MAX_SENTENCES = 12;
const PLOT = 340;
const PAD = 26;

const PALETTE = [
  "#6ea8fe", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#22d3ee",
  "#fb7185", "#4ade80", "#facc15", "#60a5fa", "#c084fc", "#2dd4bf",
];

type Status = "idle" | "loading" | "ready" | "error";

function parseSentences(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SENTENCES);
}

/** Blue→white→red-ish scale for a cosine value in [-1, 1]. */
function simColor(v: number): string {
  const t = Math.max(0, Math.min(1, (v + 1) / 2)); // -1..1 -> 0..1
  const hue = 210 - t * 210; // 210 (blue) -> 0 (red)
  const light = 26 + t * 34; // darker for low sim, brighter for high
  return `hsl(${hue}, 70%, ${light}%)`;
}

export default function App() {
  const [text, setText] = useState(SAMPLE_SETS[0].sentences.join("\n"));
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const [vectors, setVectors] = useState<Vec[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");

  const matrix = useMemo(
    () => (vectors.length ? similarityMatrix(vectors) : []),
    [vectors],
  );
  const points = useMemo(() => {
    if (vectors.length < 2) return [];
    return fitToBox(pca2d(vectors), PLOT, PAD);
  }, [vectors]);

  const onProgress: ProgressCallback = (s, pct) => {
    setProgressLabel(s);
    setProgress(pct);
  };

  async function run() {
    const parsed = parseSentences(text);
    if (parsed.length < 2) {
      setError("Enter at least two sentences (one per line).");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("loading");
    setProgress(0);
    setSelected(null);
    try {
      await getEmbedder(onProgress); // warms + reports download progress
      const vecs = await embed(parsed);
      setSentences(parsed);
      setVectors(vecs);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  function loadSample(i: number) {
    setText(SAMPLE_SETS[i].sentences.join("\n"));
  }

  return (
    <div className="wrap">
      <header>
        <h1>
          Similar or Not <span className="chip">Day 5 · kb-daily-builds</span>
        </h1>
        <p className="sub">
          Type a few sentences and watch a language model turn meaning into
          geometry: each line becomes a 384‑dimensional embedding, then a
          cosine‑similarity heatmap and a 2D map show what the model thinks is
          close. Everything runs in your browser — the model downloads once and
          never phones home.
        </p>
      </header>

      <section className="panel">
        <div className="row samples">
          <span className="label">Load a set:</span>
          {SAMPLE_SETS.map((s, i) => (
            <button key={s.name} className="ghost" onClick={() => loadSample(i)}>
              {s.name}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="label">Sentences — one per line (up to {MAX_SENTENCES})</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            spellCheck={false}
          />
        </label>
        <div className="row spread">
          <button className="primary" onClick={run} disabled={status === "loading"}>
            {status === "loading" ? "Embedding…" : "Embed & compare"}
          </button>
          <span className="hint">
            {parseSentences(text).length} sentence
            {parseSentences(text).length === 1 ? "" : "s"} ready
          </span>
        </div>

        {status === "loading" && (
          <div className="progress">
            <div className="track">
              <div className="fill" style={{ width: progress + "%" }} />
            </div>
            <span className="plabel">
              {progressLabel || "loading model"} · {progress}%
              {progress === 0 && " — first run downloads ~23MB, then it's cached"}
            </span>
          </div>
        )}
        {status === "error" && <p className="err">{error}</p>}
      </section>

      {status === "ready" && vectors.length >= 2 && (
        <section className="viz">
          <div className="card">
            <h2>Semantic map</h2>
            <p className="cardsub">
              PCA of the embeddings to 2D. Closer dots ≈ closer meaning.
            </p>
            <svg
              viewBox={`0 0 ${PLOT} ${PLOT}`}
              className="scatter"
              role="img"
              aria-label="2D map of sentence embeddings"
            >
              {points.map(([x, y], i) => (
                <g
                  key={i}
                  onMouseEnter={() => setSelected(i)}
                  onMouseLeave={() => setSelected(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={selected === i ? 11 : 8}
                    fill={PALETTE[i % PALETTE.length]}
                    stroke="#0b1020"
                    strokeWidth={2}
                  />
                  <text x={x} y={y + 4} className="dotlabel">
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="card">
            <h2>Similarity heatmap</h2>
            <p className="cardsub">
              Cosine similarity for every pair. Brighter = more alike.
            </p>
            <div
              className="heat"
              style={{
                gridTemplateColumns: `repeat(${sentences.length}, 1fr)`,
              }}
            >
              {matrix.map((rowArr, i) =>
                rowArr.map((v, j) => (
                  <div
                    key={`${i}-${j}`}
                    className="cell"
                    style={{ background: simColor(v) }}
                    title={`#${i + 1} ↔ #${j + 1}: ${v.toFixed(3)}`}
                    onMouseEnter={() => setSelected(i === j ? i : null)}
                  >
                    {v.toFixed(2)}
                  </div>
                )),
              )}
            </div>
          </div>
        </section>
      )}

      {status === "ready" && (
        <section className="legend">
          <h2>Sentences</h2>
          <ol>
            {sentences.map((s, i) => (
              <li
                key={i}
                className={selected === i ? "sel" : ""}
                onMouseEnter={() => setSelected(i)}
                onMouseLeave={() => setSelected(null)}
              >
                <span
                  className="swatch"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {s}
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer>
        Built by{" "}
        <a href="https://www.kumarbipul.com">
          <b>Kumar Bipul</b>
        </a>{" "}
        · IT Director → AI/ML ·{" "}
        <a href="https://github.com/kbipul">github.com/kbipul</a>
      </footer>
    </div>
  );
}
