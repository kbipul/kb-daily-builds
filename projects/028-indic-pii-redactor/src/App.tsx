import { useMemo, useState } from 'react';
import { scan } from './engine/scan';
import { redact, segment } from './engine/redact';
import { DETECTORS } from './engine/detectors';
import { SAMPLE_TEXT } from './engine/sample';
import type { Confidence, DetectorId, RedactionMode } from './engine/types';
import { FindingCard } from './components/FindingCard';
import { Highlighted } from './components/Highlighted';

const MODES: { id: RedactionMode; label: string }[] = [
  { id: 'label', label: '[LABEL]' },
  { id: 'block', label: '████' },
  { id: 'partial', label: 'keep last 4' },
];

const FLOORS: { id: Confidence; label: string }[] = [
  { id: 'possible', label: 'everything' },
  { id: 'likely', label: 'likely +' },
  { id: 'certain', label: 'checksum-verified only' },
];

export function App() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [mode, setMode] = useState<RedactionMode>('label');
  const [floor, setFloor] = useState<Confidence>('possible');
  const [off, setOff] = useState<DetectorId[]>([]);
  const [copied, setCopied] = useState(false);

  const enabled = useMemo(
    () => DETECTORS.map((d) => d.id).filter((id) => !off.includes(id)),
    [off]
  );

  const result = useMemo(
    () => scan(text, { enabled, minConfidence: floor }),
    [text, enabled, floor]
  );

  const segments = useMemo(() => segment(text, result.findings), [text, result.findings]);
  const output = useMemo(() => redact(text, result.findings, mode), [text, result.findings, mode]);

  const toggle = (id: DetectorId) =>
    setOff((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Indic PII Redactor</h1>
        <p className="sub">
          Finds Indian personal identifiers — Aadhaar, PAN, GSTIN, UPI, IFSC, mobile, PIN,
          vehicle and voter ID — in Latin <em>and</em> Devanagari digits, and tells you
          honestly how sure it is.
        </p>
        <p className="privacy">
          Everything runs in this tab. No request is ever made with your text — which is
          rather the point, since the whole problem is that you cannot send an Aadhaar
          number to a cloud API to have it removed.
        </p>
      </header>

      <section className="stats" aria-label="Summary">
        <div className="stat certain">
          <b>{result.counts.certain}</b>
          <span>certain</span>
          <small>checksum passed</small>
        </div>
        <div className="stat likely">
          <b>{result.counts.likely}</b>
          <span>likely</span>
          <small>structure constrained</small>
        </div>
        <div className="stat possible">
          <b>{result.counts.possible}</b>
          <span>possible</span>
          <small>shape only — expect noise</small>
        </div>
      </section>

      <section className="controls">
        <div className="control">
          <label htmlFor="floor">Report</label>
          <div id="floor" className="segmented">
            {FLOORS.map((f) => (
              <button
                key={f.id}
                className={floor === f.id ? 'on' : ''}
                onClick={() => setFloor(f.id)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="control">
          <label htmlFor="mode">Redact as</label>
          <div id="mode" className="segmented">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={mode === m.id ? 'on' : ''}
                onClick={() => setMode(m.id)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="control grow">
          <label>Detectors</label>
          <div className="toggles">
            {DETECTORS.map((d) => (
              <button
                key={d.id}
                type="button"
                title={d.blurb}
                className={`toggle ${off.includes(d.id) ? '' : 'on'}`}
                onClick={() => toggle(d.id)}
              >
                {d.label}
                {result.byDetector[d.id] ? <b>{result.byDetector[d.id]}</b> : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="panes">
        <section className="pane">
          <div className="pane-head">
            <h2>Your text</h2>
            <button type="button" className="ghost" onClick={() => setText(SAMPLE_TEXT)}>
              reset sample
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="Text to scan"
          />
          <h3>Detected</h3>
          <Highlighted segments={segments} />
        </section>

        <section className="pane">
          <div className="pane-head">
            <h2>Redacted output</h2>
            <button type="button" className="ghost" onClick={copy}>
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <pre className="output">{output}</pre>
          <h3>
            Findings <small>{result.findings.length}</small>
          </h3>
          <ul className="findings">
            {result.findings.map((f, i) => (
              <FindingCard key={`${f.detector}-${f.start}-${i}`} finding={f} />
            ))}
            {result.findings.length === 0 && <li className="empty">Nothing matched at this threshold.</li>}
          </ul>
        </section>
      </div>

      <footer>
        <p>
          <b>What the tiers mean.</b> <span className="tier tier-certain">certain</span> means a
          mathematical check passed — the Verhoeff digit on an Aadhaar, the mod-36 character on a
          GSTIN. <span className="tier tier-likely">likely</span> means the structure is
          constrained beyond length. <span className="tier tier-possible">possible</span> is
          shape-only and will produce false positives by design: a six-digit PIN code is
          indistinguishable from a six-digit invoice number.
        </p>
        <p>
          A passing checksum tells you the <em>number</em> is well-formed. It cannot tell you the
          number is an Aadhaar rather than a coincidence — the sample text contains a
          checksum-valid invoice number for exactly that reason. Treat this as triage that makes
          a human review tractable, not as an automated compliance control.
        </p>
        <p className="credit">
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> · Day 28 of{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> ·{' '}
          <a href="https://github.com/kbipul/indic-pii-redactor">source</a>
        </p>
      </footer>
    </div>
  );
}
