import React, { useMemo, useState } from "react";
import { parseTrace } from "./lib/parse";
import { analyze } from "./lib/analyze";
import type { Issue, Severity, TraceEvent } from "./lib/types";
import { EXAMPLES, DEFAULT_EXAMPLE_ID, exampleById } from "./data/examples";

const pretty = (id: string) => JSON.stringify(exampleById(id).trace, null, 2);

/** Which swimlane (agent id) an event belongs to. */
function laneOf(ev: TraceEvent): string {
  if (ev.type === "delegate" || ev.type === "return" || ev.type === "message") {
    return ev.from ?? "?";
  }
  return ev.agent ?? "?";
}

function chipLabel(ev: TraceEvent): string {
  switch (ev.type) {
    case "delegate":
      return `delegate → ${ev.to}`;
    case "return":
      return `return → ${ev.to}`;
    case "message":
      return `msg → ${ev.to}`;
    case "tool_call":
      return `tool: ${ev.tool}`;
    case "observation":
      return ev.produces?.length ? `obs ⊕ ${ev.produces.join(",")}` : "obs";
    case "final":
      return "✓ final";
  }
}

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "info"];

export function App() {
  const [selectedId, setSelectedId] = useState(DEFAULT_EXAMPLE_ID);
  const [text, setText] = useState(pretty(DEFAULT_EXAMPLE_ID));
  const [cursor, setCursor] = useState(999);
  const [activeIssue, setActiveIssue] = useState<number | null>(null);

  const parsed = useMemo(() => parseTrace(text), [text]);
  const analysis = useMemo(
    () => (parsed.trace ? analyze(parsed.trace) : null),
    [parsed.trace]
  );

  const events = analysis?.events ?? [];
  const lanes = parsed.trace?.agents ?? [];
  const clampedCursor = Math.min(cursor, Math.max(0, events.length - 1));

  const highlighted = useMemo(() => {
    if (activeIssue === null || !analysis) return new Set<number>();
    return new Set(analysis.issues[activeIssue]?.events ?? []);
  }, [activeIssue, analysis]);

  function loadExample(id: string) {
    setSelectedId(id);
    setText(pretty(id));
    setCursor(999);
    setActiveIssue(null);
  }

  function onEdit(value: string) {
    setText(value);
    setSelectedId("");
    setActiveIssue(null);
  }

  function focusIssue(index: number, issue: Issue) {
    setActiveIssue(index === activeIssue ? null : index);
    if (issue.events.length) setCursor(Math.max(...issue.events));
  }

  const scoreBand =
    analysis && analysis.score >= 90
      ? "good"
      : analysis && analysis.score >= 60
      ? "warn"
      : "bad";

  return (
    <div className="app">
      <header className="masthead">
        <div className="badge">Day 18 · kb-daily-builds</div>
        <h1>Handoff</h1>
        <p className="tagline">
          Paste a multi-agent orchestration trace and watch it on a swimlane
          timeline while it flags the coordination failures single-agent tools
          miss — dropped handoffs, delegation loops, context lost between agents,
          duplicated work. Runs 100% in your browser.
        </p>
      </header>

      <section className="examples">
        <span className="examples-label">Load a run:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            className={"pill" + (ex.id === selectedId ? " active" : "")}
            onClick={() => loadExample(ex.id)}
            title={ex.blurb}
          >
            {ex.name}
          </button>
        ))}
      </section>

      <div className="grid">
        <section className="panel trace-panel">
          <h2>Trace (JSON)</h2>
          <textarea
            spellCheck={false}
            value={text}
            onChange={(e) => onEdit(e.target.value)}
            aria-label="Trace JSON input"
          />
          {parsed.errors.length > 0 && (
            <ul className="errors">
              {parsed.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel result-panel">
          {analysis && (
            <>
              <div className="scorebar">
                <div className={"score score-" + scoreBand}>
                  <span className="score-num">{analysis.score}</span>
                  <span className="score-cap">/100 health</span>
                </div>
                <div className="counts">
                  <Count n={analysis.stats.critical} label="critical" cls="c-crit" />
                  <Count n={analysis.stats.warning} label="warning" cls="c-warn" />
                  <Count n={analysis.stats.info} label="info" cls="c-info" />
                  <Count n={analysis.stats.handoffs} label="handoffs" cls="c-mut" />
                  <Count n={analysis.stats.tasks} label="tasks" cls="c-mut" />
                </div>
              </div>

              <div className="scrubber">
                <button
                  className="stepbtn"
                  onClick={() => setCursor(Math.max(0, clampedCursor - 1))}
                  aria-label="Step back"
                >
                  ◀
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, events.length - 1)}
                  value={clampedCursor}
                  onChange={(e) => setCursor(Number(e.target.value))}
                  aria-label="Timeline position"
                />
                <button
                  className="stepbtn"
                  onClick={() => setCursor(Math.min(events.length - 1, clampedCursor + 1))}
                  aria-label="Step forward"
                >
                  ▶
                </button>
                <span className="scrub-t">
                  step {clampedCursor + 1}/{events.length}
                </span>
              </div>

              <div
                className="swimlanes"
                role="table"
                aria-label="Agent swimlanes"
                style={{ ["--cols" as any]: events.length } as React.CSSProperties}
              >
                {lanes.map((agent) => (
                  <div className="lane" key={agent.id} role="row">
                    <div className="lane-head" role="rowheader">
                      <span className="lane-id">{agent.id}</span>
                      {agent.role && <span className="lane-role">{agent.role}</span>}
                    </div>
                    <div className="lane-track">
                      {events.map((ev, i) =>
                        laneOf(ev) === agent.id ? (
                          <button
                            key={i}
                            className={
                              "chip chip-" +
                              ev.type +
                              (i <= clampedCursor ? " on" : " off") +
                              (highlighted.has(i) ? " hot" : "")
                            }
                            style={{ gridColumn: i + 1 }}
                            title={`t=${ev.t} · ${ev.type}${ev.task ? " · " + ev.task : ""}`}
                            onClick={() => setCursor(i)}
                          >
                            <span className="chip-t">{ev.t}</span>
                            {chipLabel(ev)}
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="issues">
                <h2>
                  Findings{" "}
                  {analysis.issues.length === 0 && (
                    <span className="clean-tag">no coordination failures</span>
                  )}
                </h2>
                {[...analysis.issues]
                  .map((issue, index) => ({ issue, index }))
                  .sort(
                    (a, b) =>
                      SEVERITY_ORDER.indexOf(a.issue.severity) -
                      SEVERITY_ORDER.indexOf(b.issue.severity)
                  )
                  .map(({ issue, index }) => (
                    <button
                      key={index}
                      className={
                        "issue sev-" +
                        issue.severity +
                        (index === activeIssue ? " open" : "")
                      }
                      onClick={() => focusIssue(index, issue)}
                    >
                      <div className="issue-top">
                        <span className={"dot dot-" + issue.severity} />
                        <span className="issue-title">{issue.title}</span>
                        <code className="issue-code">{issue.code}</code>
                      </div>
                      <p className="issue-detail">{issue.detail}</p>
                      {issue.agents.length > 0 && (
                        <div className="issue-agents">
                          {issue.agents.map((a) => (
                            <span className="agent-tag" key={a}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </>
          )}
          {!analysis && (
            <div className="empty">Fix the trace above to see the analysis.</div>
          )}
        </section>
      </div>

      <footer className="foot">
        Deterministic, offline, no API key. The inspector reasons only about
        what the trace explicitly records — it never infers intent.{" "}
        <a href="https://github.com/kbipul/handoff-inspector">Source</a> ·{" "}
        <a href="https://www.kumarbipul.com">Kumar Bipul</a>
      </footer>
    </div>
  );
}

function Count({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className={"count " + cls}>
      <b>{n}</b> {label}
    </span>
  );
}
