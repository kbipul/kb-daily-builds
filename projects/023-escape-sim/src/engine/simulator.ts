import { ContainmentConfig, ControlKey, LevelResult, ProbeResult, SimulationResult } from './types';
import { CONTROL_STRENGTHS, CAPABILITY_LEVELS } from './capabilities';
import { PROBES } from './probes';

export function getControlStrength(config: ContainmentConfig, key: ControlKey): number {
  const value = config[key];
  const map = CONTROL_STRENGTHS[key] as Record<string, number>;
  return map[value] ?? 0;
}

export function evaluateProbe(config: ContainmentConfig, probe: typeof PROBES[number]): ProbeResult {
  const weakControls: ControlKey[] = [];
  const holdingControls: ControlKey[] = [];

  for (const cond of probe.conditions) {
    const strength = getControlStrength(config, cond.control);
    if (strength < cond.below) {
      weakControls.push(cond.control);
    } else {
      holdingControls.push(cond.control);
    }
  }

  // Probe succeeds (containment breached) only if ALL conditions are met (all controls weak)
  const breached = weakControls.length === probe.conditions.length;

  return { probe, breached, weakControls, holdingControls };
}

export function simulateLevel(config: ContainmentConfig, level: number): LevelResult {
  const levelInfo = CAPABILITY_LEVELS.find(l => l.level === level);
  const levelProbes = PROBES.filter(p => p.level === level);
  const probeResults = levelProbes.map(p => evaluateProbe(config, p));
  const breached = probeResults.some(r => r.breached);

  return {
    level,
    name: levelInfo?.name ?? `Level ${level}`,
    description: levelInfo?.description ?? '',
    probes: probeResults,
    breached,
  };
}

export function computeGrade(breachLevel: number | null): string {
  if (breachLevel === null) return 'A+';
  if (breachLevel >= 7) return 'A';
  if (breachLevel === 6) return 'B+';
  if (breachLevel === 5) return 'B';
  if (breachLevel === 4) return 'C';
  if (breachLevel === 3) return 'D';
  return 'F';  // breached at level 2
}

export function gradeSummary(_grade: string, breachLevel: number | null): string {
  if (breachLevel === null) {
    return 'Containment held through all capability levels, including autonomous persistence. This configuration would resist an Astra-class model.';
  }
  const levelInfo = CAPABILITY_LEVELS.find(l => l.level === breachLevel);
  const levelName = levelInfo?.name ?? `Level ${breachLevel}`;
  return `Containment failed at ${levelName} (Level ${breachLevel}/7). An AI model with ${levelName.toLowerCase()} capabilities would breach this setup.`;
}

export function runSimulation(config: ContainmentConfig): SimulationResult {
  const levels: LevelResult[] = [];
  let breachLevel: number | null = null;

  for (const capLevel of CAPABILITY_LEVELS) {
    const result = simulateLevel(config, capLevel.level);
    levels.push(result);
    if (result.breached && breachLevel === null) {
      breachLevel = capLevel.level;
    }
  }

  const grade = computeGrade(breachLevel);
  const summary = gradeSummary(grade, breachLevel);

  return { config, levels, breachLevel, grade, summary };
}
