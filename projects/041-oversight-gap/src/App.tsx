import { useState } from 'react';
import { FiguresPanel } from './components/FiguresPanel';
import { BandPanel } from './components/BandPanel';
import { ArithmeticPanel } from './components/ArithmeticPanel';
import { FleetPanel } from './components/FleetPanel';
import { MISSING_NUMBER } from './oversight/figures';
import { SCENARIOS, type FleetInput } from './oversight/fleet';
import { fleetMetrics } from './oversight/fleet';
import type { BandInput } from './oversight/band';

export function App() {
  const [fleet, setFleet] = useState<FleetInput>(SCENARIOS[0]);
  const [recall, setRecall] = useState(0.9);
  const [precision, setPrecision] = useState(1);

  const m = fleetMetrics(fleet);
  const band: BandInput = {
    actions: fleet.actions,
    blockRate: m.escalationRate,
    coverage: m.coverage,
    precision,
    recall,
  };

  return (
    <div className="app">
      <header>
        <p className="kicker">Day 041 · kb-daily-builds</p>
        <h1>Oversight Gap</h1>
        <p className="tagline">
          100% coverage means every action was inspected. It does not mean every
          bad one was caught.
        </p>
        <p className="standfirst">
          On 17 September 2026 Anthropic published three metrics for overseeing
          AI agents, and its own figures: about 30,000 agents, every action
          checked before it runs, and 1 action in 47,000 blocked. The post also
          says developers should publish how often known misbehaviour is caught.
          It does not publish that number. This is what the difference is worth.
        </p>
      </header>

      <main>
        <BandPanel
          input={band}
          onRecall={setRecall}
          onPrecision={setPrecision}
        />
        <FleetPanel selected={fleet} onSelect={setFleet} />
        <ArithmeticPanel />
        <FiguresPanel />

        <section className="panel honesty">
          <h2>What this is not</h2>
          <ul>
            <li>
              <strong>Not a claim that the monitor is bad.</strong> Recall could
              be 99%. The point is that the published metrics are the same
              either way, which is why the post asks for the catch rate.
            </li>
            <li>
              <strong>Not a measurement.</strong> Recall and precision are
              sliders because they are unknown. Every number downstream of them
              is conditional, and the ledger says which row is observed and
              which is inferred.
            </li>
            <li>
              <strong>Not a model.</strong> The whole inference is one
              division and one subtraction, applied in your browser to figures
              from a single cited post. Nothing leaves the page.
            </li>
            <li>
              <strong>Not the whole fleet.</strong> Anthropic&rsquo;s numbers
              cover its most-used internal platform, not everything it runs. The
              scope line travels with every figure here for that reason.
            </li>
          </ul>
          <blockquote className="pull">
            {MISSING_NUMBER.whyItMatters}
            <cite>Favaro and Wright, 17 September 2026</cite>
          </blockquote>
          <p className="limitation">
            Anthropic&rsquo;s own limitation, quoted: &ldquo;
            {MISSING_NUMBER.limitation}&rdquo;
          </p>
        </section>
      </main>

      <footer>
        <p>
          Built by{' '}
          <a href="https://www.kumarbipul.com" target="_blank" rel="noreferrer">
            Kumar Bipul
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/kbipul/kb-daily-builds"
            target="_blank"
            rel="noreferrer"
          >
            kb-daily-builds
          </a>
        </p>
      </footer>
    </div>
  );
}
