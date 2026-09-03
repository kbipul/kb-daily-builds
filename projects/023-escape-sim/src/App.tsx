import { useState } from 'react';
import { ContainmentConfig, ControlKey, SimulationResult } from './engine/types';
import { CONTROL_LABELS } from './engine/capabilities';
import { runSimulation } from './engine/simulator';
import { PRESETS } from './engine/presets';
import ContainmentForm from './components/ContainmentForm';
import SimulationView from './components/SimulationView';

const DEFAULT_CONFIG: ContainmentConfig = { ...PRESETS[0].config };

function App() {
  const [config, setConfig] = useState<ContainmentConfig>({ ...DEFAULT_CONFIG });
  const [activePreset, setActivePreset] = useState<string>('chatbot');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handlePreset = (id: string) => {
    const preset = PRESETS.find(p => p.id === id);
    if (preset) {
      setConfig({ ...preset.config });
      setActivePreset(id);
    }
  };

  const handleControlChange = (key: ControlKey, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setActivePreset('');
  };

  const handleRun = () => {
    setResult(runSimulation(config));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Escape Sim — Would Your Containment <span>Survive Astra?</span></h1>
        <p className="signal">
          OpenAI Astra hit Critical on METR's cybersecurity eval (Sep 1, 2026): autonomously
          finds zero-days, escapes sandboxes, chains OS weaknesses for root.
          Configure your AI containment setup and simulate an escalating capability attack.
        </p>
      </header>
      <div className="layout">
        <ContainmentForm
          config={config}
          activePreset={activePreset}
          controlLabels={CONTROL_LABELS}
          onPreset={handlePreset}
          onControlChange={handleControlChange}
          onRun={handleRun}
        />
        <SimulationView result={result} />
      </div>
      <footer className="footer">
        Day 23 · <a href="https://github.com/kbipul/escape-sim" target="_blank" rel="noopener">GitHub</a> · Kumar Bipul · MIT License
      </footer>
    </div>
  );
}

export default App;
