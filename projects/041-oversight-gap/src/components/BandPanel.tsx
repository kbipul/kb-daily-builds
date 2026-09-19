import { bandFor, type BandInput } from '../oversight/band';
import { fmt } from '../format';

interface Props {
  input: BandInput;
  onRecall: (r: number) => void;
  onPrecision: (p: number) => void;
}

export function BandPanel({ input, onRecall, onPrecision }: Props) {
  const r = bandFor(input);
  const recallPct = Math.round(input.recall * 100);
  const precisionPct = Math.round(input.precision * 100);

  return (
    <section className="panel band">
      <h2>The number nobody published</h2>
      <p className="lede">
        Coverage says every action was inspected. It does not say every bad
        action was caught. Move the catch rate and watch the published figures
        stay exactly where they are.
      </p>

      <div className="controls">
        <label>
          <span>
            Monitor recall <em>(share of harmful actions it blocks)</em>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={recallPct}
            onChange={(e) => onRecall(Number(e.target.value) / 100)}
            aria-label="Monitor recall percent"
          />
          <output>{recallPct}%</output>
        </label>
        <label>
          <span>
            Monitor precision <em>(share of blocks that were real)</em>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={precisionPct}
            onChange={(e) => onPrecision(Number(e.target.value) / 100)}
            aria-label="Monitor precision percent"
          />
          <output>{precisionPct}%</output>
        </label>
      </div>

      <div className="headline">
        <div className="big">{fmt(r.ranAnyway)}</div>
        <div className="big-label">
          harmful actions that ran anyway, in the same month, consistent with
          the same published figures
        </div>
      </div>

      <table className="ledger">
        <tbody>
          <tr>
            <th>Blocked, as published</th>
            <td>{fmt(r.blocked)}</td>
            <td className="fixed">does not move</td>
          </tr>
          <tr>
            <th>Of those, genuinely harmful</th>
            <td>{fmt(r.trueBlocks)}</td>
            <td>at {precisionPct}% precision</td>
          </tr>
          <tr>
            <th>Harmful actions in the stream</th>
            <td>{fmt(r.harmfulMonitored)}</td>
            <td>inferred, not observed</td>
          </tr>
          <tr className="emph">
            <th>Seen by the monitor and let through</th>
            <td>{fmt(r.missedMonitored)}</td>
            <td>at {recallPct}% recall</td>
          </tr>
          <tr>
            <th>Never inspected at all</th>
            <td>{fmt(r.uninspected)}</td>
            <td>at {(input.coverage * 100).toFixed(0)}% coverage</td>
          </tr>
        </tbody>
      </table>

      <p className="note">
        Nothing in the three proposed metrics separates the left end of that
        slider from the right end. Coverage is a plumbing number, latency is a
        timestamp difference, and the escalation rate is a count over a count.
        All three are identical in both worlds.
      </p>
    </section>
  );
}
