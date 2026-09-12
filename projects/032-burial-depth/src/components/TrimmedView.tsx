import { countWords } from '../engine/segment';
import type { Analysis } from '../engine/types';

interface Props {
  analysis: Analysis;
}

/**
 * The same response with the four deletable roles removed. Hedges and filler
 * survive on purpose: whether a hedge is honest or evasive is a judgement the
 * checker should not make for you, so it flags them and leaves them in.
 */
export default function TrimmedView({ analysis }: Props) {
  const kept = countWords(analysis.trimmed);
  const saved = analysis.totalWords - kept;
  const pct = analysis.totalWords === 0 ? 0 : Math.round((saved / analysis.totalWords) * 100);

  return (
    <section className="trimmed" aria-labelledby="trimmed-heading">
      <div className="trimmed__head">
        <h2 id="trimmed-heading">With the deletable roles removed</h2>
        <p className="trimmed__stat">
          {analysis.totalWords} → <strong>{kept}</strong> words
          {saved > 0 && <span className="trimmed__saved"> −{pct}%</span>}
        </p>
      </div>
      <pre className="trimmed__body">{analysis.trimmed || '(nothing left)'}</pre>
      <p className="trimmed__note">
        Preamble, scaffolding, recaps and closers are cut. Hedges and filler stay — flagged above,
        but whether a given hedge is honest or evasive is your call, not the checker&apos;s.
      </p>
    </section>
  );
}
