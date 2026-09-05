import { describe, expect, it } from 'vitest';
import { checkEligibility, idealFleet, schedule, scheduleSolo } from '../engine/schedule';
import { getModel, jobDurationSec, modelLoadSec } from '../engine/hardware';
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
  promptTokens: 10000,
  outputTokens: 1000,
  phase: 0,
  ...over,
});

describe('eligibility', () => {
  it('accepts a ready node with the engine, the model and the memory', () => {
    expect(checkEligibility(node({ id: 'a' }), job({ id: 'j' })).eligible).toBe(true);
  });

  it('rejects a machine somebody is using', () => {
    const check = checkEligibility(node({ id: 'a', state: 'in-use' }), job({ id: 'j' }));
    expect(check.eligible).toBe(false);
    expect(check.blockers).toContain('in use by a human');
  });

  it('rejects a machine that never pulled the model, however fast it is', () => {
    const check = checkEligibility(
      node({ id: 'a', accelerator: 'rtx-5090', modelsPresent: [] }),
      job({ id: 'j' }),
    );
    expect(check.eligible).toBe(false);
    expect(check.blockers.some((b) => b.includes('not pulled'))).toBe(true);
  });

  it('rejects a machine without enough memory even when the model is listed', () => {
    const check = checkEligibility(
      node({ id: 'a', vramGB: 8, modelsPresent: ['llama-3.3-70b'] }),
      job({ id: 'j', model: 'llama-3.3-70b' }),
    );
    expect(check.eligible).toBe(false);
    expect(check.blockers.some((b) => b.includes('needs 42 GB'))).toBe(true);
  });

  it('collects every blocker rather than stopping at the first', () => {
    const check = checkEligibility(
      node({ id: 'a', state: 'offline', engine: 'none', modelsPresent: [] }),
      job({ id: 'j' }),
    );
    expect(check.blockers.length).toBe(3);
  });
});

describe('scheduler', () => {
  it('spreads independent jobs across machines', () => {
    const nodes = [node({ id: 'a' }), node({ id: 'b' }), node({ id: 'c' })];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    const r = schedule(nodes, jobs);
    expect(new Set(r.assignments.map((a) => a.nodeId)).size).toBe(3);
    expect(r.idleNodeIds).toEqual([]);
  });

  it('never starts a later phase before the earlier one finishes', () => {
    const nodes = [node({ id: 'a' }), node({ id: 'b' })];
    const jobs = [
      job({ id: '1', phase: 0 }),
      job({ id: '2', phase: 1 }),
      job({ id: '3', phase: 1 }),
    ];
    const r = schedule(nodes, jobs);
    const p0End = Math.max(...r.assignments.filter((a) => a.phase === 0).map((a) => a.endSec));
    const p1Start = Math.min(...r.assignments.filter((a) => a.phase === 1).map((a) => a.startSec));
    expect(p1Start).toBeGreaterThanOrEqual(p0End - 1e-9);
  });

  it('reports a job no machine can serve instead of silently dropping it', () => {
    const nodes = [node({ id: 'a', vramGB: 12, modelsPresent: ['llama-3.3-70b'] })];
    const r = schedule(nodes, [job({ id: 'big', model: 'llama-3.3-70b' })]);
    expect(r.assignments).toHaveLength(0);
    expect(r.unplaced).toHaveLength(1);
    expect(r.unplaced[0].reason).toContain('needs 42 GB');
  });

  it('lists machines that were given nothing', () => {
    const nodes = [node({ id: 'a' }), node({ id: 'idle', state: 'asleep' })];
    const r = schedule(nodes, [job({ id: '1' })]);
    expect(r.idleNodeIds).toContain('idle');
  });

  it('charges a model load on a cold machine and not on a repeat', () => {
    const model = getModel('llama-3.1-8b')!;
    const nodes = [node({ id: 'a' })];
    const jobs = [job({ id: '1', phase: 0 }), job({ id: '2', phase: 1 })];
    const r = schedule(nodes, jobs);
    const first = r.assignments.find((a) => a.jobId === '1')!;
    const second = r.assignments.find((a) => a.jobId === '2')!;
    const compute = jobDurationSec(10000, 1000, model, 1.0);
    expect(first.endSec - first.startSec).toBeCloseTo(compute + modelLoadSec(model), 4);
    expect(second.endSec - second.startSec).toBeCloseTo(compute, 4);
  });

  it('charges a reload when the same machine switches models', () => {
    const nodes = [node({ id: 'a', modelsPresent: ['llama-3.1-8b', 'qwen3-14b'] })];
    const jobs = [
      job({ id: '1', phase: 0, model: 'llama-3.1-8b' }),
      job({ id: '2', phase: 1, model: 'qwen3-14b' }),
    ];
    const r = schedule(nodes, jobs);
    const second = r.assignments.find((a) => a.jobId === '2')!;
    const qwen = getModel('qwen3-14b')!;
    const compute = jobDurationSec(10000, 1000, qwen, 1.0);
    expect(second.endSec - second.startSec).toBeCloseTo(compute + modelLoadSec(qwen), 4);
  });

  it('adding an eligible machine never makes a run longer', () => {
    const base = [node({ id: 'a' })];
    const grown = [node({ id: 'a' }), node({ id: 'b' })];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    expect(schedule(grown, jobs).makespanSec).toBeLessThanOrEqual(
      schedule(base, jobs).makespanSec + 1e-9,
    );
  });
});

describe('solo baseline', () => {
  it('runs every job on the host, one at a time, ignoring that the host is busy', () => {
    const nodes = [
      node({ id: 'host', state: 'in-use', isHost: true }),
      node({ id: 'other' }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' })];
    const r = scheduleSolo(nodes, jobs);
    expect(r.assignments.every((a) => a.nodeId === 'host')).toBe(true);
    expect(r.assignments).toHaveLength(2);
  });

  it('is never faster than the cluster it is compared against', () => {
    const nodes = [node({ id: 'host', isHost: true }), node({ id: 'b' }), node({ id: 'c' })];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    expect(scheduleSolo(nodes, jobs).makespanSec).toBeGreaterThanOrEqual(
      schedule(nodes, jobs).makespanSec,
    );
  });

  it('leaves a job unplaced when the host itself cannot serve it', () => {
    const nodes = [
      node({ id: 'host', vramGB: 12, modelsPresent: [], isHost: true }),
      node({ id: 'spark', vramGB: 110, modelsPresent: ['llama-3.3-70b'] }),
    ];
    const r = scheduleSolo(nodes, [job({ id: 'big', model: 'llama-3.3-70b' })]);
    expect(r.unplaced).toHaveLength(1);
  });
});

describe('ideal fleet', () => {
  it('wakes everything, installs an engine and pulls what fits', () => {
    const nodes = [node({ id: 'a', state: 'offline', engine: 'none', modelsPresent: [] })];
    const ideal = idealFleet(nodes, [job({ id: '1' })]);
    expect(ideal[0].state).toBe('ready');
    expect(ideal[0].engine).toBe('ollama');
    expect(ideal[0].modelsPresent).toContain('llama-3.1-8b');
  });

  it('refuses to pull a model the machine cannot hold', () => {
    const nodes = [node({ id: 'a', vramGB: 12, modelsPresent: [] })];
    const ideal = idealFleet(nodes, [job({ id: 'big', model: 'llama-3.3-70b' })]);
    expect(ideal[0].modelsPresent).not.toContain('llama-3.3-70b');
  });

  it('is never slower than the fleet as configured', () => {
    const nodes = [
      node({ id: 'a', isHost: true }),
      node({ id: 'b', state: 'asleep' }),
      node({ id: 'c', engine: 'none', modelsPresent: [] }),
    ];
    const jobs = [job({ id: '1' }), job({ id: '2' }), job({ id: '3' })];
    expect(schedule(idealFleet(nodes, jobs), jobs).makespanSec).toBeLessThanOrEqual(
      schedule(nodes, jobs).makespanSec + 1e-9,
    );
  });
});
