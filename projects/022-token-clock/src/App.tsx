import { useMemo, useState } from "react";
import { MODELS, ZONES, modelById, zoneById } from "./data/pricing";
import { PROFILES, profileById } from "./data/profiles";
import { windowInZone } from "./lib/clock";
import { combineHourly, costForHourly } from "./lib/cost";
import { shiftDeferrable } from "./lib/shift";
import { hourLabel, multiple, pct, tokens, usd } from "./lib/format";
import type { Workload } from "./lib/types";

export default function App() {
  const [modelId, setModelId] = useState("deepseek-v4-flash");
  const [zoneId, setZoneId] = useState("ist");
  const [profileId, setProfileId] = useState("india-saas");
  const [capacity, setCapacity] = useState(2);
  const [overrides, setOverrides] = useState<Record<string, Partial<Workload>>>({});

  const model = modelById(modelId);
  const zone = zoneById(zoneId);
  const profile = profileById(profileId);

  const workloads: Workload[] = useMemo(
    () => profile.workloads.map((w) => ({ ...w, ...(overrides[`${profileId}:${w.id}`] ?? {}) })),
    [profile, overrides, profileId],
  );

  const before = useMemo(
    () => costForHourly(combineHourly(workloads), zone, model),
    [workloads, zone, model],
  );

  const shift = useMemo(
    () => shiftDeferrable(workloads, zone, model, capacity),
    [workloads, zone, model, capacity],
  );

  const after = useMemo(
    () => costForHourly(combineHourly(workloads, shift.shifted), zone, model),
    [workloads, shift, zone, model],
  );

  const saved = before.totalCostUsd - after.totalCostUsd;
  const banded = model.peakWindowsUtc.length > 0;
  const maxTokens = Math.max(
    1,
    ...before.hours.map((h) => h.tokens),
    ...after.hours.map((h) => h.tokens),
  );

  const setWorkload = (id: string, patch: Partial<Workload>) =>
    setOverrides((o) => ({
      ...o,
      [`${profileId}:${id}`]: { ...(o[`${profileId}:${id}`] ?? {}), ...patch },
    }));

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">Day 22 · kb-daily-builds</p>
        <h1>Token Clock</h1>
        <p className="tagline">
          Your AI bill now depends on what time you run it.
        </p>
        <div className="signal">
          <strong>Live at 16:00 UTC, 16 August 2026.</strong> DeepSeek is
          splitting its API pricing into peak and off-peak bands — output tokens
          up to <em>1,100% more expensive</em> than the old flat rate at peak,
          and exactly half the peak rate outside two UTC windows. Time-of-day
          pricing has arrived, and nothing in your stack knows about it yet.
        </div>
      </header>

      <section className="controls">
        <label>
          <span>Model</span>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.provider} {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Your timezone</span>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Traffic profile</span>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Burst headroom · {capacity.toFixed(1)}x</span>
          <input
            type="range"
            min={1}
            max={6}
            step={0.5}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </label>
      </section>

      <p className="blurb">{profile.blurb}</p>

      <section className="ledger">
        <div className="card">
          <span className="card-label">As scheduled</span>
          <span className="card-value">{usd(before.totalCostUsd)}</span>
          <span className="card-sub">per day · output tokens</span>
        </div>
        <div className="card">
          <span className="card-label">Peak exposure</span>
          <span className={`card-value ${before.peakExposure > 0.4 ? "bad" : ""}`}>
            {pct(before.peakExposure)}
          </span>
          <span className="card-sub">of spend at the peak rate</span>
        </div>
        <div className="card good">
          <span className="card-label">After shifting deferrable work</span>
          <span className="card-value">{usd(after.totalCostUsd)}</span>
          <span className="card-sub">
            saves {usd(saved)} / day ·{" "}
            {pct(before.totalCostUsd ? saved / before.totalCostUsd : 0)}
          </span>
        </div>
        <div className="card">
          <span className="card-label">Versus the old flat rate</span>
          <span className="card-value">
            {before.previousFlatCostUsd === null
              ? "—"
              : usd(before.totalCostUsd - before.previousFlatCostUsd)}
          </span>
          <span className="card-sub">
            {model.previousFlatOutputPerMTok === null
              ? "this entry is the old flat rate"
              : `peak is ${multiple(
                  model.previousFlatOutputPerMTok,
                  model.outputPerMTok.peak,
                )} the previous $${model.previousFlatOutputPerMTok}/M`}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Your day, priced hour by hour</h2>
        <p className="hint">
          {banded ? (
            <>
              Peak windows in {zone.label.split(" (")[0]}:{" "}
              {model.peakWindowsUtc.map((w, i) => (
                <span key={i} className="pill">
                  {windowInZone(w, zone)}
                </span>
              ))}
              {zone.offsetMin % 60 !== 0 && (
                <em className="straddle">
                  {" "}
                  — your offset is not a whole number of hours, so the shaded
                  hours are only partly peak-priced.
                </em>
              )}
            </>
          ) : (
            <>This model has no time-of-day bands — every hour costs the same.</>
          )}
        </p>

        <Chart
          title="As scheduled"
          hours={before.hours}
          maxTokens={maxTokens}
          zoneLabel={zone.label}
        />
        <Chart
          title="After shifting deferrable work"
          hours={after.hours}
          maxTokens={maxTokens}
          zoneLabel={zone.label}
        />

        <div className="legend">
          <span><i className="sw peak" /> peak-priced minutes</span>
          <span><i className="sw off" /> off-peak minutes</span>
          <span>bar height = output tokens in that local hour</span>
        </div>
      </section>

      <section className="panel">
        <h2>What can actually move</h2>
        <table className="wl">
          <thead>
            <tr>
              <th>Workload</th>
              <th>Output tokens / day</th>
              <th>Deferrable</th>
              <th>Max shift</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w) => (
              <tr key={w.id}>
                <td>{w.name}</td>
                <td className="num">
                  {tokens(w.hourlyOutputTokens.reduce((a, b) => a + b, 0))}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={w.deferrable}
                    aria-label={`${w.name} deferrable`}
                    onChange={(e) =>
                      setWorkload(w.id, {
                        deferrable: e.target.checked,
                        maxShiftHours: e.target.checked
                          ? Math.max(1, w.maxShiftHours)
                          : 0,
                      })
                    }
                  />
                </td>
                <td>
                  {w.deferrable ? (
                    <>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={w.maxShiftHours}
                        aria-label={`${w.name} max shift hours`}
                        onChange={(e) =>
                          setWorkload(w.id, { maxShiftHours: Number(e.target.value) })
                        }
                      />
                      <span className="num"> ±{w.maxShiftHours}h</span>
                    </>
                  ) : (
                    <span className="muted">fixed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shift.moves.length > 0 ? (
          <>
            <h3>Moves the planner made</h3>
            <ul className="moves">
              {shift.moves.slice(0, 8).map((m, i) => (
                <li key={i}>
                  <code>{hourLabel(m.fromHour)}</code> →{" "}
                  <code>{hourLabel(m.toHour)}</code> · {tokens(m.tokens)} tokens ·
                  saves <strong>{usd(m.savedUsd)}</strong>
                </li>
              ))}
              {shift.moves.length > 8 && (
                <li className="muted">…and {shift.moves.length - 8} more</li>
              )}
            </ul>
          </>
        ) : (
          <p className="muted">
            Nothing to move — either no workload is deferrable, or no cheaper
            hour is reachable within its SLA.
          </p>
        )}

        {shift.strandedTokens > 0 && (
          <p className="warn">
            {tokens(shift.strandedTokens)} tokens wanted to move somewhere
            cheaper and could not: every reachable off-peak hour was already at
            its burst ceiling. Raise the headroom slider, or widen the SLA.
          </p>
        )}
      </section>

      <section className="panel honesty">
        <h2>What this does not tell you</h2>
        <ul>
          <li>
            <strong>Output tokens only.</strong> The repricing coverage quotes
            output rates; per-band input rates were not published in the sources
            used here. Rather than invent an input price, this tool prices output
            tokens and labels every figure as such. Your real bill is higher.
          </li>
          <li>
            <strong>Fixed UTC offsets, no daylight saving.</strong> Each zone is
            labelled with the exact offset used in the arithmetic. If your region
            shifts, pick the zone whose offset matches the date you care about.
          </li>
          <li>
            <strong>Savings assume the work is genuinely deferrable.</strong>{" "}
            Interactive traffic is never moved. The moment you mark something
            deferrable that a user is waiting on, the number above becomes a
            story rather than a saving.
          </li>
          <li>
            <strong>The burst ceiling is a guess about your infrastructure.</strong>{" "}
            A whole day of batch work cannot land in one 3 a.m. hour. The slider
            is where you tell the planner what your pipeline can absorb.
          </li>
          <li>
            <strong>Prices move.</strong> {model.source}. {model.note}
          </li>
        </ul>
      </section>

      <footer>
        <a href="https://github.com/kbipul/token-clock">Source</a> ·{" "}
        <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> ·{" "}
        Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a>
      </footer>
    </div>
  );
}

function Chart({
  title,
  hours,
  maxTokens,
  zoneLabel,
}: {
  title: string;
  hours: { hour: number; tokens: number; peakFraction: number; costUsd: number }[];
  maxTokens: number;
  zoneLabel: string;
}) {
  const total = hours.reduce((s, h) => s + h.costUsd, 0);
  return (
    <div className="chart">
      <div className="chart-head">
        <span>{title}</span>
        <span className="num">{usd(total)}</span>
      </div>
      <div className="bars">
        {hours.map((h) => (
          <div
            key={h.hour}
            className="col"
            title={`${hourLabel(h.hour)} ${zoneLabel} · ${tokens(
              h.tokens,
            )} tokens · ${pct(h.peakFraction, 0)} peak · ${usd(h.costUsd)}`}
          >
            <div className="slot">
              <div
                className="band"
                style={{ height: `${h.peakFraction * 100}%` }}
              />
              <div
                className="bar"
                style={{ height: `${(h.tokens / maxTokens) * 100}%` }}
              />
            </div>
            <span className="tick">{h.hour % 3 === 0 ? h.hour : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
