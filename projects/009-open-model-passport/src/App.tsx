import { useMemo, useState } from "react";
import { MODELS } from "./data/models";
import { buildPassport } from "./lib/passport";
import type { Intent } from "./lib/types";
import { PassportView } from "./components/Passport";

const INTENT_FIELDS: { key: keyof Intent; label: string; desc: string }[] = [
  { key: "commercial", label: "Use it commercially", desc: "In a product that earns money" },
  { key: "selfHost", label: "Self-host the weights", desc: "Run it on my own infrastructure" },
  { key: "fineTune", label: "Fine-tune it", desc: "Train a derivative on my data" },
  { key: "redistribute", label: "Redistribute it", desc: "Ship the model on to customers" },
  { key: "serveEu", label: "Serve EU users", desc: "Brings the EU AI Act into scope" },
];

/** The default intent is the ordinary enterprise case: build a commercial product on your own infra. */
const DEFAULT_INTENT: Intent = {
  commercial: true,
  selfHost: true,
  fineTune: false,
  redistribute: false,
  serveEu: true,
};

export function App() {
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [intent, setIntent] = useState<Intent>(DEFAULT_INTENT);

  const model = useMemo(() => MODELS.find((m) => m.id === modelId) ?? MODELS[0], [modelId]);
  const passport = useMemo(() => buildPassport(model, intent), [model, intent]);

  const toggle = (key: keyof Intent) => setIntent((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="wrap">
      <header className="top">
        <h1>Open Model Passport</h1>
        <p className="sub">
          &ldquo;Is it open?&rdquo; is the wrong question. The real one is{" "}
          <strong>can I actually ship this?</strong> Pick a model, declare what you intend to do
          with it, and get a clearance report across weights availability, licence terms, data
          residency and EU AI Act exposure — with a source link on every claim. Runs entirely in
          your browser.
        </p>
        <p className="disclaimer">
          <strong>Not legal advice.</strong> This is an engineering triage tool that turns published
          licence and regulatory facts into a checklist. Every finding links its source and the date
          it was checked — verify before you rely on it, and take the real decision with counsel.
        </p>
        <p className="day">
          Day 009 of{" "}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> — one AI project a
          day.
        </p>
      </header>

      <div className="layout">
        <div>
          <div className="panel">
            <h2>Model</h2>
            <p className="hint">{MODELS.length} models, facts compiled 2026-07-15.</p>
            <div className="model-list">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  className="model-btn"
                  aria-pressed={m.id === modelId}
                  onClick={() => setModelId(m.id)}
                >
                  <div className="m-name">{m.name}</div>
                  <div className="m-meta">
                    {m.vendor} · {m.licence.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>I intend to…</h2>
            <p className="hint">The verdict is intent × facts. Change the intent, change the answer.</p>
            <div className="intents">
              {INTENT_FIELDS.map((f) => (
                <label className="intent" key={f.key}>
                  <input
                    type="checkbox"
                    checked={intent[f.key]}
                    onChange={() => toggle(f.key)}
                    aria-label={f.label}
                  />
                  <span>
                    <span className="i-label">{f.label}</span>
                    <span className="i-desc" style={{ display: "block" }}>
                      {f.desc}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <PassportView passport={passport} />
      </div>

      <footer className="bot">
        <p>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> — IT Director → AI/ML ·{" "}
          <a href="https://github.com/kbipul">github.com/kbipul</a>
        </p>
      </footer>
    </div>
  );
}
