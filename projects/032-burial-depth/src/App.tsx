import { useMemo, useState } from 'react';
import DepthMeter from './components/DepthMeter';
import Ribbon from './components/Ribbon';
import RuleTable from './components/RuleTable';
import TrimmedView from './components/TrimmedView';
import { analyze } from './engine/analyze';
import { DEFAULT_SAMPLE_ID, SAMPLES } from './engine/samples';

export default function App() {
  const [text, setText] = useState(
    () => SAMPLES.find((s) => s.id === DEFAULT_SAMPLE_ID)?.text ?? '',
  );
  const [activeSample, setActiveSample] = useState<string | null>(DEFAULT_SAMPLE_ID);
  const [focused, setFocused] = useState<number[]>([]);

  const analysis = useMemo(() => analyze(text), [text]);

  const loadSample = (id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setText(sample.text);
    setActiveSample(id);
    setFocused([]);
  };

  const onEdit = (value: string) => {
    setText(value);
    setActiveSample(null);
    setFocused([]);
  };

  const note = SAMPLES.find((s) => s.id === activeSample)?.note;

  return (
    <div className="page">
      <header className="hero">
        <p className="hero__day">
          Day 032 ·{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>
        </p>
        <h1>Burial Depth</h1>
        <p className="hero__tagline">
          The most-starred repo on GitHub yesterday was a set of rules telling coding agents to stop
          burying the answer. Rules are assertions. This measures.
        </p>
        <p className="hero__sub">
          Paste an agent response. Get the number of words that sit in front of the first sentence
          that actually answers, and a check against each published convention. No model, no
          network — the whole thing is a lexical pass running in this tab.
        </p>
      </header>

      <main>
        <section className="input" aria-labelledby="input-heading">
          <div className="input__head">
            <h2 id="input-heading">Response</h2>
            <div className="samples" role="group" aria-label="Load a sample response">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`samples__btn${activeSample === s.id ? ' samples__btn--on' : ''}`}
                  aria-pressed={activeSample === s.id}
                  onClick={() => loadSample(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          {note && <p className="samples__note">{note}</p>}
          <textarea
            className="input__area"
            aria-label="Agent response to analyse"
            value={text}
            spellCheck={false}
            onChange={(e) => onEdit(e.target.value)}
            placeholder="Paste an agent response here…"
          />
        </section>

        <div className="grid">
          <DepthMeter analysis={analysis} />
          <RuleTable analysis={analysis} focused={focused} onFocus={setFocused} />
        </div>

        <Ribbon analysis={analysis} focused={focused} />
        <TrimmedView analysis={analysis} />

        <section className="caveat" aria-labelledby="caveat-heading">
          <h2 id="caveat-heading">What this cannot tell you</h2>
          <p>
            Every verdict here comes from cue phrases and substance markers, not from understanding.
            That has consequences worth stating before you quote a number from it.
          </p>
          <ul>
            <li>
              <strong>It cannot tell whether the answer is correct.</strong> A confidently wrong
              first sentence scores a perfect burial depth of zero.
            </li>
            <li>
              <strong>Novel phrasing escapes.</strong> A preamble written in words that are not in
              the cue list is classified as <em>filler</em> at best — it still counts toward depth,
              but it is not named as preamble.
            </li>
            <li>
              <strong>&ldquo;Filler&rdquo; is the honest label for uncertainty.</strong> It means no
              cue matched and no substance marker was found. Some filler is genuine connective
              prose.
            </li>
            <li>
              <strong>Hedging is sometimes right.</strong> When a question really is
              underdetermined, saying so is the accurate answer. The density check measures a habit,
              not a mistake.
            </li>
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> · IT Director → AI/ML ·{' '}
          <a href="https://github.com/kbipul/burial-depth">source</a>
        </p>
      </footer>
    </div>
  );
}
