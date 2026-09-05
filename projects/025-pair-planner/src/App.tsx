import { useMemo, useState } from 'react';
import { PRESETS, getPreset } from './engine/presets';
import { plan } from './engine/plan';
import { PERF_INDEX_ERROR_BAND } from './engine/hardware';
import { FleetEditor } from './components/FleetEditor';
import { WorkloadEditor } from './components/WorkloadEditor';
import { Timeline } from './components/Timeline';
import { Verdict } from './components/Verdict';
import { Findings } from './components/Findings';
import type { FleetNode, Job } from './engine/types';
import './App.css';

export default function App() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [nodes, setNodes] = useState<FleetNode[]>(PRESETS[0].nodes);
  const [jobs, setJobs] = useState<Job[]>(PRESETS[0].workload.jobs);

  const loadPreset = (id: string) => {
    const p = getPreset(id);
    setPresetId(id);
    setNodes(p.nodes);
    setJobs(p.workload.jobs);
  };

  const result = useMemo(() => plan(nodes, jobs), [nodes, jobs]);
  const preset = getPreset(presetId);

  return (
    <div className="app">
      <header className="masthead">
        <h1>PAIR Planner</h1>
        <p className="standfirst">
          NVIDIA shipped the Personal AI Router on 3 September 2026 — free software that joins every
          idle RTX, DGX Spark and Apple-silicon machine on your network into one inference pool, and
          spreads an agent&apos;s subagent calls across them. Its scheduler will only send work to a
          machine that is awake, running an engine, holding the requested model and with memory to
          spare. Lay out the machines you actually have and see how many of them clear that bar.
        </p>
      </header>

      <nav className="presets">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.id}
            className={p.id === presetId ? 'preset preset-on' : 'preset'}
            onClick={() => loadPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      <p className="preset-blurb">{preset.blurb}</p>

      <Verdict plan={result} nodeCount={nodes.length} />

      <section className="chart">
        <h2>Your fleet, as configured</h2>
        <Timeline nodes={nodes} jobs={jobs} result={result.cluster} />
      </section>

      <section className="chart">
        <h2>
          The same run with every machine eligible
          {result.headroom > 1.02 ? (
            <span className="chart-tag">{result.headroom.toFixed(2)}x shorter</span>
          ) : null}
        </h2>
        <Timeline nodes={nodes} jobs={jobs} result={result.ceiling} />
      </section>

      <Findings findings={result.findings} />

      <FleetEditor nodes={nodes} jobs={jobs} onChange={setNodes} />
      <WorkloadEditor jobs={jobs} onChange={setJobs} />

      <section className="caveats">
        <h2>What this does not know</h2>
        <ul>
          <li>
            <strong>The tokens/sec figures are calibration constants, not benchmarks.</strong> They
            are public-benchmark-order estimates for 4-bit quantized inference, normalised to an RTX
            4090, and any single one could be {Math.round(PERF_INDEX_ERROR_BAND * 100)}% off. What
            survives that error is the ranking — which machine sat out and what including it is
            worth — because the same bias applies to every lane.
          </li>
          <li>
            <strong>One request per machine at a time.</strong> Real engines batch concurrent
            requests, which would compress the busiest lane. Leaving that out makes the loaded
            machines look worse than they are, so the cluster times here are conservative.
          </li>
          <li>
            <strong>The scheduler is a greedy heuristic.</strong> Longest job first, to the machine
            that finishes it soonest. That is not optimal on machines of different speeds, but the
            headline compares two schedules built by the same rule, so the bias cancels.
          </li>
          <li>
            <strong>No network time.</strong> A prompt crossing a LAN is milliseconds against jobs
            measured in tens of seconds. That stops being safe if your jobs are short.
          </li>
          <li>
            <strong>This is my reading of NVIDIA&apos;s described filter, not their code.</strong> The
            gates come from NVIDIA&apos;s own write-up — readiness, engine state, model presence, job
            load. How PAIR breaks ties between two eligible machines is not documented, and the
            choice made here (earliest finish) is mine.
          </li>
        </ul>
      </section>

      <footer className="foot">
        Runs entirely in your browser. Nothing is uploaded, no key required. Day 25 of{' '}
        <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>.
      </footer>
    </div>
  );
}
