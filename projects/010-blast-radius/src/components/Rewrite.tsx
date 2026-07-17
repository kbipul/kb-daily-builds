import type { Simulation } from "../lib/types";

export function Rewrite({ simulation }: { simulation: Simulation }) {
  if (!simulation.rewrite) return null;
  return (
    <section className="panel panel--rewrite">
      <h2>Safer</h2>
      <pre className="rewrite__code">
        <code>{simulation.rewrite}</code>
      </pre>
      {simulation.rewriteNote && <p className="rewrite__note">{simulation.rewriteNote}</p>}
    </section>
  );
}
