import { useMemo, useState } from "react";
import { packAll } from "./lib/pack";
import { parseSources, scoreChunks } from "./lib/score";
import { SAMPLE_QUERY, SAMPLE_SOURCES } from "./lib/samples";
import { TOKENIZER_NAME } from "./lib/tokenizer";
import type { PackResult } from "./lib/types";

const fmt = (n: number) => n.toLocaleString("en-US");
const round = (n: number) => Math.round(n * 100) / 100;

export default function App() {
  const [sourcesText, setSourcesText] = useState(SAMPLE_SOURCES);
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [budget, setBudget] = useState(120);

  const sources = useMemo(() => parseSources(sourcesText), [sourcesText]);
  const chunks = useMemo(() => scoreChunks(sources, query), [sources, query]);
  const totalTokens = useMemo(() => chunks.reduce((s, c) => s + c.tokens, 0), [chunks]);
  const results = useMemo(() => packAll(chunks, budget), [chunks, budget]);

  const [firstFitR, greedyR, knapsackR] = results;
  const best = knapsackR; // optimal by construction
  const keptSet = new Set(best.selectedIds);

  const uplift =
    firstFitR.relevanceCaptured > 0
      ? Math.round(
          ((best.relevanceCaptured - firstFitR.relevanceCaptured) /
            firstFitR.relevanceCaptured) *
            100,
        )
      : 0;

  return (
    <div className="wrap">
      <header>
        <span className="daybadge">Day 12 · kb-daily-builds</span>
        <h1>Context Window Packer</h1>
        <p className="tag">
          Fit the <em>best</em> context into N tokens. Paste your sources, set a
          token budget, and a from-scratch 0/1-knapsack packer picks the
          highest-relevance subset that fits — beating the naive truncation most
          RAG pipelines actually ship. Runs 100% in your browser.
        </p>
        <p className="signal">
          Signal (Jul 2026): Thinking Machines' <strong>Inkling</strong> ships a
          1,000,000-token window. Bigger windows make <em>what you put in them</em>{" "}
          the real skill — this tool makes that decision visible.
        </p>
      </header>

      <div className="controls">
        <div className="full">
          <label htmlFor="q">Query — what the context needs to answer (BM25 relevance)</label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Leave empty to weight every block equally"
          />
        </div>
        <div className="full">
          <label htmlFor="src">
            Sources — separate blocks with a line containing only <code>---</code>
          </label>
          <textarea
            id="src"
            value={sourcesText}
            onChange={(e) => setSourcesText(e.target.value)}
          />
          <div className="hint">
            {sources.length} blocks · {fmt(totalTokens)} tokens total ({TOKENIZER_NAME}).
          </div>
        </div>
        <div className="full">
          <label htmlFor="b">Token budget</label>
          <div className="budget-row">
            <input
              id="b"
              type="range"
              min={20}
              max={Math.max(200, totalTokens)}
              step={10}
              value={Math.min(budget, Math.max(200, totalTokens))}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <span className="budget-val">{fmt(budget)} tok</span>
          </div>
          <div className="hint">
            Drag below the total to force a real choice. The packer scales its DP
            table, so budgets up to a 1M window stay instant.
          </div>
        </div>
      </div>

      <div className="cards">
        <StrategyCard r={firstFitR} budget={budget} chunkCount={sources.length} />
        <StrategyCard r={greedyR} budget={budget} chunkCount={sources.length} />
        <StrategyCard r={knapsackR} budget={budget} chunkCount={sources.length} isBest />
      </div>

      {uplift > 0 && (
        <p>
          At this budget, optimal packing captures{" "}
          <span className="uplift">+{uplift}% more relevance</span> than naive
          truncation — same tokens, more of what matters.
        </p>
      )}

      <h2 className="section-title">
        What survives the budget (knapsack selection)
      </h2>
      <div className="chunks">
        {chunks.map((c) => {
          const kept = keptSet.has(c.id);
          const maxDensity = Math.max(...chunks.map((x) => x.density), 0.0001);
          return (
            <div key={c.id} className={`chunk ${kept ? "kept" : "dropped"}`}>
              <div className="state">{kept ? "kept" : "dropped"}</div>
              <div>
                <div className="txt">{c.text.replace(/\s+/g, " ")}</div>
                <div className="dbar">
                  <span style={{ width: `${(c.density / maxDensity) * 100}%` }} />
                </div>
              </div>
              <div className="nums">
                {fmt(c.tokens)} tok · rel {round(c.relevance)}
              </div>
            </div>
          );
        })}
      </div>

      <footer>
        Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> · IT
        Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
      </footer>
    </div>
  );
}

function StrategyCard({
  r,
  budget,
  chunkCount,
  isBest,
}: {
  r: PackResult;
  budget: number;
  chunkCount: number;
  isBest?: boolean;
}) {
  const pct = budget > 0 ? Math.min(100, (r.tokensUsed / budget) * 100) : 0;
  return (
    <div className={`card ${isBest ? "best" : ""}`}>
      <h3>
        {r.strategy}
        {isBest && <span className="badge-best">optimal</span>}
      </h3>
      <div className="metric">
        {round(r.relevanceCaptured)} <small>relevance</small>
      </div>
      <div className="sub">
        {r.selectedIds.length}/{chunkCount} blocks · {r.tokensUsed.toLocaleString("en-US")}/
        {budget.toLocaleString("en-US")} tok
      </div>
      <div className={`meter ${pct >= 100 ? "over" : ""}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
