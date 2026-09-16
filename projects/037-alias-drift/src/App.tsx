import { useState } from 'react';
import { CORPUS } from './lib/corpus';
import RowPicker from './components/RowPicker';
import DriftCard from './components/DriftCard';
import Simulator from './components/Simulator';
import ComparisonTable from './components/ComparisonTable';

export default function App() {
  const [selectedId, setSelectedId] = useState(CORPUS[0].id);
  const selected = CORPUS.find((r) => r.id === selectedId) ?? CORPUS[0];

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Day 037 · kb-daily-builds</p>
        <h1>Alias Drift</h1>
        <p className="tagline">
          On 10 September 2026 DeepSeek retired <code>deepseek-v4-flash</code>{' '}
          with no advance notice and quietly routed it to its replacement —
          the same day the replacement launched. Nine ways five providers let
          you name a model, and what &ldquo;pinned&rdquo; actually buys you in
          each one.
        </p>
      </header>

      <section className="panel intro-panel">
        <p>
          A model identifier in your code looks like one thing: a string.
          Underneath, it is a contract, and the contract varies by an order
          of magnitude — from &ldquo;this exact behavior, forever, until it
          hard-fails on a published date&rdquo; to &ldquo;whatever we feel
          like serving today, no announcement required.&rdquo; Pick a row,
          read what its provider actually promises, then run the deprecation
          day simulator and watch what a caller who never updates their code
          would actually see.
        </p>
      </section>

      <RowPicker selectedId={selectedId} onSelect={setSelectedId} />

      <div className="two-col-grid">
        <DriftCard row={selected} />
        <Simulator row={selected} />
      </div>

      <ComparisonTable selectedId={selectedId} onSelect={setSelectedId} />

      <section className="panel honesty-panel">
        <h2 className="drift-title">What this is and isn&rsquo;t</h2>
        <ul>
          <li>
            Every classification, notice window and post-event description is
            quoted or closely paraphrased from the provider&rsquo;s own
            documentation, linked on each card. Two rows carry an explicit
            caveat where this project made an inference rather than quoting a
            guarantee — read those before treating this as gospel.
          </li>
          <li>
            The four-way classification (frozen-then-fails, alias-repoint,
            auto-upgrade-notice, zero-notice-reroute) is this project&rsquo;s
            judgement, not a category any provider publishes. It exists to
            make the risk ordering checkable: silence is worse than an
            honest failure, and an unannounced change is worse than an
            announced one.
          </li>
          <li>
            This does not track pricing, quality, or which model is
            &ldquo;better&rdquo; — only whether the identifier you wrote down
            keeps meaning what you think it means. Nothing here claims any
            provider is acting in bad faith; auto-upgrade and even alias
            repoints are documented, intentional platform behavior aimed at
            keeping most users on a current model without extra work. The
            risk is in not knowing which kind of identifier you are holding.
          </li>
        </ul>
      </section>

      <footer className="foot">
        <p>
          Part of{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>{' '}
          — one AI project a day.
        </p>
      </footer>
    </div>
  );
}
