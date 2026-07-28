import { useCallback, useMemo, useRef, useState } from "react";
import {
  Agent,
  ToolRegistry,
  RuleModel,
  builtinTools,
} from "./lib/index";
import type { TraceEvent } from "./lib/index";

const PRESETS = [
  "What is (12 + 8) * 3, and how many words are in 'agent tool loop'?",
  "Tell me about semantic kernel.",
  "Compute 2 ^ 3 ^ 2 and then 100 % 7.",
  "What is Azure AI Foundry?",
];

const ICON: Record<TraceEvent["type"], string> = {
  start: "▶",
  thought: "💭",
  tool_call: "🔧",
  observation: "👁",
  tool_error: "⚠",
  final: "✅",
  halted: "⛔",
};

const LABEL: Record<TraceEvent["type"], string> = {
  start: "task",
  thought: "thought",
  tool_call: "tool call",
  observation: "observation",
  tool_error: "tool error",
  final: "final answer",
  halted: "halted",
};

function line(e: TraceEvent): string {
  switch (e.type) {
    case "start": return e.task;
    case "thought": return e.text;
    case "tool_call": return `${e.tool}(${JSON.stringify(e.args)})`;
    case "observation": return e.output;
    case "tool_error": return `${e.tool}: ${e.error}`;
    case "final": return e.answer;
    case "halted": return e.reason;
  }
}

export function App() {
  const [task, setTask] = useState(PRESETS[0]);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [running, setRunning] = useState(false);
  const runId = useRef(0);

  const tools = useMemo(() => new ToolRegistry(builtinTools), []);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setRunning(true);
    setEvents([]);
    const agent = new Agent({ model: new RuleModel(), tools, maxSteps: 6 });
    const result = await agent.run(task);
    // Replay the trace with a small delay so the loop is *visible*.
    for (const e of result.trace) {
      if (runId.current !== id) return; // superseded by a newer run
      setEvents((prev) => [...prev, e]);
      await new Promise((r) => setTimeout(r, 550));
    }
    if (runId.current === id) setRunning(false);
  }, [task, tools]);

  return (
    <main>
      <header>
        <h1>kb-agent-framework</h1>
        <p className="tagline">
          A minimal, typed, dependency-free agent runtime — tools, memory, and a
          traceable ReAct loop. Watch it think below. <strong>Zero API keys</strong>:
          this demo runs a deterministic model in your browser.
        </p>
      </header>

      <section className="panel">
        <label htmlFor="task">Task</label>
        <textarea
          id="task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          spellCheck={false}
        />
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p} className="chip" onClick={() => setTask(p)} disabled={running}>
              {p.length > 42 ? p.slice(0, 40) + "…" : p}
            </button>
          ))}
        </div>
        <button className="run" onClick={run} disabled={running || task.trim().length === 0}>
          {running ? "Running…" : "Run agent ▶"}
        </button>
      </section>

      <section className="trace" aria-live="polite">
        {events.length === 0 && !running && (
          <p className="empty">The reasoning trace will stream here, one step at a time.</p>
        )}
        {events.map((e, i) => (
          <div key={i} className={`event ev-${e.type}`}>
            <span className="ev-icon" aria-hidden>{ICON[e.type]}</span>
            <span className="ev-label">{LABEL[e.type]}</span>
            <span className="ev-body">{line(e)}</span>
          </div>
        ))}
      </section>

      <section className="code">
        <h2>The whole thing, in code</h2>
        <pre>{`import { Agent, ToolRegistry, RuleModel, builtinTools } from "kb-agent-framework";

const agent = new Agent({
  model: new RuleModel(),            // swap for OpenAIModel (BYOK) →
  tools: new ToolRegistry(builtinTools),
  maxSteps: 6,                       // the loop guard
});

const { answer, trace } = await agent.run(
  "What is (12 + 8) * 3, and how many words are in 'agent tool loop'?"
);`}</pre>
        <p className="note">
          Same runtime drives tests, a CLI, and this page. Point it at a real
          model with <code>OpenAIModel</code> (Azure OpenAI or OpenAI) — your key
          stays in an env var, never in the code.
        </p>
      </section>

      <footer>
        Day 21 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> ·
        Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a>
      </footer>
    </main>
  );
}
