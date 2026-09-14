import { useMemo, useState } from 'react';
import { PRESETS, preset } from './engine/presets';
import { ENTRY_POINTS, HF_HUB_VERSIONS, entryPoint } from './engine/entryPoints';
import { SNAPSHOT_COMMIT, SNAPSHOT_DATE, SNAPSHOT_REGISTRY, SNAPSHOT_URL, diffRegistries, parseRegistryJson, varNature } from './engine/registry';
import { detectAgent, detectLegacy } from './engine/detect';
import { parseEnv, relevantVars } from './engine/parseEnv';
import { simulate } from './engine/simulate';
import { buildUserAgentSegments } from './engine/userAgent';
import type { CacheState, Env, KillSwitches, Registry } from './engine/types';
import { UserAgentLine } from './components/UserAgentLine';
import { Timeline } from './components/Timeline';
import { RegistryTable } from './components/RegistryTable';

type EnvSource = { label: string; env: Env; note: string };

function fromPreset(id: string): EnvSource {
  const p = preset(id);
  return { label: p.label, env: p.env, note: p.blurb + (p.source ? ` Source: ${p.source}.` : '') };
}

export default function App() {
  const [active, setActive] = useState('warp');
  const [source, setSource] = useState<EnvSource>(() => fromPreset('warp'));
  const [paste, setPaste] = useState('');
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const [entryId, setEntryId] = useState('transformers');
  const [hfVersion, setHfVersion] = useState('1.31.0');
  const [torch, setTorch] = useState(true);
  const [cache, setCache] = useState<CacheState>('stale');
  const [hubReachable, setHubReachable] = useState(true);
  const [sw, setSw] = useState<KillSwitches>({ disableTelemetry: false, offline: false, origin: '', noColor: false });

  const [registry, setRegistry] = useState<Registry>(SNAPSHOT_REGISTRY);
  const [regPaste, setRegPaste] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const entry = entryPoint(entryId);
  const version = entry.id === 'whisperx' ? '0.36.0' : hfVersion;

  const sim = useMemo(
    () =>
      simulate({
        entry: entry.kind,
        env: source.env,
        registry,
        switches: sw,
        facts: {
          hfHubVersion: version,
          pythonVersion: '3.12.4',
          torchVersion: torch ? '2.9.0' : null,
          libraryName: entry.kind === 'sdk' ? entry.label : null,
          libraryVersion: entry.kind === 'sdk' ? entry.version : null,
          cache,
          hubReachable,
        },
      }),
    [entry, source, registry, sw, version, torch, cache, hubReachable],
  );

  // The header as it would be built if telemetry were on and a request left — for the hero line.
  const heroSegments = useMemo(
    () =>
      buildUserAgentSegments({
        libraryName: entry.kind === 'sdk' ? entry.label : entry.kind === 'cli' ? 'huggingface-cli' : null,
        libraryVersion: entry.kind === 'sdk' ? entry.version : entry.kind === 'cli' ? version : null,
        hfHubVersion: version,
        pythonVersion: '3.12.4',
        torchVersion: torch ? '2.9.0' : null,
        disableTelemetry: sw.disableTelemetry,
        agentId: sw.disableTelemetry ? null : sim.detect.id,
        origin: sw.origin || null,
      }),
    [entry, version, torch, sw, sim.detect.id],
  );

  const watched = useMemo(() => relevantVars(source.env, registry), [source, registry]);
  const legacy = useMemo(() => detectLegacy(source.env), [source]);
  const registryNow = useMemo(() => detectAgent(source.env, registry), [source, registry]);
  const diff = useMemo(() => diffRegistries(SNAPSHOT_REGISTRY, registry), [registry]);
  const match = sim.detect.match;
  const nature = match?.kind === 'envVar' ? varNature(match.variable) : null;

  function loadPreset(id: string) {
    setActive(id);
    setPasteNote(null);
    setSource(fromPreset(id));
  }
  function ingest() {
    const r = parseEnv(paste);
    const n = Object.keys(r.env).length;
    if (!n) {
      setPasteNote('No variables found. Paste `env` output, or one variable name per line.');
      return;
    }
    setActive('yours');
    setPasteNote(`${n} variable(s) read${r.namesOnly ? `, ${r.namesOnly} as names only` : ''}${r.skipped ? `, ${r.skipped} line(s) skipped` : ''}. Values whose name looks like a credential were blanked. Nothing leaves this page.`);
    setSource({ label: 'Your environment', env: r.env, note: 'Pasted by you. Only the variables the registry names are ever looked at.' });
  }
  function loadRegistry() {
    const { registry: r, error } = parseRegistryJson(regPaste);
    if (!r) {
      setRegError(error);
      return;
    }
    setRegError(null);
    setRegistry(r);
  }

  const verdictClass = sim.detect.id === null ? 'clean' : nature?.nature === 'terminal' ? 'terminal' : nature?.nature === 'generic-name' ? 'generic' : 'agent';
  const humanPresets = PRESETS.filter((p) => p.who === 'human');
  const agentPresets = PRESETS.filter((p) => p.who === 'agent');

  return (
    <div className="wrap">
      <header>
        <h1>Harness Tell</h1>
        <p className="sub">
          Every Hub request now says which agent is running you. Sometimes it is just your terminal. Lay out your
          environment and see what leaves the process — and which of the three kill switches actually stops it.
        </p>
        <p className="cite">
          Signal: <code>huggingface_hub</code> 1.31.0 (10 Sep 2026) tags every Hub request with <code>agent/&lt;harness&gt;</code>, decided by a
          registry the client fetches from the Hub once a day — surfaced by a network-traffic audit on r/LocalLLaMA on 12 Sep. The registry
          entry for Warp matches on <code>TERM_PROGRAM</code>, so a person in a Warp shell is <code>agent/warp</code> (issue #4860, open).
          Everything below is a port of the client's own code at a pinned commit; every step cites its line.
        </p>
      </header>

      <section aria-label="Environment">
        <h2>1 · Your environment</h2>
        <p className="hint">
          Pick who is at the keyboard. Only the variables the registry names are modelled; values are synthetic unless a source is given.
        </p>
        <div className="tabs" role="group" aria-label="Human presets">
          <span className="tab-label">a human</span>
          {humanPresets.map((p) => (
            <button key={p.id} className={active === p.id ? 'on' : ''} aria-pressed={active === p.id} onClick={() => loadPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="tabs" role="group" aria-label="Agent presets">
          <span className="tab-label">an agent</span>
          {agentPresets.map((p) => (
            <button key={p.id} className={active === p.id ? 'on' : ''} aria-pressed={active === p.id} onClick={() => loadPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="note">{source.note}</p>
        <div className="envbox" aria-label="Watched variables">
          {watched.length ? (
            watched.map((k) => {
              const n = varNature(k);
              return (
                <span key={k} className={`chip chip-${n.nature}`} title={n.why}>
                  {k}={source.env[k]}
                </span>
              );
            })
          ) : (
            <span className="dim">Nothing in this environment is on the registry's list.</span>
          )}
          <span className="dim small">
            {' '}
            {Object.keys(source.env).length - watched.length} other variable(s) present and never read.
          </span>
        </div>
        <details className="own">
          <summary>Paste your own — <code>env | cut -d= -f1</code> is enough (names only)</summary>
          <textarea aria-label="Environment to analyse" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'TERM_PROGRAM=WarpTerminal\nCLAUDECODE=1\nZED_TERM'} />
          <div className="row">
            <button className="primary" onClick={ingest}>
              Use this environment
            </button>
            {pasteNote ? <span className="note">{pasteNote}</span> : null}
          </div>
          <p className="hint">
            Two registry entries need an exact value (<code>TERM_PROGRAM=WarpTerminal</code>, <code>VTCODE=1</code>); every other pattern is
            "set to anything". Values whose name contains TOKEN, SECRET, KEY, PASSWORD or AUTH are blanked on paste. This page makes no network
            requests.
          </p>
        </details>
      </section>

      <section aria-label="Process">
        <h2>2 · What your process does</h2>
        <div className="grid2">
          <div>
            <div className="lbl">Entry point</div>
            <div className="tabs">
              {ENTRY_POINTS.map((e) => (
                <button key={e.id} className={entryId === e.id ? 'on' : ''} aria-pressed={entryId === e.id} onClick={() => setEntryId(e.id)}>
                  {e.label}
                </button>
              ))}
            </div>
            <p className="note">
              <code>{entry.call}</code>
              {entry.requires ? (
                <>
                  {' '}
                  — {entry.label} {entry.version} declares <code>{entry.requires}</code> (PyPI, 14 Sep 2026) → resolves huggingface_hub{' '}
                  <b>{entry.resolves}</b>.
                </>
              ) : entry.kind === 'sdk' ? (
                <> — {entry.label} {entry.version} has no direct requirement; huggingface_hub arrives through transformers.</>
              ) : null}
              {entry.note ? <> {entry.note}</> : null}
            </p>
          </div>
          <div>
            <div className="lbl">Installed huggingface_hub</div>
            <div className="tabs">
              {HF_HUB_VERSIONS.map((v) => (
                <button
                  key={v.version}
                  className={version === v.version ? 'on' : ''}
                  aria-pressed={version === v.version}
                  disabled={entry.id === 'whisperx'}
                  onClick={() => setHfVersion(v.version)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="lbl">Registry cache at $HF_HOME/.agent_harnesses.json</div>
            <div className="tabs">
              {(['none', 'fresh', 'stale'] as CacheState[]).map((c) => (
                <button key={c} className={cache === c ? 'on' : ''} aria-pressed={cache === c} onClick={() => setCache(c)}>
                  {c === 'none' ? 'absent' : c === 'fresh' ? '< 24h old' : '≥ 24h old'}
                </button>
              ))}
            </div>
            <div className="toggles">
              <label>
                <input type="checkbox" checked={torch} onChange={(e) => setTorch(e.target.checked)} /> torch importable
              </label>
              <label>
                <input type="checkbox" checked={hubReachable} onChange={(e) => setHubReachable(e.target.checked)} /> huggingface.co reachable
              </label>
            </div>
          </div>
        </div>

        <div className="lbl">Kill switches</div>
        <div className="toggles" role="group" aria-label="Kill switches">
          <label>
            <input type="checkbox" checked={sw.disableTelemetry} onChange={(e) => setSw({ ...sw, disableTelemetry: e.target.checked })} />{' '}
            <code>HF_HUB_DISABLE_TELEMETRY=1</code> <span className="dim">(also DISABLE_TELEMETRY, DO_NOT_TRACK)</span>
          </label>
          <label>
            <input type="checkbox" checked={sw.offline} onChange={(e) => setSw({ ...sw, offline: e.target.checked })} /> <code>HF_HUB_OFFLINE=1</code>{' '}
            <span className="dim">(also TRANSFORMERS_OFFLINE)</span>
          </label>
          <label>
            <input type="checkbox" checked={sw.noColor} onChange={(e) => setSw({ ...sw, noColor: e.target.checked })} /> <code>NO_COLOR=1</code>
          </label>
          <label>
            <code>HF_HUB_USER_AGENT_ORIGIN=</code>
            <input className="txt" aria-label="HF_HUB_USER_AGENT_ORIGIN" value={sw.origin} onChange={(e) => setSw({ ...sw, origin: e.target.value })} placeholder="(unset)" />
          </label>
        </div>
      </section>

      <section aria-label="Verdict" className={`verdict v-${verdictClass}`}>
        <div className="vhead">
          <span className="badge">
            {sim.detect.id === null
              ? sim.detectorCalled
                ? 'no agent reported'
                : 'nothing read'
              : `agent/${sim.detect.id}`}
          </span>
          <span className="vwhy">
            {match ? (
              match.kind === 'envVar' ? (
                <>
                  matched <code>{match.variable}</code>={match.value} → <code>{match.pattern}</code>
                  {' · '}
                  <b>{nature?.nature === 'terminal' ? 'a terminal / editor identity, not an agent marker' : nature?.nature === 'generic-name' ? 'a generic variable name' : 'an agent marker'}</b>
                </>
              ) : match.kind === 'standardVar' ? (
                <>
                  <code>{match.variable}</code>={match.value} names a known harness
                </>
              ) : (
                <>
                  <code>{match.variable}</code>={match.value} is set but unknown to the registry
                </>
              )
            ) : sim.detectorCalled ? (
              sim.registry.detectionDisabled ? (
                'the registry resolved to empty, so nothing can match'
              ) : (
                'none of the watched variables is set'
              )
            ) : (
              'this code path never calls the detector'
            )}
          </span>
        </div>
        {nature?.why ? <p className="vnote">{nature.why}</p> : null}
        <UserAgentLine segments={heroSegments} sent={sim.userAgent !== null} />
        {sim.detect.alsoMatched.length ? (
          <p className="vnote">
            Also matched, but lower in the registry order: {sim.detect.alsoMatched.map((a) => `${a.id} (${a.variable})`).join(', ')}. First match wins; the order is the
            policy.
          </p>
        ) : null}
        {legacy.id !== registryNow.id ? (
          <p className="vnote">
            Same environment on huggingface_hub 1.10–1.18 (hardcoded list, standard vars first): <b>{legacy.id ? `agent/${legacy.id}` : 'no agent'}</b>. The
            answer changed with the client version, not with anything you did.
          </p>
        ) : null}
        <div className="effects" aria-label="Effects">
          {sim.effects.map((e) => (
            <div key={e.id} className={`eff ${e.on ? 'on' : 'off'}`} title={e.cite}>
              <span className="eff-dot" />
              {e.label}
              <span className="eff-cite">{e.cite}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Timeline">
        <h2>3 · What leaves the process, in order</h2>
        <p className="hint">
          One cold process, from start to its first model request. NETWORK rows are requests; PROCESS rows are the client reading your environment or changing
          its own behaviour. Each cites the line at commit <code>129bbb5</code>.
        </p>
        <Timeline steps={sim.steps} />
      </section>

      <section aria-label="Registry">
        <h2>4 · The registry — {registry.harnesses.length} harnesses, {registry.source}</h2>
        <p className="hint">
          What the client matches against. It is not in the wheel you installed: the client fetches it from <code>/api/agent-harnesses</code> and caches it for 24h, so
          the list can change without a release. The "what the var identifies" column is this project's judgement — the registry has no such field — with the
          reason on hover.
        </p>
        <RegistryTable registry={registry} env={source.env} winnerId={sim.detect.id} />
        <details className="own">
          <summary>Use today's registry instead of the {SNAPSHOT_DATE} snapshot</summary>
          <p className="hint">
            Fetch <code>https://huggingface.co/api/agent-harnesses</code> in a browser (or <code>cat $HF_HOME/.agent_harnesses.json</code>) and paste the JSON. The
            snapshot is <a href={SNAPSHOT_URL}>agent-harnesses.ts @ {SNAPSHOT_COMMIT}</a>; this page cannot fetch anything itself.
          </p>
          <textarea aria-label="Registry JSON" value={regPaste} onChange={(e) => setRegPaste(e.target.value)} placeholder='{"standardEnvVars":["AI_AGENT","AGENT"],"harnesses":{"warp":{"envVars":{"TERM_PROGRAM":"WarpTerminal"}}}}' />
          <div className="row">
            <button className="primary" onClick={loadRegistry}>
              Use this registry
            </button>
            <button onClick={() => { setRegistry(SNAPSHOT_REGISTRY); setRegError(null); }}>Back to snapshot</button>
            {regError ? <span className="err">{regError}</span> : null}
          </div>
          {registry !== SNAPSHOT_REGISTRY ? (
            <p className="note">
              Versus the snapshot: {diff.added.length ? `added ${diff.added.join(', ')}` : 'nothing added'};{' '}
              {diff.removed.length ? `removed ${diff.removed.join(', ')}` : 'nothing removed'};{' '}
              {diff.changedVars.length ? `env vars changed for ${diff.changedVars.join(', ')}` : 'no env var changes'}.
            </p>
          ) : null}
        </details>
      </section>

      <section aria-label="Honesty" className="honest">
        <h2>What this is, and is not</h2>
        <p>
          <b>It is</b> a line-for-line port of <code>detect_agent</code>, <code>_env_vars_match</code>, <code>_load_registry</code> and <code>_http_user_agent</code> from{' '}
          <code>huggingface_hub</code> at commit <code>129bbb5</code> (11 Sep 2026), plus the pre-registry detector at <code>90a9805</code>, run against the registry file at{' '}
          <code>huggingface.js@3edf1ba</code>. The client's own test fixture is reproduced in this project's tests so every behaviour claimed has a Python twin.
        </p>
        <p>
          <b>It is not</b> a claim about what Hugging Face does with the header. The docs describe it as attribution for a public agent-usage dataset, and the
          header is plainly visible in any proxy — nothing here is hidden in the cryptographic sense. The gap this measures is a different one: the list of what gets
          reported lives on the server, changes daily, and can key on your terminal emulator. Auditing the wheel no longer tells you what it will say tomorrow.
        </p>
        <p>
          <b>Not verified from here:</b> the live registry — this page has no network access, so the snapshot is from source control, one day before the report
          surfaced; paste today's JSON to check. Preset environments model only the registry-relevant variables. The dependency lines are PyPI metadata for the
          versions shown; a lockfile in your repo may pin something older.
        </p>
      </section>

      <footer>
        <sub>
          Day 034 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> ·{' '}
          <a href="https://github.com/kbipul/harness-tell">source</a> · sources: <a href="https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_detect_agent.py">_detect_agent.py</a>,{' '}
          <a href="https://github.com/huggingface/huggingface_hub/blob/129bbb5cf1a7ca2128636eca1695c9960bddd5ca/src/huggingface_hub/utils/_headers.py">_headers.py</a>,{' '}
          <a href={SNAPSHOT_URL}>agent-harnesses.ts</a>, <a href="https://github.com/huggingface/huggingface_hub/issues/4860">issue #4860</a>,{' '}
          <a href="https://huggingface.co/docs/hub/agents-overview">Hub docs: agents</a>
        </sub>
      </footer>
    </div>
  );
}
