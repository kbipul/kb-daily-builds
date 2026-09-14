import type { UaSegment } from '../engine/userAgent';

export function UserAgentLine({ segments, sent }: { segments: UaSegment[]; sent: boolean }) {
  return (
    <div className={`ua ${sent ? '' : 'ua-unsent'}`} aria-label="User-Agent header">
      <span className="ua-key">User-Agent:</span>{' '}
      {segments.map((s, i) => (
        <span key={s.key}>
          <span className={`seg seg-${s.kind}`} title={`${s.cite}${s.removedBy ? ` · removed by ${s.removedBy}` : ''}`}>
            {s.text}
          </span>
          {i < segments.length - 1 ? <span className="seg-sep">; </span> : null}
        </span>
      ))}
      {!sent ? <span className="ua-tag">built, never sent</span> : null}
    </div>
  );
}
