import { useMemo, useState } from "react";
import { detect } from "./lib/detect";
import { buildConfusion } from "./lib/confusion";
import { LANGUAGES, SCRIPT_LABEL } from "./lib/languages";

const SAMPLES: { label: string; text: string }[] = [
  { label: "Hindi", text: "यह पुस्तक बहुत रोचक है और मुझे बहुत पसंद आई।" },
  { label: "Marathi", text: "हे पुस्तक खूप छान आहे आणि मला ते खूप आवडले." },
  { label: "Nepali", text: "यो किताब धेरै राम्रो छ र मलाई मन पर्‍यो।" },
  { label: "Bengali", text: "এই বইটি খুব সুন্দর এবং আমার খুব ভালো লেগেছে।" },
  { label: "Assamese", text: "এই কিতাপখন বৰ ভাল আৰু মোৰ বৰ ভাল লাগিল।" },
  { label: "Tamil", text: "இந்தப் புத்தகம் மிகவும் நன்றாக உள்ளது, எனக்கு பிடித்தது." },
  { label: "Telugu", text: "ఈ పుస్తకం చాలా బాగుంది, నాకు చాలా నచ్చింది." },
  { label: "Kannada", text: "ಈ ಪುಸ್ತಕ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ ಮತ್ತು ನನಗೆ ಇಷ್ಟವಾಯಿತು." },
  { label: "Malayalam", text: "ഈ പുസ്തകം വളരെ നല്ലതാണ്, എനിക്ക് വളരെ ഇഷ്ടപ്പെട്ടു." },
  { label: "Gujarati", text: "આ પુસ્તક ખૂબ સરસ છે અને મને બહુ ગમ્યું." },
  { label: "Punjabi", text: "ਇਹ ਕਿਤਾਬ ਬਹੁਤ ਵਧੀਆ ਹੈ ਅਤੇ ਮੈਨੂੰ ਬਹੁਤ ਪਸੰਦ ਆਈ।" },
  { label: "Odia", text: "ଏହି ବହିଟି ବହୁତ ଭଲ ଏବଂ ମୋତେ ବହୁତ ଭଲ ଲାଗିଲା।" },
  { label: "Urdu", text: "یہ کتاب بہت دلچسپ ہے اور مجھے بہت پسند آئی۔" },
  { label: "Hinglish", text: "Yaar mujhe yeh kitaab bahut pasand aayi, ekdum zabardast hai." },
];

function Bar({ value }: { value: number }) {
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function ResultCard({ text }: { text: string }) {
  const r = useMemo(() => detect(text), [text]);

  if (!text.trim()) {
    return <div className="result muted">Type or paste some text, or tap a sample below.</div>;
  }
  if (!r.ok) {
    return (
      <div className="result">
        <div className="verdict-reason">{r.reason}</div>
        {r.script !== "Other" && (
          <div className="sub">Script seen: {r.scriptLabel}</div>
        )}
      </div>
    );
  }

  const top = r.top!;
  return (
    <div className="result">
      <div className="verdict">
        <div>
          <div className="verdict-name">{top.name}</div>
          <div className="verdict-native">{top.native}</div>
        </div>
        <div className="verdict-meta">
          <span className="chip script-chip">{r.scriptLabel} script</span>
          <span className="chip cov-chip">{Math.round(r.scriptCoverage * 100)}% of characters</span>
        </div>
      </div>

      {r.ranked.length > 1 && (
        <div className="ranked">
          <div className="ranked-title">Same-script candidates</div>
          {r.ranked.slice(0, 4).map((c) => (
            <div className="ranked-row" key={c.code}>
              <span className="ranked-lang">
                {c.name} <span className="ranked-native">{c.native}</span>
              </span>
              <Bar value={c.confidence} />
              <span className="ranked-pct">{Math.round(c.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {r.note && <div className="note">{r.note}</div>}

      {r.scriptOnly.length > 0 && (
        <div className="scriptonly">
          <span className="scriptonly-label">Also written in this script:</span>
          {r.scriptOnly.map((s) => (
            <span className="chip ghost" key={s.code} title="Detected by script, not yet individually profiled">
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function heat(v: number): string {
  // 0 -> transparent, 1 -> deep saffron/green blend
  if (v <= 0) return "transparent";
  const a = 0.12 + 0.78 * v;
  return `rgba(255, 138, 0, ${a.toFixed(3)})`;
}

function ConfusionMatrix() {
  const cm = useMemo(() => buildConfusion(), []);
  return (
    <div className="cm-wrap">
      <table className="cm">
        <thead>
          <tr>
            <th className="cm-corner">true \ predicted</th>
            {cm.labels.map((l) => (
              <th key={l.code} className="cm-col">{l.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cm.matrix.map((row, i) => {
            const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
            return (
              <tr key={cm.labels[i].code}>
                <th className="cm-row">{cm.labels[i].name}</th>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`cm-cell${i === j ? " diag" : ""}`}
                    style={{ background: heat(v / rowTotal) }}
                    title={`${cm.labels[i].name} → ${cm.labels[j].name}: ${v}`}
                  >
                    {v > 0 ? v : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="cm-caption">
        Leave-one-out over the embedded samples · {cm.correct}/{cm.total} correct
        ({Math.round(cm.accuracy * 100)}%). Off-diagonal cells are the honest cost
        of same-script ambiguity — every confusion is between languages that share
        a script.
      </div>
    </div>
  );
}

const TIER_LABEL: Record<string, string> = {
  full: "content-profiled",
  script: "script-identified",
  partial: "script only",
};

function Coverage() {
  const scheduled = LANGUAGES.filter((l) => l.scheduled);
  return (
    <div className="cov-grid">
      {scheduled.map((l) => (
        <div className={`cov-card tier-${l.tier}`} key={l.code}>
          <div className="cov-native">{l.native}</div>
          <div className="cov-name">{l.name}</div>
          <div className="cov-script">{SCRIPT_LABEL[l.script]}</div>
          <div className="cov-tier">{TIER_LABEL[l.tier]}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [text, setText] = useState(SAMPLES[0].text);

  return (
    <div className="app">
      <header className="hero">
        <div className="kicker">Day 14 · kb-daily-builds · the AI voice of India series</div>
        <h1>Bhasha&nbsp;Detect</h1>
        <p className="tagline">
          Paste text in any of India's <b>22 scheduled languages</b> — plus Hinglish —
          and watch it get identified by Unicode script and character n-grams. Runs
          100% in your browser. No API key, no model download, nothing leaves the tab.
        </p>
        <p className="signal">
          The week India's sovereign-AI push crossed its milestone of covering all
          22 scheduled languages (BharatGen), here's the flip side of that coin — a
          tiny, honest tool that tries to tell them apart, and shows you exactly
          where it can't.
        </p>
      </header>

      <section className="panel">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={4}
          placeholder="Paste a sentence in an Indian language…"
        />
        <div className="chips">
          {SAMPLES.map((s) => (
            <button key={s.label} className="chip pick" onClick={() => setText(s.text)}>
              {s.label}
            </button>
          ))}
          <button className="chip pick clear" onClick={() => setText("")}>clear</button>
        </div>
        <ResultCard text={text} />
      </section>

      <section className="section">
        <h2>Where it confuses languages — and where it can't</h2>
        <p className="section-sub">
          Script detection is near-exact, so cross-script confusion is impossible:
          the matrix is block-diagonal by script. All the interesting error lives
          inside the shared scripts — Devanagari (Hindi/Marathi/Sanskrit/Nepali),
          Bengali–Assamese, and Latin (English/Hinglish).
        </p>
        <ConfusionMatrix />
      </section>

      <section className="section">
        <h2>All 22 scheduled languages — and how honestly we handle each</h2>
        <p className="section-sub">
          Every language of the Eighth Schedule is in the taxonomy. The tier says
          what the tool can actually promise for it — content-profiled, identified
          by a uniquely-owned script, or (for now) known only down to its script.
        </p>
        <Coverage />
      </section>

      <footer className="foot">
        Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> · IT Director → AI/ML ·{" "}
        <a href="https://github.com/kbipul">github.com/kbipul</a>
      </footer>
    </div>
  );
}
