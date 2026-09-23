import type { ApprovalRecord } from '../model/run';

export function RecordPanel({ record, approved }: { record: ApprovalRecord; approved: boolean }) {
  return (
    <div className="panel">
      <h2>2 · What the approval committed to</h2>
      <p className="hint">
        The reviewer clicked a button. This is the object the framework stored, and it decides what execution is allowed
        to look up later.
      </p>
      {!approved ? (
        <p className="pending">No record yet.</p>
      ) : (
        <dl className="card">
          <div>
            <dt>binding</dt>
            <dd>
              <b className="binding">{record.binding}</b>
            </dd>
          </div>
          <div>
            <dt>actionId</dt>
            <dd>{record.actionId}</dd>
          </div>
          <div>
            <dt>snapshot</dt>
            <dd>{record.snapshot ? 'kept' : <span className="absent">none kept</span>}</dd>
          </div>
          <div>
            <dt>digest</dt>
            <dd>{record.digest ?? <span className="absent">none</span>}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
