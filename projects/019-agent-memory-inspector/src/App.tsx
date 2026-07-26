import { useMemo, useState } from "react";
import { parseMemories } from "./lib/parse";
import { analyze } from "./lib/analyze";
import { simulateRetrieval } from "./lib/retrieval";
import { EXAMPLES, exampleJson } from "./data/examples";
import { DetectorId, Finding, Severity } from "./lib/types";

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];

const DETECTOR_LABEL: Record<DetectorId, string> = {
  expired: "Expired TTL",
  stale: "Stale (no TTL)",
  "scope-durable-in-session": "Scope leak · durable in session",
  "scope-ephemeral-in-user": "Scope leak · transient persisted",
  contradiction: "Contradiction",
  pii: "Candidate PII / secret",
  duplicate: "Near-duplicate",
  "missing-provenance": "Missing provenance",
  "unbounded-growth": "Unbounded growth",
};

const DEFAULT_DATE = "2026-07-26";

function gradeColor(letter: string): string {
  switch (letter) {
    case "A": return "#3fb950";
    case "B": return "#6cc24a";
    case "C": return "#d4a017";
    case "D": return "#e0842a";
    default: return "#f85149";
  }
}

function sevColor(s: Severity): string {
  return s === "high" ? "#f85149" : s === "medium" ? "#e0842a" : "#8b949e";
}

export function App() {
  const [text, setText] = useState<string>(() => exampleJson(EXAMPLES[0]));
  const [dateStr, setDateStr] = useState<string>(DEFAULT_DATE);
  const [query, setQuery] = useState<string>("what timezone is the user in?");

  const now = useMemo(() => {
    const t = Date.parse(dateStr + "T00:00:00Z");
    return isNaN(t) ? Date.parse(DEFAULT_DATE + "T00:00:00Z") : t;
  }, [dateStr]);

  const parsed = useMemo(() => parseMemories(text), [text]);
  const analysis = useMemo(
    () => analyze(parsed.records, { now }),
    [parsed.records, now]
  );
  const retrieval = useMemo(
    () => simulateRetrieval(analysis.normalized, analysis.report.findings, query, now, 5),
    [analysis, query, now]
  );

  const findingsBySeverity = useMemo(() => {
    const map: Record<Severity, Finding[]> = { high: [], medium: [], low: [] };
    for (const f of analysis.report.findings) map[f.severity].push(f);
    return map;
  }, [analysis]);

  const grade = analysis.report.grade;

  return (
    <div className="wrap">
      <header>
        <h1>Agent Memory Inspector</h1>
        <p className="signal">
          Microsoft Foundry's Agent Service shipped editable agent memory to production this month —
          procedural / user / session scopes with TTLs. This is the inspector for it: paste an agent's
          memory store and see what's expired, contradictory, mis-scoped, or leaking PII —
          <strong> 100% in your browser, no API key.</strong>
        </p>
      </header>

      <div className="cols">
        <section className="left">
          <div className="row">
            <label className="lbl">Memory store (JSON)</label>
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex.id} title={ex.blurb} onClick={() => setText(exampleJson(ex))}>
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="clock">
            <label className="lbl">Evaluate as-of date (the agent's clock)</label>
            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>
          {parsed.errors.length > 0 && (
            <div className="errors">
              {parsed.errors.slice(0, 6).map((e, i) => (
                <div key={i}>⚠ {e}</div>
              ))}
            </div>
          )}
        </section>

        <section className="right">
          <div className="summary">
            <div className="grade" style={{ borderColor: gradeColor(grade.letter), color: gradeColor(grade.letter) }}>
              <div className="letter">{grade.letter}</div>
              <div className="score">{grade.score}/100</div>
            </div>
            <div className="scopes">
              {analysis.report.scopes.map((s) => (
                <div className="scope" key={s.scope}>
                  <div className="scope-name">{s.scope}</div>
                  <div className="scope-count">{s.count}</div>
                  <div className="scope-meta">
                    ~{s.tokens} tok{s.expired > 0 && <span className="exp"> · {s.expired} expired</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="findings">
            <h2>
              {analysis.report.findings.length} finding{analysis.report.findings.length === 1 ? "" : "s"}
            </h2>
            {analysis.report.findings.length === 0 && (
              <div className="clean">No hygiene issues detected in this store. ✓</div>
            )}
            {SEVERITY_ORDER.map((sev) =>
              findingsBySeverity[sev].map((f, i) => (
                <div className="finding" key={sev + i}>
                  <span className="chip" style={{ background: sevColor(sev) }}>
                    {sev}
                  </span>
                  <span className="det">{DETECTOR_LABEL[f.detector]}</span>
                  <div className="msg">{f.message}</div>
                  <div className="ids">
                    {f.memoryIds.slice(0, 8).map((id) => (
                      <code key={id}>{id}</code>
                    ))}
                    {f.memoryIds.length > 8 && <span>+{f.memoryIds.length - 8}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="retrieval">
            <h2>Retrieval simulation</h2>
            <p className="hint">
              What would the agent actually recall for a query? BM25 over the store — and if the top
              hits are expired or contradict each other, the answer is poisoned before the model runs.
            </p>
            <input
              className="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask the memory store a question…"
            />
            {retrieval.warnings.length > 0 && (
              <div className="warnings">
                {retrieval.warnings.map((w, i) => (
                  <div key={i}>▲ {w}</div>
                ))}
              </div>
            )}
            <ol className="hits">
              {retrieval.hits.map((h) => (
                <li key={h.id}>
                  <div className="hit-head">
                    <code>{h.id}</code>
                    <span className="hit-scope">{h.memory.scope}</span>
                    <span className="hit-score">{h.score.toFixed(2)}</span>
                    {h.flags.map((fl, i) => (
                      <span className="hit-flag" key={i} style={{ color: sevColor(fl.severity) }}>
                        {DETECTOR_LABEL[fl.detector]}
                      </span>
                    ))}
                  </div>
                  <div className="hit-content">{h.memory.content}</div>
                </li>
              ))}
              {retrieval.hits.length === 0 && <li className="nohit">No memory matched this query.</li>}
            </ol>
          </div>
        </section>
      </div>

      <footer>
        <span>
          Deterministic rule engine · zero model download · pattern-based findings are advisory and cite
          the memory ids that triggered them — the tool never claims to understand meaning.
        </span>
        <span>
          Day 019 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · Kumar Bipul
        </span>
      </footer>
    </div>
  );
}
