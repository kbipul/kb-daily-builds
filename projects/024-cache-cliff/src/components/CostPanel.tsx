import type { PromptStack } from '../engine/types';
import type { ModelPricing, Ttl } from '../engine/pricing';
import { missPenalty } from '../engine/pricing';
import { optimize, rollup } from '../engine/cache';

interface Props {
  stack: PromptStack;
  model: ModelPricing;
  ttl: Ttl;
  onApplyFix: () => void;
}

const usd = (n: number) =>
  n >= 100 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(n < 1 ? 4 : 2)}`;

export function CostPanel({ stack, model, ttl, onApplyFix }: Props) {
  const none = rollup(stack, model, ttl, true).perMonth;
  const now = rollup(stack, model, ttl).perMonth;
  const best = rollup(optimize(stack), model, ttl).perMonth;
  const onTable = now - best;
  const worse = now > none;

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
        <div className="cost good">
          <div className="cost-k">Prefix repaired</div>
          <div className="cost-v">{usd(best)}</div>
        </div>
      </div>

      {onTable > 0.005 ? (
        <div className="verdict">
          <p>
            <strong>{usd(onTable)} a month</strong> is sitting on the table — {((onTable / Math.max(now, 1e-9)) * 100).toFixed(0)}% of
            this workload's bill — and none of it needs a shorter prompt, a cheaper model or a single deleted token.
            It needs the blocks in a different order.
          </p>
          <button className="primary" onClick={onApplyFix}>
            Apply the reordering →
          </button>
        </div>
      ) : (
        <div className="verdict">
          <p>This stack is already getting everything prefix caching can give it on {model.label}.</p>
        </div>
      )}

      <p className="muted small">
        On {model.label} a cache miss costs <strong>{missPenalty(model, ttl)}×</strong> a hit
        (${model.cacheRead}/M read vs ${ttl === '1h' ? model.cacheWrite1h : model.cacheWrite5m}/M write). Dollar figures
        inherit the ±15% of any estimated token count.
      </p>
    </section>
  );
}
