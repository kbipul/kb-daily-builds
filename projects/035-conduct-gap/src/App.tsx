import { useMemo, useState } from 'react';
import { CLAUSES, SCOPES, SOURCE_BLOG, SOURCE_DATE, SOURCE_PDF, SOURCE_URL } from './engine/corpus';
import { DEFAULT_PRESET, PRESETS } from './engine/presets';
import { triage } from './engine/triage';
import type { EvidenceSourceId, ScopeId } from './engine/types';
import { ClauseList } from './components/ClauseList';
import { EvidencePanel } from './components/EvidencePanel';
import { Scoreboard } from './components/Scoreboard';
import { SelfDescription } from './components/SelfDescription';

const initial = PRESETS.find((p) => p.id === DEFAULT_PRESET)!;

export default function App() {
  const [held, setHeld] = useState<Set<EvidenceSourceId>>(new Set(initial.held));
  const [scope, setScope] = useState<ScopeId>(initial.scope);
  const [presetId, setPresetId] = useState<string>(initial.id);

  const result = useMemo(() => triage(held, scope), [held, scope]);
  const scopeDef = SCOPES.find((s) => s.id === scope)!;

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setHeld(new Set(p.held));
    setScope(p.scope);
    setPresetId(id);
  }

  function toggle(id: EvidenceSourceId) {
    setHeld((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPresetId('custom');
  }

  const canCheck = result.counts['checkable'] + result.counts['checkable-configurable'];
  const beyondReach = result.counts['needs-access'] + result.counts['unfalsifiable'];

  return (
    <div className="wrap">
      <header>
        <h1>Conduct Gap</h1>
        <p className="sub">
          The rules are written down. Which ones could you ever catch a violation of?
        </p>
        <p className="cite">
          On {SOURCE_DATE} Microsoft AI published a draft{' '}
          <a href={SOURCE_URL}>Code of Conduct for its MAI models</a> and opened it for six weeks of
          public comment (<a href={SOURCE_BLOG}>announcement</a>, <a href={SOURCE_PDF}>PDF</a>). It
          bars its models from resisting shutdown, widening their own scope, or hiding their
          reasoning from auditors. This page takes {CLAUSES.length} of its commitments and asks a
          different question from the one the coverage asked: for each, what would you have to
          observe to know it had been broken, and do you hold that observation?
        </p>
      </header>

      <section>
        <h2>Where are you standing?</h2>
        <div className="tabs">
          <span className="tab-label">Preset</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={presetId === p.id ? 'on' : ''}
              data-testid={`preset-${p.id}`}
              onClick={() => applyPreset(p.id)}
              title={p.blurb}
            >
              {p.label}
            </button>
          ))}
          {presetId === 'custom' && <span className="pill pill-on">custom</span>}
        </div>
        <p className="preset-blurb">
          {PRESETS.find((p) => p.id === presetId)?.blurb ??
            'Your own combination of surface and access.'}
        </p>

        <div className="tabs">
          <span className="tab-label">Surface</span>
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={scope === s.id ? 'on' : ''}
              data-testid={`scope-${s.id}`}
              onClick={() => {
                setScope(s.id);
                setPresetId('custom');
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={`scope-basis coverage-${scopeDef.coverage}`} data-testid="scope-basis">
          <p>{scopeDef.detail}</p>
          <blockquote>
            {scopeDef.basis}
            <cite>Code of Conduct, {scopeDef.basisSource}</cite>
          </blockquote>
        </div>
      </section>

      <section>
        <h2>What evidence do you hold?</h2>
        <p className="lede">
          The number on each unheld card is how many clauses it would move into the checkable
          column, computed against your current position. Two of them never move anything, for
          different reasons.
        </p>
        <EvidencePanel held={held} scope={scope} onToggle={toggle} />
      </section>

      <section>
        <h2>The triage</h2>
        <Scoreboard result={result} />
        {result.scopeCaveat && (
          <p className="caveat" data-testid="scope-caveat">
            {result.scopeCaveat}
          </p>
        )}
        <p className="readout" data-testid="readout">
          From here you could catch a violation of <strong>{canCheck}</strong> of{' '}
          {result.total} commitments. <strong>{beyondReach}</strong> are out of reach.
        </p>
        <ClauseList result={result} />
      </section>

      <section>
        <h2>What the document says about itself</h2>
        <SelfDescription />
      </section>

      <section className="honesty" data-testid="honesty">
        <h2>What is quoted and what is judged</h2>
        <p>
          Every clause is quoted verbatim from the published document, with the section it sits in.
          The only edits are the removal of the source page's italics on <q>MAI Models</q> and
          ellipses marking omissions. Nothing is paraphrased.
        </p>
        <p>
          The classification is not Microsoft's and it is not anyone's published standard. Deciding
          that a clause needs an action trace rather than a careful reading is this project's
          judgement, and it is the load-bearing part of the argument, so every clause carries its
          reasoning in the open on the row above. Disagree with a row and the count moves; that is
          the intended way to use this.
        </p>
        <p>
          No claim is made that any model has violated any clause, and nothing here was measured
          against a running model. The tool is about what is knowable, not about what happened. The
          test procedures are written as an operator would run them against their own deployment;
          the three Absolute Constraints covering weapons, offensive cyber and child safety carry no
          procedure at all.
        </p>
        <p>
          The independent-evaluator row is modelled on the access Anthropic committed to on 12
          September 2026 and OpenAI matched. It is in the catalogue because it is the only access
          that reaches the last eight clauses, and the Code of Conduct does not offer it. What the
          document does commit to is quoted above.
        </p>
      </section>

      <footer>
        <p>
          Day 35 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>. Source
          document published {SOURCE_DATE}; comment window open for six weeks from that date. No
          model, no network call, no data leaves the page.
        </p>
      </footer>
    </div>
  );
}
