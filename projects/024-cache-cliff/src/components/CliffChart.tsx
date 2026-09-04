import type { PromptStack } from '../engine/types';
import { hitDepth, stableThrough, totalTokens } from '../engine/cache';

interface Props {
  stack: PromptStack;
}

/**
 * The prompt drawn as a single bar, proportional to tokens. Everything left of
 * the cliff can be read back cheaply; everything right of it is paid for again
 * on every request.
 */
export function CliffChart({ stack }: Props) {
  const total = Math.max(1, totalTokens(stack));
  const warm = hitDepth(stack, 'warm');
  const cold = hitDepth(stack, 'cold');
  const cliffAt = stableThrough(stack.blocks, 'warm') + 1;

  return (
    <section className="panel">
      <h2>
        Where the prefix breaks <span className="muted">warm turn</span>
      </h2>
      <div className="bar" role="img" aria-label="prompt prefix map">
        {stack.blocks.map((b, i) => {
          const state = i <= cold ? 'cold-hit' : i <= warm ? 'warm-hit' : 'miss';
          return (
            <div
              key={b.id}
              className={`seg ${state} ${stack.breakpoints.includes(i) ? 'bp' : ''}`}
              style={{ flexGrow: Math.max(b.tokens, total * 0.008) }}
              title={`${b.label} — ${b.tokens.toLocaleString()} tokens, changes ${b.volatility}`}
            >
              <span className="seg-label">{b.tokens >= total * 0.06 ? b.label : ''}</span>
            </div>
          );
        })}
      </div>

      {cliffAt < stack.blocks.length && (
        <p className="cliff-line">
          <strong>Cliff</strong> at block {cliffAt + 1} — <code>{stack.blocks[cliffAt].label}</code> (
          {stack.blocks[cliffAt].tokens.toLocaleString()} tokens, changes {stack.blocks[cliffAt].volatility}).
          Prefix matching stops here.
        </p>
      )}

      <ul className="legend">
        <li>
          <i className="sw cold-hit" /> reads back on a cold start
        </li>
        <li>
          <i className="sw warm-hit" /> reads back within a session
        </li>
        <li>
          <i className="sw miss" /> paid for again every request
        </li>
        <li>
          <i className="sw bp-key" /> <code>cache_control</code> marker
        </li>
      </ul>
    </section>
  );
}
