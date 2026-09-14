import type { Env, Registry } from '../engine/types';
import { varNature } from '../engine/registry';

export function RegistryTable({ registry, env, winnerId }: { registry: Registry; env: Env; winnerId: string | null }) {
  return (
    <div className="reg-wrap">
      <table className="reg" aria-label="Harness registry">
        <thead>
          <tr>
            <th>#</th>
            <th>id</th>
            <th>env var → pattern</th>
            <th>what the var identifies</th>
            <th>in your env</th>
          </tr>
        </thead>
        <tbody>
          {registry.harnesses.map((h, i) => {
            const vars = Object.entries(h.envVars ?? {});
            const present = vars.filter(([k]) => !!env[k]).map(([k]) => k);
            const natures = vars.map(([k]) => varNature(k).nature);
            const nature = natures.includes('terminal') ? 'terminal' : natures.includes('generic-name') ? 'generic-name' : vars.length ? 'agent' : 'standard-only';
            return (
              <tr key={h.id} className={h.id === winnerId ? 'win' : present.length ? 'hit' : ''}>
                <td className="mono dim">{i + 1}</td>
                <td className="mono">
                  {h.id}
                  {h.id === winnerId ? <span className="pill pill-win">reported</span> : null}
                </td>
                <td className="mono small">
                  {vars.length ? vars.map(([k, p]) => `${k} → ${p}`).join('\n') : <span className="dim">— (AI_AGENT / AGENT only)</span>}
                </td>
                <td>
                  <span className={`pill pill-${nature}`}>
                    {nature === 'terminal' ? 'terminal / editor' : nature === 'generic-name' ? 'generic name' : nature === 'agent' ? 'agent marker' : 'standard var only'}
                  </span>
                </td>
                <td className="mono small">{present.length ? present.join(', ') : <span className="dim">–</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
