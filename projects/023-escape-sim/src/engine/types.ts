export type SandboxLevel = 'none' | 'process' | 'container' | 'vm' | 'airgapped';
export type NetworkLevel = 'unrestricted' | 'egress-only' | 'allowlisted' | 'none';
export type FilesystemLevel = 'full' | 'scoped' | 'readonly' | 'none';
export type ToolLevel = 'unrestricted' | 'allowlisted' | 'no-exec';
export type CredentialLevel = 'in-env' | 'vault-scoped' | 'none';
export type MonitoringLevel = 'none' | 'logs' | 'anomaly' | 'killswitch';

export interface ContainmentConfig {
  sandbox: SandboxLevel;
  network: NetworkLevel;
  filesystem: FilesystemLevel;
  tools: ToolLevel;
  credentials: CredentialLevel;
  monitoring: MonitoringLevel;
}

export type ControlKey = keyof ContainmentConfig;

export interface ProbeCondition {
  control: ControlKey;
  below: number; // control strength must be strictly < this value to be exploitable
}

export interface Probe {
  id: string;
  level: number;
  name: string;
  description: string;
  conditions: ProbeCondition[];
  consequence: string;
}

export type ProbeResult = {
  probe: Probe;
  breached: boolean;
  weakControls: ControlKey[];   // which controls were too weak
  holdingControls: ControlKey[]; // which controls blocked the probe
};

export interface LevelResult {
  level: number;
  name: string;
  description: string;
  probes: ProbeResult[];
  breached: boolean; // true if ANY probe in this level succeeded
}

export interface SimulationResult {
  config: ContainmentConfig;
  levels: LevelResult[];
  breachLevel: number | null;  // first level where containment failed, null = held all
  grade: string;               // A+ through F
  summary: string;
}
