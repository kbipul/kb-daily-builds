import { useMemo, useState } from 'react';
import { MODELS, type ModelPricing, type Ttl } from './engine/pricing';
import { PRESETS } from './engine/presets';
import { diagnose, optimize, validateStack } from './engine/cache';
import type { PromptStack } from './engine/types';
import { StackEditor } from './components/StackEditor';
import { CliffChart } from './components/CliffChart';
import { CostPanel } from './components/CostPanel';
import { Findings } from './components/Findings';
import './App.css';

export default function App() {
  const [stack, setStack] = useState<PromptStack>(PRESETS[0]);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [custom, setCustom] = useState<ModelPricing>(MODELS[MODELS.length - 1]);
  const [ttl, setTtl] = useState<Ttl>('5m');

  const model = modelId === 'custom' ? custom : MODELS.find((m) => m.id === modelId)!;
  const diagnostics = useMemo(() => diagnose(stack, model, ttl), [stack, model, ttl]);
  const errors = useMemo(() => validateStack(stack), [stack]);

  return (
    <div className="app">
      <header>
        <h1>Cache Cliff</h1>
        <p className="lede">
          Claude Fable 5.1 went GA on 1 September 2026 with cache reads cut 75%, to $0.25 per million — 2.5% of its
          input price, where every other Claude model charges 10%. That single change made a cache <em>miss</em> cost{' '}
          <strong>50× a hit</strong> instead of 12.5×. Prefix hygiene just became four times more valuable than it was
          last week. Lay out your prompt below and find the token that is breaking yours.
        </p>
      </header>

      <div className="controls panel">
        <label className="inline">
          Model
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          Cache TTL
          <select value={ttl} onChange={(e) => setTtl(e.target.value as Ttl)}>
            <option value="5m">5 minutes</option>
            <option value="1h">1 hour</option>
          </select>
        </label>
        <label className="inline">
          Preset
          <select
            value={stack.name}
            onChange={(e) => setStack(PRESETS.find((p) => p.name === e.target.value) ?? PRESETS[0])}
          >
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <span className="source muted small">{model.source}</span>
      </div>

      {modelId === 'custom' && (
        <div className="controls panel">
          {(
            [
              ['input', 'input $/M'],
              ['output', 'output $/M'],
              ['cacheRead', 'cache read $/M'],
              ['cacheWrite5m', '5m write $/M'],
              ['cacheWrite1h', '1h write $/M'],
            ] as const
          ).map(([k, label]) => (
            <label className="inline" key={k}>
              {label}
              <input
                className="num-input"
                type="number"
                min={0}
                step={0.05}
                value={custom[k]}
                onChange={(e) => setCustom({ ...custom, [k]: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="panel errors">
          {errors.map((e) => (
            <div key={e}>⚠ {e}</div>
          ))}
        </div>
      )}

      <CliffChart stack={stack} />
      <CostPanel stack={stack} model={model} ttl={ttl} onApplyFix={() => setStack(optimize(stack))} />
      <Findings diagnostics={diagnostics} />
      <StackEditor stack={stack} onChange={setStack} />

      <footer>
        <p className="muted small">
          Prefix caching matches the longest identical token prefix of your request, so the first block that changes
          ends caching for everything behind it — however stable that tail is. Nothing here calls an API; the arithmetic
          runs in your browser. Prices are the published list rates cited above and exclude batch or enterprise
          discounts.
        </p>
        <p className="muted small">
          Day 024 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> ·{' '}
          <a href="https://github.com/kbipul/cache-cliff">source</a> · Kumar Bipul
        </p>
      </footer>
    </div>
  );
}
