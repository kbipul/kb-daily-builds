import { useState } from 'react';
import { TRACKS, CASE_STUDIES, SOURCE_URL, type TrackId } from './data/framework';
import { classify } from './lib/classify';

const badgeClass: Record<TrackId, string> = {
  ready: 'badge badge-ready',
  minor: 'badge badge-minor',
  slow: 'badge badge-slow',
};

const trackById = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

type Answer = boolean | null;

interface Preset {
  label: string;
  investigationComplete: boolean;
  complexOrThirdParty: boolean;
  illustrative: boolean;
}

const PRESETS: Preset[] = [
  { label: 'Any of the six real incidents', investigationComplete: true, complexOrThirdParty: false, illustrative: false },
  {
    label: 'Illustrative: needs more log analysis first',
    investigationComplete: false,
    complexOrThirdParty: false,
    illustrative: true,
  },
  {
    label: 'Illustrative: a partner integration is involved',
    investigationComplete: false,
    complexOrThirdParty: true,
    illustrative: true,
  },
];

export default function App() {
  const [investigationComplete, setInvestigationComplete] = useState<Answer>(null);
  const [complexOrThirdParty, setComplexOrThirdParty] = useState<Answer>(null);
  const [illustrative, setIllustrative] = useState(false);

  const answered = investigationComplete !== null && (investigationComplete || complexOrThirdParty !== null);
  const result =
    investigationComplete !== null
      ? classify({
          investigationComplete,
          complexOrThirdParty: complexOrThirdParty ?? false,
        })
      : null;

  function applyPreset(p: Preset) {
    setInvestigationComplete(p.investigationComplete);
    setComplexOrThirdParty(p.complexOrThirdParty);
    setIllustrative(p.illustrative);
  }

  return (
    <div className="wrap">
      <header className="hero">
        <h1>Ready for Disclosure</h1>
        <p className="tagline">
          OpenAI just published the rule it uses to decide whether a misalignment incident goes out immediately,
          needs more work, or goes on the slow track. This runs that rule.
        </p>
        <p className="source">
          Source:{' '}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            openai.com &mdash; Our framework for reporting model misalignment
          </a>{' '}
          (published 2026-09-16)
        </p>
      </header>

      <section>
        <h2>The three tracks, in OpenAI&rsquo;s own words</h2>
        <div className="track-grid">
          {TRACKS.map((t) => (
            <div className="track-card" key={t.id}>
              <h3>
                <span className={badgeClass[t.id]}>{t.name}</span>
              </h3>
              <p className="criterion">&ldquo;{t.criterion}&rdquo;</p>
              <p className="process">{t.process}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>The six incidents OpenAI disclosed under it</h2>
        <p style={{ color: 'var(--muted)', marginTop: '-0.25rem' }}>
          All six landed on the same track &mdash; every one was a completed investigation by publication time. None
          of OpenAI&rsquo;s first six disclosures needed the slow track, which is itself worth noticing.
        </p>
        <div className="case-list">
          {CASE_STUDIES.map((cs) => (
            <div className="case-card" key={cs.id}>
              <h3>
                <span>{cs.title}</span>
                <span className={badgeClass[cs.track]}>{trackById[cs.track].name}</span>
              </h3>
              <blockquote>&ldquo;{cs.quote}&rdquo;</blockquote>
              {cs.reportedDetail && (
                <p className="detail">
                  {cs.reportedDetail} &mdash; reported by {cs.reportedSource}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Run the rule on a scenario of your own</h2>
        <div className="classifier">
          <div className="q">
            <p className="label">Is the investigation complete enough to publish after review?</p>
            <div className="toggle-row" role="group" aria-label="investigation complete">
              <button aria-pressed={investigationComplete === true} onClick={() => { setInvestigationComplete(true); setIllustrative(false); }}>
                Yes
              </button>
              <button aria-pressed={investigationComplete === false} onClick={() => { setInvestigationComplete(false); setIllustrative(true); }}>
                No
              </button>
            </div>
            <p className="hint">This is OpenAI&rsquo;s literal criterion for Ready for Disclosure.</p>
          </div>

          {investigationComplete === false && (
            <div className="q">
              <p className="label">Is it complex, or does it involve a third party?</p>
              <div className="toggle-row" role="group" aria-label="complex or third party">
                <button aria-pressed={complexOrThirdParty === true} onClick={() => setComplexOrThirdParty(true)}>
                  Yes
                </button>
                <button aria-pressed={complexOrThirdParty === false} onClick={() => setComplexOrThirdParty(false)}>
                  No
                </button>
              </div>
              <p className="hint">This is OpenAI&rsquo;s literal criterion for the Slow Track.</p>
            </div>
          )}

          {result && answered && (
            <div className="result">
              <h4>
                <span className={badgeClass[result.track]}>{trackById[result.track].name}</span>
              </h4>
              <p>{result.reason}</p>
              {illustrative && (
                <p className="note">
                  Illustrative scenario &mdash; OpenAI hasn&rsquo;t published a Minor Investigation or Slow Track
                  case yet, so nothing here is one of their real six.
                </p>
              )}
            </div>
          )}

          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer>
        Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> &middot; IT Director &rarr; AI/ML &middot;{' '}
        <a href="https://github.com/kbipul">github.com/kbipul</a>
        <br />
        Day 39 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>
      </footer>
    </div>
  );
}
