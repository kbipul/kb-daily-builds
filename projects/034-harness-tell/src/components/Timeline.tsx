import type { Step } from '../engine/types';

const LABEL: Record<Step['kind'], string> = {
  registry: 'NETWORK',
  request: 'NETWORK',
  effect: 'PROCESS',
  blocked: 'BLOCKED',
  note: 'NOTE',
};

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="timeline" aria-label="Request timeline">
      {steps.map((s) => (
        <li key={s.n} className={`step step-${s.kind}`}>
          <div className="step-head">
            <span className="step-n">{s.n}</span>
            <span className={`step-kind k-${s.kind}`}>{LABEL[s.kind]}</span>
            <span className="step-title">{s.title}</span>
          </div>
          <p className="step-detail">{s.detail}</p>
          {s.userAgent ? (
            <pre className="step-ua">
              <span className="ua-key">User-Agent:</span> {s.userAgent}
            </pre>
          ) : null}
          {s.cite ? <div className="step-cite">{s.cite}</div> : null}
        </li>
      ))}
    </ol>
  );
}
