import { ContainmentConfig, ControlKey } from '../engine/types';
import { PRESETS } from '../engine/presets';
import { CONTROL_STRENGTHS } from '../engine/capabilities';

interface Props {
  config: ContainmentConfig;
  activePreset: string;
  controlLabels: Record<string, Record<string, string>>;
  onPreset: (id: string) => void;
  onControlChange: (key: ControlKey, value: string) => void;
  onRun: () => void;
}

const CONTROL_ORDER: { key: ControlKey; label: string }[] = [
  { key: 'sandbox', label: 'Sandbox' },
  { key: 'network', label: 'Network' },
  { key: 'filesystem', label: 'Filesystem' },
  { key: 'tools', label: 'Tools' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'monitoring', label: 'Monitoring' },
];

export default function ContainmentForm({ config, activePreset, controlLabels, onPreset, onControlChange, onRun }: Props) {
  return (
    <div className="panel">
      <h2>Containment Setup</h2>

      <div className="presets">
        {PRESETS.map(p => (
          <button
            key={p.id}
            className={`preset-btn${activePreset === p.id ? ' active' : ''}`}
            onClick={() => onPreset(p.id)}
          >
            <strong>{p.name}</strong>
            <span>{p.description.slice(0, 60)}…</span>
          </button>
        ))}
      </div>

      {CONTROL_ORDER.map(({ key, label }) => {
        const strengthMap = CONTROL_STRENGTHS[key] as Record<string, number>;
        const options = Object.keys(strengthMap);
        return (
          <div key={key} className="control-group">
            <label>{label}</label>
            <select
              value={config[key]}
              onChange={e => onControlChange(key, e.target.value)}
              title={controlLabels[key]?.[config[key]] ?? ''}
            >
              {options.map(opt => (
                <option key={opt} value={opt}>
                  {controlLabels[key]?.[opt] ?? opt}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button className="run-btn" onClick={onRun}>
        ▶ Run Escape Simulation
      </button>
    </div>
  );
}
