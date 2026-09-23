import { useState } from 'react';
import { PATHS } from './model/repo';
import { initialState, runAudit, summarise, fix, regress, type AuditState } from './model/audit';
import { FindingsPanel } from './components/FindingsPanel';
import { RepoPanel } from './components/RepoPanel';
import { CoveragePanel } from './components/CoveragePanel';

const SEED = 42;

export default function App() {
  const [state, setState] = useState<AuditState>(initialState);
  const sum = summarise(state);
  const runCount = state.runs.length;

  return (
    <main>
      <header>
        <h1>Half the Findings</h1>
        <p className="tagline">
          Independent verification bounds what the report got wrong. It says nothing about what was never found.
        </p>
        <p className="source">
          Cloudflare published{' '}
          <a href="https://github.com/cloudflare/security-audit-skill">security-audit-skill</a> on 19 September 2026,
          a six-phase coding-agent audit whose last phase is independent verification: fresh agents check every factual
          claim against source, and the agent that checks a finding is never the agent that found it. Its own docs also
          report that "a single run found roughly half of the vulnerabilities that repeated runs found in total", and
          that later runs read prior <code>findings.json</code> files "to skip known issues and target gaps". This is a
          simulator for those two facts standing next to each other.
        </p>
      </header>

      <section className="bar">
        <button onClick={() => setState(runAudit(state, SEED))}>
          Run audit {runCount > 0 && <span className="runno">#{runCount + 1}</span>}
        </button>
        <button className="ghost" onClick={() => setState(initialState())} disabled={runCount === 0}>
          Reset
        </button>
        <div className="scoreline">
          <span>
            <b>{sum.confirmed}</b> confirmed
          </span>
          <span>
            <b>{sum.needsValidation}</b> needs_validation
          </span>
          <span>
            <b>{sum.rejected}</b> rejected
          </span>
          <span className="sep" />
          <span className={sum.trueFound < sum.trueTotal ? 'gap' : 'closed'}>
            <b>
              {sum.trueFound}/{sum.trueTotal}
            </b>{' '}
            real vulnerabilities named
          </span>
        </div>
      </section>

      {runCount === 0 && (
        <p className="prompt">
          The repo has eight code paths. A run reads four of them. Press <b>Run audit</b> and read the two panels
          against each other.
        </p>
      )}

      {runCount > 0 && (
        <>
          <section className="stage">
            <FindingsPanel state={state} />
            <RepoPanel
              state={state}
              onFix={(id) => setState(fix(state, id))}
              onRegress={(id) => setState(regress(state, id))}
            />
          </section>
          <CoveragePanel state={state} summary={sum} totalPaths={PATHS.length} />
        </>
      )}

      <footer>
        <h2>What this is not</h2>
        <p>
          Not a port of the skill and not a measurement of it. The phase names, the three verdicts and their criteria,
          the skip-known-issues behaviour and the roughly-half figure are quoted from Cloudflare's published
          description. The hunter here is a seeded coin flip over a fixed eight-path repository, so the numbers on
          screen are properties of this toy and carry no claim about how the real skill performs on real code. The
          repository being audited does not exist.
        </p>
        <p className="credit">
          Day 045 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · built by{' '}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </p>
      </footer>
    </main>
  );
}
