import type { Finding } from '../engine/types';

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <li className={`finding tier-${finding.confidence}`}>
      <div className="finding-head">
        <span className="chip">{finding.label}</span>
        <code className="finding-raw">{finding.raw}</code>
        {finding.nativeDigits && <span className="native-flag" title="Written in a non-Latin digit script">native digits</span>}
        <span className={`tier tier-${finding.confidence}`}>{finding.confidence}</span>
      </div>
      <p className="finding-reason">{finding.reason}</p>
    </li>
  );
}
