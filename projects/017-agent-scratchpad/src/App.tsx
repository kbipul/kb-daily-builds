import { useEffect, useMemo, useRef, useState } from "react";
import { parseTrace } from "./lib/parse";
import { analyze } from "./lib/analyze";
import type { Finding, Severity } from "./lib/types";
import { EXAMPLES, DEFAULT_EXAMPLE_ID } from "./data/examples";

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function toolsFromText(text: string) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export function App() {
  const initial = EXAMPLES.find((e) => e.id === DEFAULT_EXAMPLE_ID)!;
  const [traceText, setTraceText] = useState(initial.trace);
  const [toolsText, setToolsText] = useState(initial.tools.map((t) => t.name).join(", "));
  const [exampleId, setExampleId] = useState(initial.id);
  const [cursor, setCursor] = useState(0); // how many steps are "played"
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const tools = useMemo(() => toolsFromText(toolsText), [toolsText]);
  const parsed = useMemo(() => parseTrace(traceText), [traceText]);
  const report = useMemo(() => analyze(parsed, { tools }), [parsed, tools]);

  const totalStops = parsed.steps.length + (parsed.finalAnswer !== null ? 1 : 0);

  // Reset playback when the trace changes.
  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [traceText]);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setCursor((c) => {
          if (c >= totalStops) {
            setPlaying(false);
            return c;
          }
          return c + 1;
        });
      }, 750);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, totalStops]);

  function loadExample(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setExampleId(id);
    setToolsText(ex.tools.map((t) => t.name).join(", "));
    setTraceText(ex.trace);
  }

  const findingsByStep = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of report.findings) {
      for (const s of f.steps) {
        const arr = map.get(s) ?? [];
        arr.push(f);
        map.set(s, arr);
      }
    }
    return map;
  }, [report]);

  const globalFindings = report.findings.filter((f) => f.steps.length === 0);
  const shown = cursor === 0 ? totalStops : cursor; // 0 == show everything
  const finalVisible = parsed.finalAnswer !== null && shown >= totalStops;

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <span className="mark">▚</span>
          <div>
            <h1>Agent Scratchpad</h1>
            <p className="sub">
              Replay a ReAct agent's Thought → Action → Observation loop, and catch where it breaks.
            </p>
          </div>
        </div>
        <span className="day">Day 17 · kb-daily-builds</span>
      </header>

      <div className="grid">
        <section className="editor">
          <label className="fieldlabel">Example</label>
          <div className="examples">
            {EXAMPLES.map((e) => (
              <button
                key={e.id}
                className={"chip" + (e.id === exampleId ? " active" : "")}
                onClick={() => loadExample(e.id)}
                title={e.blurb}
              >
                {e.label}
              </button>
            ))}
          </div>

          <label className="fieldlabel" htmlFor="tools">
            Declared tools <span className="hint">(comma or newline separated — leave empty to skip scope checks)</span>
          </label>
          <textarea
            id="tools"
            className="tools"
            value={toolsText}
            spellCheck={false}
            onChange={(e) => setToolsText(e.target.value)}
          />

          <label className="fieldlabel" htmlFor="trace">
            ReAct trace
          </label>
          <textarea
            id="trace"
            className="trace"
            value={traceText}
            spellCheck={false}
            onChange={(e) => setTraceText(e.target.value)}
          />
          {parsed.parseIssues.length > 0 && (
            <ul className="issues">
              {parsed.parseIssues.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="output">
          <div className={"scorecard grade-" + report.grade}>
            <div className="grade">{report.grade}</div>
            <div className="scoremeta">
              <div className="score">{report.score}/100</div>
              <div className="steps">
                {report.stepCount} step{report.stepCount === 1 ? "" : "s"} ·{" "}
                {report.finishedCleanly ? "finished cleanly" : "did not finish cleanly"}
              </div>
            </div>
          </div>

          <div className="controls">
            <button onClick={() => setPlaying((p) => !p)} disabled={totalStops === 0}>
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCursor((c) => Math.min(totalStops, (c === 0 ? totalStops : c) + 1));
              }}
              disabled={totalStops === 0}
            >
              Step ▸
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCursor(0);
              }}
            >
              ⟲ Show all
            </button>
            <span className="progress">
              {Math.min(shown, totalStops)}/{totalStops}
            </span>
          </div>

          <ol className="timeline">
            {parsed.steps.slice(0, shown).map((s) => {
              const fs = findingsByStep.get(s.index) ?? [];
              const worst = fs.slice().sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])[0];
              return (
                <li key={s.index} className={"step" + (worst ? " sev-" + worst.severity : "")}>
                  <div className="stephead">
                    <span className="num">{s.index}</span>
                    {s.action ? (
                      <code className="tool">{s.action}</code>
                    ) : (
                      <span className="tool none">no action</span>
                    )}
                    {s.observationIsError && <span className="errtag">error</span>}
                  </div>
                  {s.thought && <p className="thought">{s.thought}</p>}
                  {s.action && s.actionInput && <pre className="input">{s.actionInput}</pre>}
                  {s.observation !== null && (
                    <p className={"observation" + (s.observationIsError ? " err" : "")}>{s.observation}</p>
                  )}
                  {fs.map((f, i) => (
                    <div key={i} className={"finding inline sev-" + f.severity}>
                      <b>{f.title}</b> — {f.detail}
                    </div>
                  ))}
                </li>
              );
            })}
            {finalVisible && (
              <li className="step final">
                <div className="stephead">
                  <span className="num">✓</span>
                  <span className="tool final">Final Answer</span>
                </div>
                <p className="answer">{parsed.finalAnswer}</p>
              </li>
            )}
          </ol>

          {globalFindings.length > 0 && (
            <div className="globalfindings">
              <h3>Loop-level findings</h3>
              {globalFindings.map((f, i) => (
                <div key={i} className={"finding sev-" + f.severity}>
                  <b>{f.title}</b> — {f.detail}
                </div>
              ))}
            </div>
          )}

          {report.findings.length === 0 && (
            <p className="clean">No loop-health issues detected. This trace runs clean. ✅</p>
          )}
        </section>
      </div>

      <footer>
        <span>
          100% client-side · no API key · <a href="https://github.com/kbipul/agent-scratchpad">source</a>
        </span>
        <span>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </span>
      </footer>
    </div>
  );
}
