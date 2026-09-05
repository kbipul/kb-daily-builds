import type { Job } from '../engine/types';
import { MODELS, formatDuration, getModel, jobDurationSec } from '../engine/hardware';

interface Props {
  jobs: Job[];
  onChange: (jobs: Job[]) => void;
}

const PHASE_NAME = ['Lead agent', 'Fan-out', 'Gather', 'Phase 3', 'Phase 4'];

export function WorkloadEditor({ jobs, onChange }: Props) {
  const update = (id: string, patch: Partial<Job>) =>
    onChange(jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const phases = [...new Set(jobs.map((j) => j.phase))].sort((a, b) => a - b);

  return (
    <section className="editor">
      <div className="editor-head">
        <h2>The work</h2>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            onChange([
              ...jobs,
              {
                id: `job-${Date.now()}`,
                label: 'New subagent',
                model: jobs[0]?.model ?? 'llama-3.1-8b',
                promptTokens: 20000,
                outputTokens: 3000,
                phase: phases.includes(1) ? 1 : (phases[0] ?? 0),
              },
            ])
          }
        >
          + job
        </button>
      </div>
      <p className="muted">
        Jobs sharing a phase run at the same time; a phase waits for the one before it. That
        shape is the whole game — work with no serial head or tail can post any speedup you like.
      </p>
      <table className="job-table">
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '19%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Job</th>
            <th>Phase</th>
            <th>Model</th>
            <th>Prompt / output</th>
            <th>On an RTX 4090</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const model = getModel(j.model);
            const ref = model ? jobDurationSec(j.promptTokens, j.outputTokens, model, 1.0) : 0;
            return (
              <tr key={j.id}>
                <td>
                  <input
                    aria-label="job label"
                    value={j.label}
                    onChange={(e) => update(j.id, { label: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    aria-label="phase"
                    value={j.phase}
                    onChange={(e) => update(j.id, { phase: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>
                        {PHASE_NAME[p]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label="model"
                    value={j.model}
                    onChange={(e) => update(j.id, { model: e.target.value })}
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="tok-cell">
                  <input
                    aria-label="prompt tokens"
                    type="number"
                    min={0}
                    step={1000}
                    value={j.promptTokens}
                    onChange={(e) => update(j.id, { promptTokens: Number(e.target.value) || 0 })}
                  />
                  <input
                    aria-label="output tokens"
                    type="number"
                    min={0}
                    step={500}
                    value={j.outputTokens}
                    onChange={(e) => update(j.id, { outputTokens: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="ref-cell">{formatDuration(ref)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
