import { bandFor, type Analysis } from '../engine/types';

interface Props {
  analysis: Analysis;
}

/**
 * The headline. One number, one verdict, and the two supporting figures that
 * make the number mean something: how much of the response it is, and how much
 * of the response the conventions would delete outright.
 */
export default function DepthMeter({ analysis }: Props) {
  const { burialDepth, totalWords, burialRatio, removableWords } = analysis;
  const info = bandFor(burialDepth);
  const pct = Math.round(burialRatio * 100);
  const removablePct = totalWords === 0 ? 0 : Math.round((removableWords / totalWords) * 100);

  return (
    <section className={`meter meter--${info.band}`} aria-label="Burial depth">
      <h2 className="meter__eyebrow">Burial depth</h2>
      <p className="meter__value">
        {burialDepth < 0 ? '—' : burialDepth}
        {burialDepth >= 0 && <span className="meter__unit">words</span>}
      </p>
      <p className="meter__band">{info.label}</p>
      <p className="meter__blurb">{info.blurb}</p>

      <dl className="meter__stats">
        <div>
          <dt>Response length</dt>
          <dd>{totalWords} words</dd>
        </div>
        <div>
          <dt>Runway before the answer</dt>
          <dd>{burialDepth < 0 ? 'all of it' : `${pct}%`}</dd>
        </div>
        <div>
          <dt>Deletable outright</dt>
          <dd>
            {removableWords} words <span className="meter__sub">({removablePct}%)</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
