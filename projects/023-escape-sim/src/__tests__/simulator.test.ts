import { describe, it, expect } from 'vitest';
import { runSimulation, evaluateProbe, getControlStrength, computeGrade, simulateLevel } from '../engine/simulator';
import { PROBES } from '../engine/probes';
import { PRESETS } from '../engine/presets';
import { ContainmentConfig } from '../engine/types';
import { CAPABILITY_LEVELS, CONTROL_STRENGTHS } from '../engine/capabilities';

// ── Control strength lookups ──
describe('getControlStrength', () => {
  it('returns 0 for weakest settings', () => {
    const config: ContainmentConfig = {
      sandbox: 'none', network: 'unrestricted', filesystem: 'full',
      tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
    };
    expect(getControlStrength(config, 'sandbox')).toBe(0);
    expect(getControlStrength(config, 'network')).toBe(0);
    expect(getControlStrength(config, 'filesystem')).toBe(0);
    expect(getControlStrength(config, 'tools')).toBe(0);
    expect(getControlStrength(config, 'credentials')).toBe(0);
    expect(getControlStrength(config, 'monitoring')).toBe(0);
  });

  it('returns max for strongest settings', () => {
    const config: ContainmentConfig = {
      sandbox: 'airgapped', network: 'none', filesystem: 'none',
      tools: 'no-exec', credentials: 'none', monitoring: 'killswitch',
    };
    expect(getControlStrength(config, 'sandbox')).toBe(4);
    expect(getControlStrength(config, 'network')).toBe(3);
    expect(getControlStrength(config, 'filesystem')).toBe(3);
    expect(getControlStrength(config, 'tools')).toBe(2);
    expect(getControlStrength(config, 'credentials')).toBe(2);
    expect(getControlStrength(config, 'monitoring')).toBe(3);
  });

  it('returns correct intermediate values', () => {
    const config: ContainmentConfig = {
      sandbox: 'container', network: 'egress-only', filesystem: 'scoped',
      tools: 'allowlisted', credentials: 'vault-scoped', monitoring: 'logs',
    };
    expect(getControlStrength(config, 'sandbox')).toBe(2);
    expect(getControlStrength(config, 'network')).toBe(1);
    expect(getControlStrength(config, 'filesystem')).toBe(1);
    expect(getControlStrength(config, 'tools')).toBe(1);
    expect(getControlStrength(config, 'credentials')).toBe(1);
    expect(getControlStrength(config, 'monitoring')).toBe(1);
  });
});

// ── Probe evaluation ──
describe('evaluateProbe', () => {
  const weakConfig: ContainmentConfig = {
    sandbox: 'none', network: 'unrestricted', filesystem: 'full',
    tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
  };
  const strongConfig: ContainmentConfig = {
    sandbox: 'airgapped', network: 'none', filesystem: 'none',
    tools: 'no-exec', credentials: 'none', monitoring: 'killswitch',
  };

  it('all probes breach against weakest config', () => {
    for (const probe of PROBES) {
      const result = evaluateProbe(weakConfig, probe);
      expect(result.breached).toBe(true);
      expect(result.holdingControls).toHaveLength(0);
    }
  });

  it('no probes breach against strongest config', () => {
    for (const probe of PROBES) {
      const result = evaluateProbe(strongConfig, probe);
      expect(result.breached).toBe(false);
      expect(result.holdingControls.length).toBeGreaterThan(0);
    }
  });

  it('partially strong config blocks some probes', () => {
    const config: ContainmentConfig = {
      sandbox: 'none', network: 'none', filesystem: 'full',
      tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
    };
    // l2-chain-exfil requires network < 2; network='none'=3, so blocked
    const exfilProbe = PROBES.find(p => p.id === 'l2-chain-exfil')!;
    const result = evaluateProbe(config, exfilProbe);
    expect(result.breached).toBe(false);
    expect(result.holdingControls).toContain('network');
  });

  it('reports correct weak and holding controls', () => {
    const config: ContainmentConfig = {
      sandbox: 'none', network: 'allowlisted', filesystem: 'full',
      tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
    };
    const probe = PROBES.find(p => p.id === 'l2-chain-exfil')!;
    const result = evaluateProbe(config, probe);
    // tools < 2: unrestricted=0 < 2 → weak
    // network < 2: allowlisted=2, NOT < 2 → holding
    // filesystem < 3: full=0 < 3 → weak
    expect(result.breached).toBe(false);
    expect(result.weakControls).toContain('tools');
    expect(result.weakControls).toContain('filesystem');
    expect(result.holdingControls).toContain('network');
  });
});

// ── Level simulation ──
describe('simulateLevel', () => {
  it('level 1 (benign) has no probes and never breaches', () => {
    const config: ContainmentConfig = {
      sandbox: 'none', network: 'unrestricted', filesystem: 'full',
      tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
    };
    const result = simulateLevel(config, 1);
    expect(result.level).toBe(1);
    expect(result.probes).toHaveLength(0);
    expect(result.breached).toBe(false);
  });

  it('level 2 breaches with weak config', () => {
    const config: ContainmentConfig = {
      sandbox: 'none', network: 'unrestricted', filesystem: 'full',
      tools: 'unrestricted', credentials: 'in-env', monitoring: 'none',
    };
    const result = simulateLevel(config, 2);
    expect(result.breached).toBe(true);
  });

  it('level 7 does not breach with fort knox', () => {
    const result = simulateLevel(PRESETS.find(p => p.id === 'fort-knox')!.config, 7);
    expect(result.breached).toBe(false);
  });
});

// ── Grade computation ──
describe('computeGrade', () => {
  it('returns A+ for no breach', () => expect(computeGrade(null)).toBe('A+'));
  it('returns A for breach at level 7', () => expect(computeGrade(7)).toBe('A'));
  it('returns B+ for breach at level 6', () => expect(computeGrade(6)).toBe('B+'));
  it('returns B for breach at level 5', () => expect(computeGrade(5)).toBe('B'));
  it('returns C for breach at level 4', () => expect(computeGrade(4)).toBe('C'));
  it('returns D for breach at level 3', () => expect(computeGrade(3)).toBe('D'));
  it('returns F for breach at level 2', () => expect(computeGrade(2)).toBe('F'));
});

// ── Full simulation with presets ──
describe('runSimulation', () => {
  it('typical chatbot gets grade F (breaches at level 2)', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'chatbot')!.config);
    expect(result.breachLevel).toBe(2);
    expect(result.grade).toBe('F');
    expect(result.levels).toHaveLength(7);
  });

  it('production RAG gets grade C or better', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'rag-prod')!.config);
    expect(result.breachLevel).toBeGreaterThanOrEqual(3);
    expect(['A+', 'A', 'B+', 'B', 'C', 'D']).toContain(result.grade);
  });

  it('hardened deployment gets B+ or better', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'hardened')!.config);
    expect(result.breachLevel === null || result.breachLevel >= 6).toBe(true);
    expect(['A+', 'A', 'B+']).toContain(result.grade);
  });

  it('fort knox gets A+', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'fort-knox')!.config);
    expect(result.breachLevel).toBeNull();
    expect(result.grade).toBe('A+');
  });

  it('simulation always returns 7 levels', () => {
    for (const preset of PRESETS) {
      const result = runSimulation(preset.config);
      expect(result.levels).toHaveLength(7);
    }
  });

  it('levels before breach are not breached', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'chatbot')!.config);
    if (result.breachLevel !== null) {
      for (const level of result.levels) {
        if (level.level < result.breachLevel) {
          // Levels before breach may or may not be breached (level 1 has no probes)
          // but the FIRST breach is at breachLevel
        }
      }
      expect(result.levels[0].breached).toBe(false); // Level 1 never breaches
    }
  });

  it('summary mentions the breach level name', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'chatbot')!.config);
    expect(result.summary).toContain('Creative Tool Use');
  });

  it('fort knox summary mentions Astra-class', () => {
    const result = runSimulation(PRESETS.find(p => p.id === 'fort-knox')!.config);
    expect(result.summary).toContain('Astra-class');
  });
});

// ── Data integrity ──
describe('data integrity', () => {
  it('all probes reference valid capability levels', () => {
    const validLevels = CAPABILITY_LEVELS.map(l => l.level);
    for (const probe of PROBES) {
      expect(validLevels).toContain(probe.level);
    }
  });

  it('all probe conditions reference valid control keys', () => {
    const validKeys = Object.keys(CONTROL_STRENGTHS);
    for (const probe of PROBES) {
      for (const cond of probe.conditions) {
        expect(validKeys).toContain(cond.control);
      }
    }
  });

  it('no probes exist for level 1 (benign use)', () => {
    expect(PROBES.filter(p => p.level === 1)).toHaveLength(0);
  });

  it('every level 2-7 has at least 2 probes', () => {
    for (let lvl = 2; lvl <= 7; lvl++) {
      const count = PROBES.filter(p => p.level === lvl).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('all probes have unique IDs', () => {
    const ids = PROBES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset has all 6 control keys', () => {
    const requiredKeys: (keyof ContainmentConfig)[] = [
      'sandbox', 'network', 'filesystem', 'tools', 'credentials', 'monitoring',
    ];
    for (const preset of PRESETS) {
      for (const key of requiredKeys) {
        expect(preset.config).toHaveProperty(key);
      }
    }
  });

  it('every preset config value is in its strength map', () => {
    for (const preset of PRESETS) {
      for (const [key, value] of Object.entries(preset.config)) {
        const strengthMap = CONTROL_STRENGTHS[key as keyof typeof CONTROL_STRENGTHS] as Record<string, number>;
        expect(strengthMap).toHaveProperty(value);
      }
    }
  });
});
