import { useEffect, useMemo, useRef, useState } from "react";
import { Bm25, type ScoredDoc } from "./lib/bm25";
import { embed, type ProgressCallback } from "./lib/embed";
import { normalizeScores, type FusedDoc } from "./lib/fuse";
import { hybridSearch, LEXICAL, SEMANTIC } from "./lib/search";
import { CORPUS, EXAMPLE_QUERIES } from "./lib/corpus";
import type { Vec } from "./lib/vec";

type ModelState =
  | { kind: "idle" }
  | { kind: "loading"; label: string; pct: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

const RRF_K = 60;
const TOP_N = 6;

export default function App() {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].q);
  const [activeExample, setActiveExample] = useState(0);
  const [model, setModel] = useState<ModelState>({ kind: "idle" });
  const [docVecs, setDocVecs] = useState<Vec[] | null>(null);
  const [queryVec, setQueryVec] = useState<Vec | null>(null);
  const reqId = useRef(0);

  // BM25 index is cheap and synchronous — build it once from the corpus.
  const bm25 = useMemo(
    () => new Bm25(CORPUS.map((p) => `${p.title}. ${p.text}`)),
    [],
  );

  // Kick off the embedding model + corpus vectors on first mount.
  useEffect(() => {
    let alive = true;
    const onProgress: ProgressCallback = (label, pct) => {
      if (alive) setModel({ kind: "loading", label: label || "loading", pct });
    };
    (async () => {
      try {
        setModel({ kind: "loading", label: "download", pct: 0 });
        const vecs = await embed(
          CORPUS.map((p) => `${p.title}. ${p.text}`),
          onProgress,
        );
        if (!alive) return;
        setDocVecs(vecs);
        setModel({ kind: "ready" });
      } catch (e) {
        if (!alive) return;
        setModel({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Re-embed the query whenever it changes and the model is ready.
  useEffect(() => {
    if (model.kind !== "ready") return;
    const id = ++reqId.current;
    let alive = true;
    (async () => {
      try {
        const [v] = await embed([query]);
        if (alive && id === reqId.current) setQueryVec(v);
      } catch {
        if (alive && id === reqId.current) setQueryVec(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [query, model.kind]);

  const results = useMemo(
    () => hybridSearch(bm25, query, queryVec, docVecs, RRF_K),
    [bm25, query, queryVec, docVecs],
  );

  const lexNorm = useMemo(
    () => normalizeScores(results.lexical),
    [results.lexical],
  );
  const semNorm = useMemo(
    () => normalizeScores(results.semantic),
    [results.semantic],
  );

  // Rank of each doc within the lexical / semantic lists, for the "moved up" cue.
  const lexRank = rankMap(results.lexical);
  const semRank = rankMap(results.semantic);

  const semanticReady = results.semantic.length > 0;

  function pickExample(i: number) {
    setActiveExample(i);
    setQuery(EXAMPLE_QUERIES[i].q);
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="tag">Day 013 · kb-daily-builds</div>
        <h1>
          Hybrid Search <span className="dim">= BM25 + Vectors, fused with RRF</span>
        </h1>
        <p className="lede">
          Frontier models now ship million-token context windows (Kimi K3,
          Inkling — both this week), so it is tempting to just retrieve
          everything. But a bigger window is not a retrieval strategy. Watch a
          keyword ranker and a semantic ranker <em>disagree</em> on the same
          query — then watch Reciprocal Rank Fusion combine them into a list
          that is rarely wrong on either. All of it runs in your browser.
        </p>
      </header>

      <section className="controls">
        <input
          className="query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveExample(-1);
          }}
          placeholder="Type a query…"
          aria-label="Search query"
        />
        <div className="examples">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={ex.q}
              className={"chip" + (i === activeExample ? " chip-on" : "")}
              onClick={() => pickExample(i)}
              title={ex.note}
            >
              {ex.q}
            </button>
          ))}
        </div>
        {activeExample >= 0 && (
          <p className="note">{EXAMPLE_QUERIES[activeExample].note}</p>
        )}
        <ModelBanner model={model} />
      </section>

      <section className="columns">
        <Column
          title="Lexical"
          subtitle="BM25 · exact terms"
          accent="lex"
          rows={results.lexical.slice(0, TOP_N)}
          scoreOf={(d) => lexNorm.get(d.id) ?? 0}
          rawOf={(d) => d.score.toFixed(2)}
        />
        <Column
          title="Semantic"
          subtitle="MiniLM vectors · meaning"
          accent="sem"
          rows={results.semantic.slice(0, TOP_N)}
          scoreOf={(d) => semNorm.get(d.id) ?? 0}
          rawOf={(d) => d.score.toFixed(3)}
          placeholder={
            semanticReady
              ? undefined
              : model.kind === "error"
                ? "Embedding model unavailable — showing lexical only."
                : "Embedding the corpus…"
          }
        />
        <HybridColumn
          rows={results.hybrid.slice(0, TOP_N)}
          lexRank={lexRank}
          semRank={semRank}
          ready={semanticReady}
        />
      </section>

      <footer className="foot">
        <p>
          <strong>How the fusion works.</strong> BM25 scores and cosine
          similarities live on different scales, so RRF ignores the numbers and
          fuses on <em>rank</em>: each list adds{" "}
          <code>1 / (k + rank)</code> (k = {RRF_K}) to every document. A passage
          near the top of <em>both</em> lists outranks one that merely tops a
          single list. Green cells above show a document that fusion pulled up
          from a poor position in one of the two rankers.
        </p>
        <p className="src">
          Built by{" "}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a> · IT Director →
          AI/ML ·{" "}
          <a href="https://github.com/kbipul/hybrid-search-ts">source</a>
        </p>
      </footer>
    </div>
  );
}

function ModelBanner({ model }: { model: ModelState }) {
  if (model.kind === "ready")
    return <div className="banner ok">Semantic model ready · on-device</div>;
  if (model.kind === "error")
    return (
      <div className="banner err">
        Could not load the embedding model ({model.message}). Lexical search
        still works.
      </div>
    );
  if (model.kind === "loading")
    return (
      <div className="banner load">
        Loading MiniLM (~23&nbsp;MB, cached after first load) — {model.label}{" "}
        {model.pct > 0 ? `${model.pct}%` : ""}
      </div>
    );
  return null;
}

interface ColumnProps {
  title: string;
  subtitle: string;
  accent: "lex" | "sem";
  rows: ScoredDoc[];
  scoreOf: (d: ScoredDoc) => number;
  rawOf: (d: ScoredDoc) => string;
  placeholder?: string;
}

function Column({
  title,
  subtitle,
  accent,
  rows,
  scoreOf,
  rawOf,
  placeholder,
}: ColumnProps) {
  return (
    <div className={"col col-" + accent}>
      <div className="col-head">
        <h2>{title}</h2>
        <span className="col-sub">{subtitle}</span>
      </div>
      {placeholder ? (
        <div className="empty">{placeholder}</div>
      ) : (
        <ol className="list">
          {rows.map((d, i) => (
            <li key={d.id} className="item">
              <span className="rank">{i + 1}</span>
              <span className="doc">
                <span className="doc-title">{CORPUS[d.id].title}</span>
                <span className="bar">
                  <span
                    className="fill"
                    style={{ width: `${Math.max(4, scoreOf(d) * 100)}%` }}
                  />
                </span>
              </span>
              <span className="raw">{rawOf(d)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function HybridColumn({
  rows,
  lexRank,
  semRank,
  ready,
}: {
  rows: FusedDoc[];
  lexRank: Map<number, number>;
  semRank: Map<number, number>;
  ready: boolean;
}) {
  const maxScore = rows.length ? rows[0].score : 1;
  return (
    <div className="col col-hyb">
      <div className="col-head">
        <h2>Hybrid</h2>
        <span className="col-sub">RRF fusion · best of both</span>
      </div>
      {!ready ? (
        <div className="empty">Waiting on semantic ranking…</div>
      ) : (
        <ol className="list">
          {rows.map((d, i) => {
            const lr = lexRank.get(d.id);
            const sr = semRank.get(d.id);
            // "Rescued": fusion put it in the top-N despite a weak spot in one arm.
            const worst = Math.max(lr ?? 99, sr ?? 99);
            const rescued = worst > rows.length;
            return (
              <li key={d.id} className={"item" + (rescued ? " rescued" : "")}>
                <span className="rank">{i + 1}</span>
                <span className="doc">
                  <span className="doc-title">{CORPUS[d.id].title}</span>
                  <span className="bar">
                    <span
                      className="fill"
                      style={{
                        width: `${Math.max(4, (d.score / maxScore) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="ranks">
                    {LEXICAL} #{lr ?? "—"} · {SEMANTIC} #{sr ?? "—"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function rankMap(list: { id: number }[]): Map<number, number> {
  const m = new Map<number, number>();
  list.forEach((d, i) => m.set(d.id, i + 1));
  return m;
}
