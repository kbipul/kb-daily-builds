import { useMemo, useState } from "react";
import {
  DEFAULT_MODELS,
  PRICES_AS_OF,
  blankModel,
  type ModelPrice,
} from "./lib/pricing";
import { countTokens, TOKENIZER_NAME } from "./lib/tokenizer";
import {
  rankByCost,
  monthlyCost,
  formatUSD,
  percentAboveCheapest,
} from "./lib/cost";
import { SAMPLES } from "./lib/samples";

function cloneDefaults(): ModelPrice[] {
  return DEFAULT_MODELS.map((m) => ({ ...m }));
}

export default function App() {
  const [prompt, setPrompt] = useState(SAMPLES[0].prompt);
  const [outputTokens, setOutputTokens] = useState(SAMPLES[0].outputTokens);
  const [requestsPerDay, setRequestsPerDay] = useState(1000);
  const [models, setModels] = useState<ModelPrice[]>(cloneDefaults);
  const [editing, setEditing] = useState(false);

  const inputTokens = useMemo(() => countTokens(prompt), [prompt]);

  const ranked = useMemo(
    () => rankByCost(models, inputTokens, outputTokens),
    [models, inputTokens, outputTokens],
  );

  const cheapest = ranked.length ? ranked[0].totalCost : 0;
  const dearest = ranked.length ? ranked[ranked.length - 1].totalCost : 0;

  function updateModel(id: string, patch: Partial<ModelPrice>) {
    setModels((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function addModel() {
    setModels((ms) => [...ms, blankModel(`custom-${Date.now()}`)]);
    setEditing(true);
  }
  function removeModel(id: string) {
    setModels((ms) => ms.filter((m) => m.id !== id));
  }
  function applySample(i: number) {
    setPrompt(SAMPLES[i].prompt);
    setOutputTokens(SAMPLES[i].outputTokens);
  }

  return (
    <div className="wrap">
      <header>
        <h1>
          Token Cost Lab <span className="chip">Day 4 · kb-daily-builds</span>
        </h1>
        <p className="sub">
          Paste a prompt, set an expected reply length, and see what a single
          request — and a month of them — costs across today&rsquo;s frontier
          models. Tokenized in your browser with <code>{TOKENIZER_NAME}</code>;
          no API key, nothing leaves the tab.
        </p>
      </header>

      <section className="panel">
        <div className="row samples">
          <span className="label">Try:</span>
          {SAMPLES.map((s, i) => (
            <button key={s.name} className="ghost" onClick={() => applySample(i)}>
              {s.name}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="label">Prompt (input tokens)</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder="Paste any prompt, system message, or context window…"
          />
        </label>

        <div className="row inputs">
          <label className="field small">
            <span className="label">Expected reply (output tokens)</span>
            <input
              type="number"
              min={0}
              value={outputTokens}
              onChange={(e) => setOutputTokens(Math.max(0, +e.target.value))}
            />
          </label>
          <label className="field small">
            <span className="label">Requests / day (for monthly view)</span>
            <input
              type="number"
              min={0}
              value={requestsPerDay}
              onChange={(e) => setRequestsPerDay(Math.max(0, +e.target.value))}
            />
          </label>
          <div className="counts">
            <div>
              <strong>{inputTokens.toLocaleString()}</strong> input tok
            </div>
            <div>
              <strong>{outputTokens.toLocaleString()}</strong> output tok
            </div>
          </div>
        </div>
      </section>

      <section className="results">
        {ranked.map((b, i) => {
          const share = dearest > 0 ? (b.totalCost / dearest) * 100 : 0;
          const over = percentAboveCheapest(b.totalCost, cheapest);
          return (
            <div className={"bar-row" + (i === 0 ? " best" : "")} key={b.model.id}>
              <div className="bar-head">
                <span className="mname">
                  {b.model.name}
                  <span className="vendor">{b.model.vendor}</span>
                  {b.model.tokenMultiplier !== 1 && (
                    <span
                      className="mult"
                      title={`Billed tokens = counter tokens × ${b.model.tokenMultiplier}`}
                    >
                      ×{b.model.tokenMultiplier}
                    </span>
                  )}
                </span>
                <span className="price">
                  {formatUSD(b.totalCost)}
                  <span className="permo">
                    {" "}
                    · {formatUSD(monthlyCost(b.totalCost, requestsPerDay))}/mo
                  </span>
                </span>
              </div>
              <div className="track">
                <div
                  className="fill"
                  style={{ width: Math.max(2, share) + "%" }}
                />
              </div>
              <div className="bar-foot">
                <span>
                  {b.inputTokens.toLocaleString()} in ·{" "}
                  {b.outputTokens.toLocaleString()} out
                </span>
                <span>
                  {i === 0 ? "cheapest" : `+${over}% vs cheapest`}
                </span>
              </div>
              {b.model.note && <p className="note">{b.model.note}</p>}
            </div>
          );
        })}
        {ranked.length === 0 && (
          <p className="empty">Add at least one model to compare.</p>
        )}
      </section>

      <section className="editor">
        <div className="row spread">
          <button className="ghost" onClick={() => setEditing((e) => !e)}>
            {editing ? "Hide pricing table" : "Edit pricing / add models"}
          </button>
          <div className="row">
            <button className="ghost" onClick={addModel}>
              + Add model
            </button>
            <button className="ghost" onClick={() => setModels(cloneDefaults())}>
              Reset defaults
            </button>
          </div>
        </div>

        {editing && (
          <div className="table">
            <div className="thead">
              <span>Model</span>
              <span>$ / 1M in</span>
              <span>$ / 1M out</span>
              <span>tok ×</span>
              <span />
            </div>
            {models.map((m) => (
              <div className="trow" key={m.id}>
                <input
                  className="tname"
                  value={m.name}
                  onChange={(e) => updateModel(m.id, { name: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={m.inputPerM}
                  onChange={(e) =>
                    updateModel(m.id, { inputPerM: Math.max(0, +e.target.value) })
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={m.outputPerM}
                  onChange={(e) =>
                    updateModel(m.id, { outputPerM: Math.max(0, +e.target.value) })
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={m.tokenMultiplier}
                  onChange={(e) =>
                    updateModel(m.id, {
                      tokenMultiplier: Math.max(0, +e.target.value),
                    })
                  }
                />
                <button
                  className="x"
                  onClick={() => removeModel(m.id)}
                  aria-label={`Remove ${m.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="disclaimer">
          Default prices are publicly cited list rates as of{" "}
          <strong>{PRICES_AS_OF}</strong> and are <em>editable estimates</em>,
          not billing truth. Providers tokenize text differently — the{" "}
          <code>tok ×</code> column nudges the browser&rsquo;s token count toward
          each model&rsquo;s real billing. Verify current pricing before you rely
          on a number.
        </p>
      </section>

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
