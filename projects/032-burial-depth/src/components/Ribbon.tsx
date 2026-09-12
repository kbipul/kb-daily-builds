import type { Analysis, Role } from '../engine/types';

interface Props {
  analysis: Analysis;
  focused: number[];
}

export const ROLE_LABEL: Record<Role, string> = {
  preamble: 'preamble',
  scaffold: 'scaffold',
  hedge: 'hedge',
  recap: 'recap',
  closer: 'closer',
  filler: 'filler',
  code: 'code',
  answer: 'answer',
};

const LEGEND: Role[] = ['answer', 'code', 'preamble', 'scaffold', 'hedge', 'filler', 'recap', 'closer'];

/**
 * The response, tinted by role, with a marker at the point the answer begins.
 * This is the part that does the arguing: the wall of grey in front of the one
 * green segment is the finding, stated without a number.
 */
export default function Ribbon({ analysis, focused }: Props) {
  const { segments, firstAnswerIndex } = analysis;

  if (segments.length === 0) {
    return (
      <section className="ribbon ribbon--empty">
        <p>Paste a response above, or load one of the samples.</p>
      </section>
    );
  }

  return (
    <section className="ribbon" aria-labelledby="ribbon-heading">
      <div className="ribbon__head">
        <h2 id="ribbon-heading">The response, by role</h2>
        <ul className="legend">
          {LEGEND.map((role) => (
            <li key={role} className={`legend__item legend__item--${role}`}>
              <span className="legend__swatch" aria-hidden="true" />
              {ROLE_LABEL[role]}
            </li>
          ))}
        </ul>
      </div>

      <ol className="ribbon__list">
        {segments.map((seg) => {
          const isAnswerStart = seg.index === firstAnswerIndex;
          const isFocused = focused.includes(seg.index);
          return (
            <li
              key={seg.index}
              className={[
                'seg',
                `seg--${seg.role}`,
                isAnswerStart ? 'seg--start' : '',
                isFocused ? 'seg--focused' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isAnswerStart && (
                <p className="seg__marker">
                  ▼ the answer starts here — {seg.wordsBefore} words in
                </p>
              )}
              <div className="seg__row">
                <span className="seg__tag">{ROLE_LABEL[seg.role]}</span>
                {seg.role === 'code' ? (
                  <pre className="seg__code">{seg.text}</pre>
                ) : (
                  <p className="seg__text">{seg.text}</p>
                )}
              </div>
              <p className="seg__meta">
                {seg.words} {seg.words === 1 ? 'word' : 'words'}
                {seg.cue && <> · cue “{seg.cue}”</>}
                {seg.markers.length > 0 && <> · {seg.markers.join(', ')}</>}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
