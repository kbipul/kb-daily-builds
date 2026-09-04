import type { Horizon, PromptStack } from '../engine/types';
import { hitDepth, stableThrough, totalTokens } from '../engine/cache';

function Bar({ stack, horizon }: { stack: PromptStack; horizon: Horizon }) {
  const total = Math.max(1, totalTokens(stack));
  const depth = hitDepth(stack, horizon);
  const hits = stack.blocks.slice(0, depth + 1).reduce((a, b) => a + b.tokens, 0);
  const cls = horizon === 'cold' ? 'cold-hit' : 'warm-hit';

  return (
    <div className="bar-row">
      <div className="bar-label">
        <div className="bar-title">{horizon === 'cold' ? 'New session' : 'Next turn'}</div>
        <div className="bar-sub muted">
          {hits.toLocaleString()} of {total.toLocaleString()} read back
        </div>
      </div>
      <div className="bar" role="img" aria-label={`${horizon} prefix map`}>
        {stack.blocks.map((b, i) => (
          <div
            key={b.id}
            className={`seg ${i <= depth ? cls : 'miss'} ${stack.breakpoints.includes(i) ? 'bp' : ''}`}
            style={{ flexGrow: Math.max(b.tokens, total * 0.008) }}
            title={`${b.label} — ${b.tokens.toLocaleString()} tokens, changes ${b.volatility}`}
          >
            <span className="seg-label">{b.tokens >= total * 0.08 ? b.label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CliffChart({ stack }: { stack: PromptStack }) {
  const cliffAt = stableThrough(stack.blocks, 'warm') + 1;

  return (
    <section className="panel">
      <h2>
        Where the prefix breaks <span className="muted">same prompt, two moments</span>
      </h2>

      <Bar stack={stack} horizon="cold" />
      <Bar stack={stack} horizon="warm" />

      {cliffAt < stack.blocks.length ? (
        <p className="cliff-line">
          <strong>Cliff</strong> at block {cliffAt + 1}, <code>{stack.blocks[cliffAt].label}</code> —{' '}
          {stack.blocks[cliffAt].tokens.toLocaleString()} tokens that change every{' '}
          {stack.blocks[cliffAt].volatility === 'per-turn' ? 'turn' : 'session'}. Prefix matching stops here.
        </p>
      ) : (
        <p className="cliff-line">No cliff. Every block in this stack is stable turn to turn.</p>
      )}

      <ul className="legend">
        <li>
          <i className="sw cold-hit" /> read back on a new session
        </li>
        <li>
          <i className="sw warm-hit" /> read back on the next turn
        </li>
        <li>
          <i className="sw miss" /> paid for again
        </li>
        <li>
          <i className="sw bp-key" /> <code>cache_control</code> marker
        </li>
      </ul>
    </section>
  );
}
