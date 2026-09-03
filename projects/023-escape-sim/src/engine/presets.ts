import { ContainmentConfig } from './types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: ContainmentConfig;
}

export const PRESETS: Preset[] = [
  {
    id: 'chatbot',
    name: 'Typical Chatbot',
    description: 'Basic chatbot with shell access, full network, keys in env vars. Common in tutorials and MVPs.',
    config: {
      sandbox: 'none',
      network: 'unrestricted',
      filesystem: 'full',
      tools: 'unrestricted',
      credentials: 'in-env',
      monitoring: 'none',
    },
  },
  {
    id: 'rag-prod',
    name: 'Production RAG Agent',
    description: 'Containerized agent with scoped FS, allowlisted tools, vault credentials, basic logging.',
    config: {
      sandbox: 'container',
      network: 'allowlisted',
      filesystem: 'scoped',
      tools: 'allowlisted',
      credentials: 'vault-scoped',
      monitoring: 'logs',
    },
  },
  {
    id: 'hardened',
    name: 'Hardened Deployment',
    description: 'VM-isolated agent with allowlisted network, read-only FS, anomaly detection. Enterprise-grade.',
    config: {
      sandbox: 'vm',
      network: 'allowlisted',
      filesystem: 'readonly',
      tools: 'no-exec',
      credentials: 'none',
      monitoring: 'anomaly',
    },
  },
  {
    id: 'fort-knox',
    name: 'Fort Knox',
    description: 'Air-gapped VM, no network, no filesystem, no tools, no credentials, automatic kill switch.',
    config: {
      sandbox: 'airgapped',
      network: 'none',
      filesystem: 'none',
      tools: 'no-exec',
      credentials: 'none',
      monitoring: 'killswitch',
    },
  },
];
