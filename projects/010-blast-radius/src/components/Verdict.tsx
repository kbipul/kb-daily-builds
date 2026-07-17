import type { Simulation } from "../lib/types";

const LABEL: Record<Simulation["severity"], string> = {
  safe: "SAFE",
  caution: "CAUTION",
  destructive: "DESTRUCTIVE",
  catastrophic: "CATASTROPHIC",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, power);
  return `${value >= 100 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`;
}

export function Verdict({ simulation }: { simulation: Simulation }) {
  const files = simulation.casualties.filter((c) => c.type === "file");
  const unrecoverable = files.filter(
    (c) => c.recovery === "gone" || c.recovery === "gone-secret",
  );
  const severity = simulation.unknown && files.length === 0 ? "unknown" : simulation.severity;

  return (
    <section className={`verdict verdict--${severity}`} aria-live="polite">
      <div className="verdict__banner">
        <span className="verdict__label">{simulation.unknown && files.length === 0 ? "UNKNOWN" : LABEL[simulation.severity]}</span>
        <p className="verdict__line">{simulation.verdict}</p>
      </div>

      {simulation.expansionChanged && (
        <div className="expansion">
          <div className="expansion__row">
            <span className="expansion__tag">you typed</span>
            <code>{simulation.input.trim()}</code>
          </div>
          <div className="expansion__row expansion__row--after">
            <span className="expansion__tag">what runs</span>
            <code>{simulation.expanded}</code>
          </div>
        </div>
      )}

      <dl className="stats">
        <div>
          <dt>files destroyed</dt>
          <dd>{files.length}</dd>
        </div>
        <div>
          <dt>unrecoverable</dt>
          <dd className={unrecoverable.length ? "stat--bad" : undefined}>{unrecoverable.length}</dd>
        </div>
        <div>
          <dt>data lost</dt>
          <dd>{formatBytes(simulation.bytesDestroyed)}</dd>
        </div>
        <div>
          <dt>leaves project</dt>
          <dd className={simulation.escapesRoot ? "stat--bad" : undefined}>
            {simulation.escapesRoot ? "yes" : "no"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
