import { useMemo, useState } from 'react';
import { AGENTS, getAgent } from './git/agents';
import type { AgentId } from './git/agents';
import { HOSTS, getHost } from './git/host';
import type { HostId } from './git/host';
import { BUMPED_PIN, benignRepo, fetchHeadBranchRepo, shaBranchRepo } from './git/repo';
import { runInstall } from './git/install';
import { contextualFindings, sourceTension, standingFindings } from './git/findings';
import { TracePanel } from './components/TracePanel';
import { MatrixPanel } from './components/MatrixPanel';
import { FindingsPanel } from './components/FindingsPanel';
import { SourcePanel } from './components/SourcePanel';

type RepoState = 'clean' | 'attack';

export default function App() {
  const [agentId, setAgentId] = useState<AgentId>('claude-code');
  const [hostId, setHostId] = useState<HostId>('bitbucket');
  const [repoState, setRepoState] = useState<RepoState>('attack');
  const [assertHead, setAssertHead] = useState(false);

  const agent = getAgent(agentId);
  const host = getHost(hostId);

  const repo = useMemo(() => {
    if (repoState === 'clean') return benignRepo();
    return agent.shape === 'clone-fetch-checkout-fetch-head'
      ? fetchHeadBranchRepo()
      : shaBranchRepo(BUMPED_PIN);
  }, [repoState, agent.shape]);

  const result = useMemo(
    () => runInstall({ repo, host: hostId, agent: agentId, pin: BUMPED_PIN, assertHead }),
    [repo, hostId, agentId, assertHead],
  );

  const findings = [
    ...standingFindings(),
    ...contextualFindings(result, agentId),
    sourceTension(),
  ];

  return (
    <main>
      <header>
        <p className="kicker">Day 043 of kb-daily-builds</p>
        <h1>Pinned, Not Checked</h1>
        <p className="lede">
          The agent checked out the commit the marketplace pinned. Nothing checked that it landed
          there. Drive the four disclosed install sequences against a repository whose owner has
          turned hostile and watch a pin stay green over somebody else&rsquo;s code.
        </p>
        <p className="riding">
          Riding the Plugin4Shell disclosure of 17 September 2026, which reports the same missing
          check in Claude Code, Codex, GitHub Copilot and Gemini CLI. Two of the four have a patch.
        </p>
      </header>

      <section className="panel controls">
        <h2>Set up the install</h2>

        <fieldset>
          <legend>Agent</legend>
          <div className="chips">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                className={a.id === agentId ? 'chip on' : 'chip'}
                onClick={() => setAgentId(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="hint">{agent.patchNote}</p>
        </fieldset>

        <fieldset>
          <legend>Marketplace backend</legend>
          <div className="chips">
            {HOSTS.map((h) => (
              <button
                key={h.id}
                className={h.id === hostId ? 'chip on' : 'chip'}
                onClick={() => setHostId(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
          <p className="hint">{host.note}</p>
        </fieldset>

        <fieldset>
          <legend>Repository</legend>
          <div className="chips">
            <button
              className={repoState === 'clean' ? 'chip on' : 'chip'}
              onClick={() => setRepoState('clean')}
            >
              Reviewed and unchanged
            </button>
            <button
              className={repoState === 'attack' ? 'chip on' : 'chip'}
              onClick={() => setRepoState('attack')}
            >
              Owner turned hostile
            </button>
          </div>
          <p className="hint">
            {repoState === 'clean'
              ? `Default branch main, pointing at the pinned commit ${BUMPED_PIN.slice(0, 7)}….`
              : agent.shape === 'clone-fetch-checkout-fetch-head'
                ? 'A branch named FETCH_HEAD, pointing at the rug-pull commit, set as the default.'
                : `A branch named ${BUMPED_PIN.slice(0, 7)}… — the pinned SHA itself — pointing at the rug-pull commit, set as the default.`}
          </p>
        </fieldset>

        <label className="toggle">
          <input
            type="checkbox"
            checked={assertHead}
            onChange={(e) => setAssertHead(e.target.checked)}
          />
          <span>
            Apply the fix: <code>test "$(git rev-parse HEAD)" = "&lt;pinned-sha&gt;" || abort</code>
          </span>
        </label>
      </section>

      <TracePanel result={result} repo={repo} />
      <MatrixPanel current={agentId} />
      <FindingsPanel findings={findings} />
      <SourcePanel />

      <footer>
        <p>
          A simulator, not a scanner. It reproduces two documented git name-resolution behaviours
          against a toy repository. It does not read your machine, test your agent, or tell you
          whether anything you have installed is affected.
        </p>
        <p>
          Built by <a href="https://www.kumarbipul.com">Kumar Bipul</a> &middot;{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>
        </p>
      </footer>
    </main>
  );
}
