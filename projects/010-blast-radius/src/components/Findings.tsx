import type { Finding } from "../lib/types";

export function Findings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null;
  return (
    <section className="panel">
      <h2>Why</h2>
      <ul className="findings">
        {findings.map((finding) => (
          <li key={finding.id} className={`finding finding--${finding.severity}`}>
            <h3>{finding.title}</h3>
            <p>{finding.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
