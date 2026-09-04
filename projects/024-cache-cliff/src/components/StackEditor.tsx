import type { Block, PromptStack, Volatility, Zone } from '../engine/types';
import { MAX_BREAKPOINTS, ZONE_LABEL, ZONE_ORDER } from '../engine/types';
import { estimateTokens } from '../engine/tokens';

const VOLATILITIES: Volatility[] = ['static', 'per-session', 'per-turn'];

interface Props {
  stack: PromptStack;
  onChange: (s: PromptStack) => void;
}

export function StackEditor({ stack, onChange }: Props) {
  const setBlock = (i: number, patch: Partial<Block>) => {
    const blocks = stack.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b));
    onChange({ ...stack, blocks });
  };

  const toggleBreakpoint = (i: number) => {
    const has = stack.breakpoints.includes(i);
    const next = has ? stack.breakpoints.filter((b) => b !== i) : [...stack.breakpoints, i];
    onChange({ ...stack, breakpoints: next.sort((a, b) => a - b) });
  };

  const removeBlock = (i: number) => {
    onChange({
      ...stack,
      blocks: stack.blocks.filter((_, j) => j !== i),
      breakpoints: stack.breakpoints.filter((b) => b !== i).map((b) => (b > i ? b - 1 : b)),
    });
  };

  const addBlock = () => {
    const lastZone = stack.blocks.length ? stack.blocks[stack.blocks.length - 1].zone : 'system';
    const block: Block = {
      id: `b${Date.now()}`,
      label: 'New block',
      tokens: 500,
      volatility: 'static',
      zone: lastZone,
    };
    onChange({ ...stack, blocks: [...stack.blocks, block] });
  };

  return (
    <section className="panel">
      <h2>
        Prompt stack <span className="muted">top of the request first</span>
      </h2>

      <table className="stack-table">
        <thead>
          <tr>
            <th className="c-bp" title={`cache_control marker — the API allows ${MAX_BREAKPOINTS}`}>
              ⛳
            </th>
            <th>Block</th>
            <th>Zone</th>
            <th>Changes</th>
            <th className="num">Tokens</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stack.blocks.map((b, i) => (
            <tr key={b.id} className={`vol-${b.volatility}`}>
              <td className="c-bp">
                <input
                  type="checkbox"
                  aria-label={`cache breakpoint after ${b.label}`}
                  checked={stack.breakpoints.includes(i)}
                  onChange={() => toggleBreakpoint(i)}
                />
              </td>
              <td>
                <input
                  className="label-input"
                  aria-label={`label for block ${i + 1}`}
                  value={b.label}
                  onChange={(e) => setBlock(i, { label: e.target.value })}
                />
                {b.note && <div className="note">{b.note}</div>}
              </td>
              <td>
                <select
                  aria-label={`zone for ${b.label}`}
                  value={b.zone}
                  onChange={(e) => setBlock(i, { zone: e.target.value as Zone })}
                >
                  {ZONE_ORDER.map((z) => (
                    <option key={z} value={z}>
                      {ZONE_LABEL[z]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  aria-label={`volatility for ${b.label}`}
                  value={b.volatility}
                  onChange={(e) => setBlock(i, { volatility: e.target.value as Volatility })}
                >
                  {VOLATILITIES.map((v) => (
                    <option key={v} value={v}>
                      {v === 'static' ? 'never' : v === 'per-session' ? 'per session' : 'per turn'}
                    </option>
                  ))}
                </select>
              </td>
              <td className="num">
                <input
                  className="num-input"
                  type="number"
                  min={0}
                  aria-label={`tokens in ${b.label}`}
                  value={b.tokens}
                  onChange={(e) => setBlock(i, { tokens: Math.max(0, Number(e.target.value) || 0) })}
                />
              </td>
              <td>
                <button className="ghost" aria-label={`remove ${b.label}`} onClick={() => removeBlock(i)}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row">
        <button className="ghost" onClick={addBlock}>
          + block
        </button>
        <label className="inline">
          turns / session
          <input
            className="num-input"
            type="number"
            min={1}
            value={stack.turnsPerSession}
            onChange={(e) => onChange({ ...stack, turnsPerSession: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label className="inline">
          sessions / day
          <input
            className="num-input"
            type="number"
            min={0}
            value={stack.sessionsPerDay}
            onChange={(e) => onChange({ ...stack, sessionsPerDay: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="inline">
          output tokens
          <input
            className="num-input"
            type="number"
            min={0}
            value={stack.outputTokens}
            onChange={(e) => onChange({ ...stack, outputTokens: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>

      <details className="paster">
        <summary>Don't know your token counts? Paste a block of prompt text</summary>
        <PasteEstimator />
      </details>
    </section>
  );
}

function PasteEstimator() {
  return (
    <div className="paste-body">
      <textarea
        aria-label="paste prompt text to estimate tokens"
        placeholder="Paste any part of your prompt…"
        onChange={(e) => {
          const el = e.currentTarget.parentElement?.querySelector('.paste-out');
          if (el) el.textContent = `≈ ${estimateTokens(e.currentTarget.value).toLocaleString()} tokens`;
        }}
      />
      <div className="paste-out muted">≈ 0 tokens</div>
      <p className="muted small">
        An estimate, ±15%. Anthropic does not publish the Claude tokenizer, so the only exact number is the
        <code> usage.input_tokens </code> your own API response already returns — type that in instead when you have it.
      </p>
    </div>
  );
}
