import { describe, expect, it } from 'vitest';
import { computeFindings, enableNode, plan } from '../engine/plan';
import { schedule } from '../engine/schedule';
import type { FleetNode, Job } from '../engine/types';

const node = (over: Partial<FleetNode> & { id: string }): FleetNode => ({
  name: over.id,
  accelerator: 'rtx-4090',
  vramGB: 24,
  engine: 'ollama',
  modelsPresent: ['llama-3.1-8b'],
  state: 'ready',
  ...over,
});

const job = (over: Partial<Job> & { id: string }): Job => ({
  label: over.id,
  model: 'llama-3.1-8b',
  promptTokens: 20000,
  outputTokens: 3000,
  phase: 0,
  ...over,
});

describe('enableNode', () => {
  it('clears every configuration gate at once', () => {
    const fixed = enableNode(
      node({ id: 'a', state: 'offline', engine: 'none', modelsPresent: [] }),
      [job({ id: '1' })],
    );
    expect(fixed.state).toBe('ready');
    expect(fixed.engine).toBe('ollama');
    expect(fixed.modelsPresent).toContain('llama-3.1-8b');
  });

  it('will not pretend a model fits when it does not', () => {
    const fixed = enableNode(node({ id: 'a', vramGB: 8, modelsPresent: [] }), [
      job({ id: '1', model: 'llama-3.3-70b' }),
    ]);
    expect(fixed.modelsPresent).not.toContain('llama-3.3-70b');
  });
});

describe('findings', () => {
  it('prices waking a machine in seconds actually removed from the run', () => {
    const nodes = [node({ id: 'host', isHost: true }), node({ id: 'asleep', state: 'asleep' })];
    const jobs = [job({ id: '1' }), job({ id: '2' })];
    const base = schedule(nodes, jobs).makespanSec;
    const findings = computeFindings(nodes, jobs, base);
    const f = findings.find((x) => x.nodeId === 'asleep')!;
    expect(f.gate).toBe('availability');
    expect(f.savedSec).toBeGreaterThan(0);
    // The claimed number must equal the re-simulated schedule, not an estimate.
    const patched = nodes.map((n) => (n.id === 'asleep' ? enableNode(n, jobs) : n));
    expect(f.fixedMakespanSec).toBeCloseTo(schedule(patched, jobs).makespanSec, 6);
    expect(f.savedSec).toBeCloseTo(base - f.fixedMakespanSec, 6);
  });

  it('names a missing model as the gate when that is the only thing wrong', () => {
    const nodes = [node({ id: 'host', isHost: true }), node({ id: 'bare', modelsPresent: [] })];
    const jobs = [job({ id: '1' }), job({ id: '2' })];
    const findings = computeFindings(nodes, jobs, schedule(nodes, jobs).makespanSec);
    const f = findings.find((x) => x.nodeId === 'bare')!;
    expect(f.gate).toBe('model-presence');
    expect(f.action.toLowerCase()).toContain('pull');
  });

  it('says so plainly when a machine simply cannot hold the model', () => {
    const nodes = [
      node({ id: 'spark', vramGB: 110, modelsPresent: ['llama-3.3-70b'], isHost: true }),
      node({ id: 'small', vramGB: 8, modelsPresent: [] }),
    ];
    const jobs = [job({ id: '1', model: 'llama-3.3-70b' })];
    const findings = computeFindings(nodes, jobs, schedule(nodes, jobs).makespanSec);
    const f = findings.find((x) => x.nodeId === 'small')!;
    expect(f.gate).toBe('memory');
    expect(f.savedSec).toBe(0);
  });

  it('does not claim a saving when the scheduler has no spare work', () => {
    const nodes = [
      node({ id: 'host', isHost: true }),
      node({ id: 'b' }),
      node({ id: 'spare', state: 'asleep' }),
    ];
    const jobs = [job({ id: '1' })];
    const findings = computeFindings(nodes, jobs, schedule(nodes, jobs).makespanSec);
    const f = findings.find((x) => x.nodeId === 'spare')!;
    expect(f.savedSec).toBe(0);
  });

  it('never reports a negative saving', () => {
    const nodes = [
      node({ id: 'host', isHost: true }),
      node({ id: 'slow', accelerator: 'rtx-2080', vramGB: 8, state: 'asleep' }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    const findings = computeFindings(nodes, jobs, schedule(nodes, jobs).makespanSec);
    expect(findings.every((f) => f.savedSec >= 0)).toBe(true);
  });

  it('ranks the biggest win first', () => {
    const nodes = [
      node({ id: 'host', isHost: true }),
      node({ id: 'fast', accelerator: 'rtx-5090', vramGB: 32, state: 'asleep' }),
      node({ id: 'slow', accelerator: 'rtx-2080', vramGB: 8, state: 'asleep' }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' }), job({ id: '4' })];
    const findings = computeFindings(nodes, jobs, schedule(nodes, jobs).makespanSec);
    expect(findings[0].savedSec).toBeGreaterThanOrEqual(findings[findings.length - 1].savedSec);
  });
});

describe('plan', () => {
  it('puts the ceiling between the cluster as configured and perfection', () => {
    const nodes = [
      node({ id: 'host', isHost: true }),
      node({ id: 'b', state: 'asleep' }),
      node({ id: 'c', engine: 'none', modelsPresent: [] }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    const r = plan(nodes, jobs);
    expect(r.ceiling.makespanSec).toBeLessThanOrEqual(r.cluster.makespanSec + 1e-9);
    expect(r.cluster.makespanSec).toBeLessThanOrEqual(r.solo.makespanSec + 1e-9);
    expect(r.ceilingSpeedup).toBeGreaterThanOrEqual(r.speedup);
  });

  it('reports a speedup of about 1 when only one machine is eligible', () => {
    const nodes = [
      node({ id: 'host', isHost: true }),
      node({ id: 'b', state: 'in-use' }),
      node({ id: 'c', state: 'offline' }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' })];
    const r = plan(nodes, jobs);
    expect(r.speedup).toBeCloseTo(1, 2);
    expect(r.ceilingSpeedup).toBeGreaterThan(1.5);
  });

  it('cannot beat the serial spine no matter how many machines join', () => {
    // Ten identical machines, but the work is a chain: one job per phase.
    const nodes = Array.from({ length: 10 }, (_, i) => node({ id: `n${i}`, isHost: i === 0 }));
    const jobs = Array.from({ length: 5 }, (_, i) => job({ id: `j${i}`, phase: i }));
    const r = plan(nodes, jobs);
    expect(r.speedup).toBeCloseTo(1, 2);
  });
});
