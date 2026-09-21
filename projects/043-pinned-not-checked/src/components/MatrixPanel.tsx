import { AGENTS, PATCH_LABEL } from '../git/agents';
import type { AgentId } from '../git/agents';
import { HOSTS } from '../git/host';
import { sweepHost } from '../git/findings';

export function MatrixPanel({ current }: { current: AgentId }) {
  const rows = AGENTS.map((a) => ({
    agent: a,
    cells: HOSTS.map((h) => ({
      host: h.id,
      held: sweepHost(h.id).find((x) => x.agent === a.id)!.pinHonoured,
    })),
  }));

  return (
    <section className="panel matrix">
      <h2>Every agent, every host, attack repo in place</h2>
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            {HOSTS.map((h) => (
              <th key={h.id}>{h.label}</th>
            ))}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ agent, cells }) => (
            <tr key={agent.id} className={agent.id === current ? 'current' : undefined}>
              <th scope="row">
                {agent.label}
                <span className="vendor">{agent.vendor}</span>
              </th>
              {cells.map((c) => (
                <td key={c.host} className={c.held ? 'held' : 'broken'}>
                  {c.held ? 'pin held' : 'swapped'}
                </td>
              ))}
              <td className={`patch ${agent.patchState}`}>{PATCH_LABEL[agent.patchState]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Each cell runs that agent&rsquo;s own disclosed command sequence against the attack repo its
        variant needs: a branch named like the pinned SHA for the first three, a branch named
        FETCH_HEAD for Gemini CLI. The GitHub column is the only one where anything holds, and it
        holds for three of four.
      </p>
    </section>
  );
}
