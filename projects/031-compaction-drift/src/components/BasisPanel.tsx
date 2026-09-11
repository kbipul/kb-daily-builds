import { DEFAULT_RETENTION, FACT_KIND_LABEL } from '../engine/policies';
import type { FactKind } from '../engine/types';

interface Props {
  retention: Record<FactKind, number>;
  onChange: (kind: FactKind, value: number) => void;
  onReset: () => void;
}

export default function BasisPanel({ retention, onChange, onReset }: Props) {
  const dirty = (Object.keys(retention) as FactKind[]).some(
    (k) => retention[k] !== DEFAULT_RETENTION[k],
  );

  return (
    <section className="panel panel-basis" aria-labelledby="basis-heading">
      <h2 id="basis-heading">What is documented here, and what is my guess</h2>

      <div className="basis-grid">
        <div>
          <h3>Documented</h3>
          <ul>
            <li>
              The Agents API went to public beta on 10 September 2026, and OpenAI manages sessions,
              orchestration, context compaction and recovery on your behalf. It{' '}
              <a
                href="https://developers.openai.com/api/docs/guides/compaction"
                target="_blank"
                rel="noreferrer"
              >
                automatically compacts
              </a>{' '}
              earlier context as a session nears its limit, &ldquo;preserving information the agent
              needs to continue&rdquo;.
            </li>
            <li>
              Each subagent{' '}
              <a
                href="https://developers.openai.com/api/docs/guides/agents-api/multi-agent"
                target="_blank"
                rel="noreferrer"
              >
                maintains its own context
              </a>
              , so nothing from the main thread reaches it unless it is in the brief.
            </li>
            <li>
              The six policies in the dropdown are all real techniques, each linked to its source.
              User-verbatim compaction in particular is a published contract: operator messages stay
              word for word, assistant turns, tool calls and reasoning become an opaque item.
            </li>
          </ul>
        </div>

        <div>
          <h3>My guess</h3>
          <ul>
            <li>
              <b>OpenAI has not published how its summariser works.</b> This does not simulate the
              Agents API. It simulates what each documented <i>family</i> of technique does to a
              rule, which is a question you can ask before any vendor answers the first one.
            </li>
            <li>
              The retention table below is engineering judgement, not measurement. The{' '}
              <b>ordering</b> is the argument: a summariser told to preserve what the agent needs to
              continue keeps task state first and a one-clause carve-out last. The{' '}
              <b>magnitudes</b> are invented, which is why they are editable — disagree with the
              numbers without having to disagree with the ordering.
            </li>
            <li>
              Transcript growth is modelled as linear. Real sessions grow in jumps; one large tool
              result can force a round by itself. That changes <i>when</i>, not <i>whether</i>.
            </li>
          </ul>
        </div>
      </div>

      <div className="retention">
        <h3>
          Fidelity kept per summarisation round {dirty && <button onClick={onReset}>reset</button>}
        </h3>
        {(Object.keys(retention) as FactKind[]).map((kind) => (
          <label className="field field-inline" key={kind}>
            <span className="field-label">
              {FACT_KIND_LABEL[kind]} <b>{retention[kind].toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={retention[kind]}
              onChange={(e) => onChange(kind, Number(e.target.value))}
              aria-label={`Retention for ${FACT_KIND_LABEL[kind]}`}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
