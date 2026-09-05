import { describe, expect, it } from 'vitest';
import { PRESETS, getPreset } from '../engine/presets';
import { plan } from '../engine/plan';
import { checkEligibility } from '../engine/schedule';
import { formatDuration, getAccelerator, getModel } from '../engine/hardware';

describe('preset integrity', () => {
  it('every preset names a host, a real accelerator and real models', () => {
    for (const p of PRESETS) {
      expect(p.nodes.some((n) => n.isHost)).toBe(true);
      for (const n of p.nodes) {
        expect(getAccelerator(n.accelerator), `${p.id}/${n.id}`).toBeDefined();
        for (const m of n.modelsPresent) expect(getModel(m), `${p.id}/${n.id}/${m}`).toBeDefined();
      }
      for (const j of p.workload.jobs) expect(getModel(j.model), `${p.id}/${j.id}`).toBeDefined();
    }
  });

  it('every preset leaves at least one job placeable', () => {
    for (const p of PRESETS) {
      const r = plan(p.nodes, p.workload.jobs);
      expect(r.cluster.assignments.length, p.id).toBeGreaterThan(0);
    }
  });

  it('node ids are unique inside a preset', () => {
    for (const p of PRESETS) {
      expect(new Set(p.nodes.map((n) => n.id)).size, p.id).toBe(p.nodes.length);
    }
  });
});

/**
 * The calibration check. NVIDIA published two wall-clocks for its IFA demo and
 * nothing else, so the preset's job sizes were chosen to reproduce the SOLO
 * figure. That makes the solo assertion a check on my arithmetic, and the
 * cluster assertion a check on the MODEL - it is free to be wrong, and the
 * README quotes whatever it says.
 */
describe("the NVIDIA demo preset, against NVIDIA's published numbers", () => {
  const PUBLISHED_SOLO_SEC = 18 * 60;
  const PUBLISHED_CLUSTER_SEC = 8 * 60 + 48;
  const p = getPreset('nvidia-demo');
  const r = plan(p.nodes, p.workload.jobs);

  it('lands the single-machine run within 5% of the published 18 minutes', () => {
    const err = Math.abs(r.solo.makespanSec - PUBLISHED_SOLO_SEC) / PUBLISHED_SOLO_SEC;
    expect(err, `solo ${formatDuration(r.solo.makespanSec)}`).toBeLessThan(0.05);
  });

  it('predicts a cluster time on the optimistic side of the measured one', () => {
    // Recorded, not aspired to: the simulator assumes a perfectly warm router
    // and gets there sooner than the real cluster did. The README quotes this
    // gap; the test exists so it cannot drift silently.
    expect(r.cluster.makespanSec).toBeLessThan(PUBLISHED_CLUSTER_SEC);
    expect(r.cluster.makespanSec).toBeGreaterThan(PUBLISHED_CLUSTER_SEC * 0.6);
  });

  it('agrees with the published speedup to within half a turn', () => {
    const published = PUBLISHED_SOLO_SEC / PUBLISHED_CLUSTER_SEC;
    expect(Math.abs(r.speedup - published)).toBeLessThan(0.5);
  });
});

describe('the home-office preset', () => {
  const p = getPreset('home-office');
  const r = plan(p.nodes, p.workload.jobs);

  it('leaves the laptop doing all of the work', () => {
    const workers = new Set(r.cluster.assignments.map((a) => a.nodeId));
    expect([...workers]).toEqual(['mbp']);
  });

  it('gains nothing from the fleet as configured', () => {
    expect(r.speedup).toBeCloseTo(1, 1);
  });

  it('would gain a great deal if the fleet were eligible', () => {
    expect(r.ceilingSpeedup).toBeGreaterThan(1.5);
  });

  it('blocks the gaming PC on the human using it, not on anything technical', () => {
    const gaming = p.nodes.find((n) => n.id === 'gaming')!;
    const c = checkEligibility(gaming, p.workload.jobs[1]);
    expect(c.blockers).toEqual(['in use by a human']);
  });
});

describe('the office-fleet preset', () => {
  const p = getPreset('studio-overnight');
  const r = plan(p.nodes, p.workload.jobs);

  it('runs the 70B only on the one machine with the memory for it', () => {
    const big = r.cluster.assignments.find((a) => a.jobId === 'q2');
    expect(big?.nodeId).toBe('spark');
  });

  it('cannot run on the host at all, so no speedup is claimed', () => {
    // The build server holds 16 GB and the policy check wants a 70B. PAIR is
    // not making this faster here, it is the only reason it runs.
    expect(r.soloFeasible).toBe(false);
    expect(r.speedup).toBe(0);
    expect(r.solo.unplaced.map((u) => u.jobId)).toContain('q2');
  });

  it('still measures headroom, because cluster and ceiling run the same jobs', () => {
    expect(r.headroom).toBeGreaterThan(1.5);
  });

  it('finds a fix worth several minutes', () => {
    expect(r.findings[0].savedSec).toBeGreaterThan(300);
    expect(r.findings[0].gate).toBe('availability');
  });

  it('sends more than half the fleet home unused', () => {
    expect(r.cluster.idleNodeIds.length).toBeGreaterThanOrEqual(4);
  });
});

/**
 * Numbers quoted in the README. If the engine changes and these move, the
 * write-up is wrong and the build should fail rather than ship a stale claim.
 */
describe('README figures', () => {
  const facts = PRESETS.map((p) => {
    const r = plan(p.nodes, p.workload.jobs);
    return {
      id: p.id,
      solo: Math.round(r.solo.makespanSec),
      cluster: Math.round(r.cluster.makespanSec),
      ceiling: Math.round(r.ceiling.makespanSec),
      speedup: Number(r.speedup.toFixed(2)),
      ceilingSpeedup: Number(r.ceilingSpeedup.toFixed(2)),
      headroom: Number(r.headroom.toFixed(2)),
      soloFeasible: r.soloFeasible,
      topFix: r.findings[0] ? Math.round(r.findings[0].savedSec) : 0,
      idle: r.cluster.idleNodeIds.length,
    };
  });

  it('matches the table in the README', () => {
    expect(facts).toMatchInlineSnapshot(`
      [
        {
          "ceiling": 448,
          "ceilingSpeedup": 2.44,
          "cluster": 448,
          "headroom": 1,
          "id": "nvidia-demo",
          "idle": 0,
          "solo": 1095,
          "soloFeasible": true,
          "speedup": 2.44,
          "topFix": 0,
        },
        {
          "ceiling": 497,
          "ceilingSpeedup": 4.65,
          "cluster": 2310,
          "headroom": 4.65,
          "id": "home-office",
          "idle": 3,
          "solo": 2310,
          "soloFeasible": true,
          "speedup": 1,
          "topFix": 1683,
        },
        {
          "ceiling": 444,
          "ceilingSpeedup": 0,
          "cluster": 929,
          "headroom": 2.09,
          "id": "studio-overnight",
          "idle": 5,
          "solo": 923,
          "soloFeasible": false,
          "speedup": 0,
          "topFix": 462,
        },
      ]
    `);
  });

  // The three rows printed in the README, pinned individually so a failure
  // names the row that went stale rather than dumping a whole snapshot diff.
  it('pins the exact wall-clocks the README prints', () => {
    const byId = Object.fromEntries(facts.map((f) => [f.id, f]));

    expect(formatDuration(byId['nvidia-demo'].solo)).toBe('18m 15s');
    expect(formatDuration(byId['nvidia-demo'].cluster)).toBe('7m 28s');
    expect(byId['nvidia-demo'].speedup).toBe(2.44);

    expect(formatDuration(byId['home-office'].solo)).toBe('38m 30s');
    expect(formatDuration(byId['home-office'].cluster)).toBe('38m 30s');
    expect(formatDuration(byId['home-office'].ceiling)).toBe('8m 17s');
    expect(byId['home-office'].speedup).toBe(1);

    expect(byId['studio-overnight'].soloFeasible).toBe(false);
    expect(formatDuration(byId['studio-overnight'].cluster)).toBe('15m 29s');
    expect(formatDuration(byId['studio-overnight'].ceiling)).toBe('7m 24s');
  });

  it('pins the two savings quoted in the write-up', () => {
    const home = plan(getPreset('home-office').nodes, getPreset('home-office').workload.jobs);
    expect(formatDuration(home.findings[0].savedSec)).toBe('28m 03s');
    expect(home.findings[0].action).toBe('Free up Gaming PC');
    expect(formatDuration(home.findings[1].savedSec)).toBe('23m 23s');

    const office = plan(
      getPreset('studio-overnight').nodes,
      getPreset('studio-overnight').workload.jobs,
    );
    expect(formatDuration(office.findings[0].savedSec)).toBe('7m 42s');
  });
});
