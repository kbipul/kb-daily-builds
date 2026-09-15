import { useState } from 'react';
import { CLASS_LABEL, SOURCE_BY_ID } from '../engine/evidence';
import { VERDICT_LABEL, VERDICT_ORDER } from '../engine/triage';
import type { ClauseResult, TriageResult, Verdict } from '../engine/types';

const TIER_LABEL: Record<string, string> = {
  objective: 'Objective',
  'absolute-constraint': 'Absolute Constraint',
  'human-control': 'Human Control',
  'chain-of-command': 'Chain of Command',
  guideline: 'Guideline',
  default: 'Operational Default',
  process: 'Process commitment',
};

function Row({ r }: { r: ClauseResult }) {
  const [open, setOpen] = useState(false);
  const c = r.clause;
  return (
    <li className={`clause verdict-${r.verdict}`} data-testid={`clause-${c.id}`}>
      <button
        type="button"
        className="clause-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="clause-handle">{c.handle}</span>
        <span className="clause-meta">
          <span className="tag">{c.section}</span>
          <span className="tag tag-tier">{TIER_LABEL[c.tier] ?? c.tier}</span>
          <span className="tag tag-class">{CLASS_LABEL[c.requires]}</span>
          {c.changeable === 'system-instruction' && (
            <span className="tag tag-warn">operator may change</span>
          )}
        </span>
        <span className="clause-caret">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="clause-body">
          <blockquote className="clause-quote">
            {c.text}
            <cite>Code of Conduct, {c.section}</cite>
          </blockquote>
          <dl className="clause-dl">
            <dt>Verdict</dt>
            <dd>
              <strong>{VERDICT_LABEL[r.verdict]}.</strong> {r.reason}
            </dd>
            <dt>What would falsify it</dt>
            <dd>{c.observable}</dd>
            {r.unlockedBy.length > 0 && (
              <>
                <dt>Unlocked by</dt>
                <dd>{r.unlockedBy.map((id) => SOURCE_BY_ID[id].label).join(', ')}</dd>
              </>
            )}
            {c.probe && (
              <>
                <dt>How to test it</dt>
                <dd>
                  <ol className="probe">
                    {c.probe.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </dd>
              </>
            )}
            {c.probeWithheld && (
              <>
                <dt>Procedure withheld</dt>
                <dd className="withheld">{c.probeWithheld}</dd>
              </>
            )}
            {c.note && (
              <>
                <dt>Note</dt>
                <dd className="note">{c.note}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </li>
  );
}

export function ClauseList({ result }: { result: TriageResult }) {
  const groups = new Map<Verdict, ClauseResult[]>();
  for (const r of result.results) {
    const list = groups.get(r.verdict) ?? [];
    list.push(r);
    groups.set(r.verdict, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => VERDICT_ORDER[a[0]] - VERDICT_ORDER[b[0]]);

  return (
    <div data-testid="clause-list">
      {ordered.map(([verdict, rows]) => (
        <section key={verdict} className="clause-group">
          <h3 className={`group-head verdict-${verdict}`}>
            {VERDICT_LABEL[verdict]} <span className="group-n">{rows.length}</span>
          </h3>
          <ul className="clauses">
            {rows.map((r) => (
              <Row key={r.clause.id} r={r} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
