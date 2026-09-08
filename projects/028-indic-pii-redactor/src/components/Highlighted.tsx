import type { Segment } from '../engine/redact';

export function Highlighted({ segments }: { segments: Segment[] }) {
  return (
    <pre className="highlight">
      {segments.map((seg, i) =>
        seg.finding ? (
          <mark
            key={i}
            className={`hl tier-${seg.finding.confidence}`}
            title={`${seg.finding.label} — ${seg.finding.confidence}: ${seg.finding.reason}`}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </pre>
  );
}
