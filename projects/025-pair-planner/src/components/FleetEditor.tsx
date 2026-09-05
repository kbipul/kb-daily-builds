import type { FleetNode, Job, NodeState } from '../engine/types';
import { ACCELERATORS, MODELS, getAccelerator } from '../engine/hardware';

const STATES: { id: NodeState; label: string }[] = [
  { id: 'ready', label: 'Idle & paired' },
  { id: 'in-use', label: 'Someone is on it' },
  { id: 'asleep', label: 'Asleep' },
  { id: 'offline', label: 'Powered off' },
];

interface Props {
  nodes: FleetNode[];
  jobs: Job[];
  onChange: (nodes: FleetNode[]) => void;
}

export function FleetEditor({ nodes, jobs, onChange }: Props) {
  const usedModels = [...new Set(jobs.map((j) => j.model))];

  const update = (id: string, patch: Partial<FleetNode>) =>
    onChange(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const addNode = () => {
    const id = `node-${Date.now()}`;
    onChange([
      ...nodes,
      {
        id,
        name: 'New machine',
        accelerator: 'rtx-4070',
        vramGB: 12,
        engine: 'ollama',
        modelsPresent: [],
        state: 'ready',
      },
    ]);
  };

  return (
    <section className="editor">
      <div className="editor-head">
        <h2>Your machines</h2>
        <button type="button" className="ghost" onClick={addNode}>
          + machine
        </button>
      </div>
      <table className="fleet-table">
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Machine</th>
            <th>Accelerator</th>
            <th>VRAM</th>
            <th>Engine</th>
            <th>Right now</th>
            <th>Models pulled</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.id}>
              <td>
                <input
                  aria-label="machine name"
                  value={n.name}
                  onChange={(e) => update(n.id, { name: e.target.value })}
                />
                {n.isHost ? <span className="host-tag">host</span> : null}
              </td>
              <td>
                <select
                  aria-label="accelerator"
                  value={n.accelerator}
                  onChange={(e) => {
                    const a = getAccelerator(e.target.value);
                    update(n.id, {
                      accelerator: e.target.value,
                      vramGB: a?.typicalVramGB ?? n.vramGB,
                    });
                  }}
                >
                  {ACCELERATORS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  aria-label="vram"
                  type="number"
                  min={1}
                  value={n.vramGB}
                  onChange={(e) => update(n.id, { vramGB: Number(e.target.value) || 1 })}
                />
              </td>
              <td>
                <select
                  aria-label="engine"
                  value={n.engine}
                  onChange={(e) => update(n.id, { engine: e.target.value as FleetNode['engine'] })}
                >
                  <option value="ollama">Ollama</option>
                  <option value="lm-studio">LM Studio</option>
                  <option value="none">none</option>
                </select>
              </td>
              <td>
                <select
                  aria-label="state"
                  value={n.state}
                  onChange={(e) => update(n.id, { state: e.target.value as NodeState })}
                >
                  {STATES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="model-cell">
                {usedModels.map((m) => {
                  const spec = MODELS.find((x) => x.id === m);
                  const fits = (spec?.vramGB ?? 0) <= n.vramGB;
                  const on = n.modelsPresent.includes(m);
                  return (
                    <label key={m} className={fits ? 'chip' : 'chip chip-nofit'} title={fits ? '' : `needs ${spec?.vramGB} GB`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          update(n.id, {
                            modelsPresent: on
                              ? n.modelsPresent.filter((x) => x !== m)
                              : [...n.modelsPresent, m],
                          })
                        }
                      />
                      {spec?.label.replace(' (Q4)', '') ?? m}
                    </label>
                  );
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
