import type { TriageResult, Verdict } from '../engine/types';
import { VERDICT_LABEL } from '../engine/triage';

const SHOWN: Verdict[] = [
  'checkable',
  'checkable-configurable',
  'needs-access',
  'unfalsifiable',
  'out-of-scope',
];

const BLURB: Record<Verdict, string> = {
  checkable: 'Your evidence would show a violation.',
  'checkable-configurable': 'Testable, and a Part 4 default a system instruction may change.',
  'needs-access': 'Reachable, with access you do not hold.',
  unfalsifiable: 'No behavioural observable is stated.',
  'out-of-scope': 'The document does not govern this surface.',
};

export function Scoreboard({ result }: { result: TriageResult }) {
  return (
    <div className="scoreboard" data-testid="scoreboard">
      {SHOWN.map((v) => (
        <div key={v} className={`score score-${v}`} data-testid={`score-${v}`}>
          <div className="score-n">{result.counts[v]}</div>
          <div className="score-label">{VERDICT_LABEL[v]}</div>
          <div className="score-blurb">{BLURB[v]}</div>
        </div>
      ))}
    </div>
  );
}
