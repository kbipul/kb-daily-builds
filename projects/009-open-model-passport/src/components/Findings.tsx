import type { Finding } from "../lib/types";

export function FindingRow({ finding }: { finding: Finding }) {
  return (
    <div className="finding">
      <div className="f-top">
        <span className={`dot ${finding.clearance}`} aria-hidden="true" />
        <span className="f-area">{finding.area}</span>
        <span className="f-title">{finding.title}</span>
      </div>
      <p className="f-detail">{finding.detail}</p>
      <div className="f-src">
        <span className={`badge-conf ${finding.confidence}`}>{finding.confidence}</span>
        <span>as of {finding.asOf}</span>
        <a href={finding.source} target="_blank" rel="noreferrer noopener">
          source
        </a>
      </div>
    </div>
  );
}
