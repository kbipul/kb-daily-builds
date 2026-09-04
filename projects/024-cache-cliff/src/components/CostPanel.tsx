import type { PromptStack } from '../engine/types';
import type { ModelPricing, Ttl } from '../engine/pricing';
import { missPenalty } from '../engine/pricing';
import { optimize, relocate, rollup } from '../engine/cache';
import { ESTIMATOR_ERROR_BAND } from '../engine/tokens';

interface Props {
  stack: PromptStack;
  model: ModelPricing;
  ttl: Ttl;
  onApplyFix: () => void;
  onApplyRelocation: () => void;
}

const usd = (n: number) =>
  n >= 100 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(n < 1 ? 4 : 2)}`;

export function CostPanel({ stack, model, ttl, onApplyFix, onApplyRelocation }: Props) {
  const none = rollup(stack, model, ttl, true).perMonth;
  const now = rollup(stack, model, ttl).perMonth;
  const reordered = rollup(optimize(stack), model, ttl).perMonth;
  const { stack: relocated, moved } = relocate(stack);
  const best = rollup(relocated, model, ttl).perMonth;

  const reorderGain = now - reordered;
  const moveGain = reordered - best;
  const worse = now > none;
  const pct = (n: number) => `${((n / Math.max(now, 1e-9)) * 100).toFixed(0)}%`;

  return (
    <section className="panel">
      <h2>
        Monthly bill <span className="muted">input + output, 30 days</span>
      </h2>

      <div className="costs">
        <div className="cost">
          <div className="cost-k">No caching</div>
          <div className="cost-v">{usd(none)}</div>
        </div>
        <div className={`cost ${worse ? 'bad' : ''}`}>
          <div className="cost-k">As configured</div>
          <div className="cost-v">{usd(now)}</div>
          {worse && <div className="cost-note">worse than no cache at all</div>}
        </div>
        <div className={`cost ${moveGain > 0.005 ? '' : 'good'}`}>
          <div className="cost-k">Reordered</div>
          <div className="cost-v">{usd(reordered)}</div>
          <div className="cost-note muted">no code change</div>
        </div>
        {moveGain > 0.005 && (
          <div className="cost good">
            <div className="cost-k">Blocks moved</div>
            <div className="cost-v">{usd(best)}</div>
            <div className="cost-note muted">changes how you build the request</div>
          </div>
        )}
      </div>

      {reorderGain > 0.005 && (
        <div className="verdict">
          <p>
            Reordering the blocks you already send saves <strong>{usd(reorderGain)} a month</strong>, {pct(reorderGain)} of
            this workload's bill. Nothing is deleted and nothing is shortened. The blocks go in a different order.
          </p>
          <button className="primary" onClick={onApplyFix}>
            Reorder within zones →
          </button>
        </div>
      )}

      {moveGain > 0.005 && (
        <div className="verdict">
          <p>
            A further <strong>{usd(moveGain)} a month</strong> needs{' '}
            {moved.map((m, i) => (
              <span key={m.blockId}>
                {i > 0 ? ', ' : ''}
                <code>{m.label}</code> ({m.tokens.toLocaleString()} tokens) out of the {m.from} zone
              </span>
            ))}{' '}
            and into the current turn. That is a change to how you assemble the request, not a reshuffle, so it is
            priced separately — reordering alone cannot reach it.
          </p>
          <button className="primary" onClick={onApplyRelocation}>
            Move {moved.length === 1 ? 'it' : 'them'} to the current turn →
          </button>
        </div>
      )}

      {reorderGain <= 0.005 && moveGain <= 0.005 && (
        <div className="verdict">
          <p>Nothing left on the table. Every stable token in this stack sits in front of a marker it can hit.</p>
        </div>
      )}

      <p className="muted small">
        On {model.label} a cache miss costs <strong>{missPenalty(model, ttl)}×</strong> a hit (${model.cacheRead}/M read
        against ${ttl === '1h' ? model.cacheWrite1h : model.cacheWrite5m}/M write). Dollar figures carry the ±
        {Math.round(ESTIMATOR_ERROR_BAND * 100)}% of any token count you estimated rather than measured.
      </p>
    </section>
  );
}
