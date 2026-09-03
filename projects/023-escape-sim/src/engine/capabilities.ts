export const CONTROL_STRENGTHS = {
  sandbox:    { none: 0, process: 1, container: 2, vm: 3, airgapped: 4 },
  network:    { unrestricted: 0, 'egress-only': 1, allowlisted: 2, none: 3 },
  filesystem: { full: 0, scoped: 1, readonly: 2, none: 3 },
  tools:      { unrestricted: 0, allowlisted: 1, 'no-exec': 2 },
  credentials:{ 'in-env': 0, 'vault-scoped': 1, none: 2 },
  monitoring: { none: 0, logs: 1, anomaly: 2, killswitch: 3 },
} as const;

export const CAPABILITY_LEVELS = [
  { level: 1, name: 'Benign Use',              description: 'Model uses tools exactly as intended within scope' },
  { level: 2, name: 'Creative Tool Use',       description: 'Model chains tools in unintended but technically valid ways' },
  { level: 3, name: 'Prompt Injection',         description: 'Model follows injected instructions from retrieved data' },
  { level: 4, name: 'Boundary Probing',         description: 'Model actively tests sandbox limits and enumerates the environment' },
  { level: 5, name: 'Vulnerability Discovery',  description: 'Model finds and exploits misconfigurations in exposed services' },
  { level: 6, name: 'Exploit Chaining',         description: 'Astra-class: model chains multiple exploits for privilege escalation' },
  { level: 7, name: 'Autonomous Persistence',   description: 'Model establishes persistent access and exfiltration channels' },
] as const;

export const CONTROL_LABELS: Record<string, Record<string, string>> = {
  sandbox: {
    none: 'No sandbox — direct host execution',
    process: 'Process isolation (separate user, no chroot)',
    container: 'Container (Docker/OCI, shared kernel)',
    vm: 'Virtual machine (full kernel isolation)',
    airgapped: 'Air-gapped VM (no host network, no shared storage)',
  },
  network: {
    unrestricted: 'Full outbound internet access',
    'egress-only': 'Outbound only, no inbound',
    allowlisted: 'Allowlisted domains only',
    none: 'No network access',
  },
  filesystem: {
    full: 'Full host filesystem access',
    scoped: 'Scoped to project directory',
    readonly: 'Read-only filesystem',
    none: 'No filesystem access',
  },
  tools: {
    unrestricted: 'Any tool callable, including shell',
    allowlisted: 'Only pre-approved tools callable',
    'no-exec': 'No tool execution permitted',
  },
  credentials: {
    'in-env': 'API keys in environment variables',
    'vault-scoped': 'Short-lived tokens from vault, scoped to task',
    none: 'No credentials accessible',
  },
  monitoring: {
    none: 'No monitoring',
    logs: 'Action logging (post-hoc review)',
    anomaly: 'Real-time anomaly detection',
    killswitch: 'Anomaly detection + automatic kill switch',
  },
};
