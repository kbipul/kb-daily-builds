import { useMemo, useState } from 'react';
import { PAIRS, CATALOGUE, describe, type ActionId } from './model/action';
import { PROFILES, profileByKey } from './model/profiles';
import { runTurn, type Route } from './model/run';
import { CardPanel } from './components/CardPanel';
import { RecordPanel } from './components/RecordPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { OutcomePanel } from './components/OutcomePanel';

const ROUTES: { key: Route; name: string; blurb: string }[] = [
  { key: 'none', name: 'No attack', blurb: 'The proposal is benign and nothing rewrites it.' },
  {
    key: 'representation',
    name: 'Representation',
    blurb: 'B is already encoded at approval time, and the card omits or misrepresents it.',
  },
  {
    key: 'post-approval',
    name: 'Post-approval substitution',
    blurb: 'The reviewer sees the correct A. Mutable workflow state later replaces it with B.',
  },
];

export default function App() {
  const [pairIndex, setPairIndex] = useState(0);
  const [route, setRoute] = useState<Route>('post-approval');
  const [profileKey, setProfileKey] = useState('agno');
  const [approved, setApproved] = useState(false);

  const pair = PAIRS[pairIndex];
  const profile = profileByKey(profileKey);
  const trace = useMemo(
    () => runTurn({ shown: pair.shown as ActionId, substitute: pair.substitute as ActionId, route, profile }),
    [pair, route, profile],
  );

  function reset(fn: () => void) {
    fn();
    setApproved(false);
  }

  return (
    <main>
      <header>
        <h1>Approved A, Ran B</h1>
        <p className="tagline">A human approved one action. Mutable workflow state supplied a different one.</p>
        <p className="source">
          Loopjacking, <a href="https://arxiv.org/abs/2609.21081">arXiv 2609.21081</a>, Adithyan Arun Kumar. The paper
          names two routes and reports reproducing post-approval substitution in seven Agno AgentOS releases ending at
          3.0.9 and in 12 versions of a conditional in-memory LangGraph Agent Server composition ending at 0.14.0.
        </p>
      </header>

      <section className="controls">
        <fieldset>
          <legend>Action the reviewer is meant to approve</legend>
          {PAIRS.map((p, i) => (
            <label key={p.shown} className="radio">
              <input type="radio" checked={pairIndex === i} onChange={() => reset(() => setPairIndex(i))} />
              <span>
                <code>{describe(CATALOGUE[p.shown])}</code>
                <em>substitute: <code>{describe(CATALOGUE[p.substitute])}</code></em>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Route</legend>
          {ROUTES.map((r) => (
            <label key={r.key} className="radio">
              <input type="radio" checked={route === r.key} onChange={() => reset(() => setRoute(r.key))} />
              <span>
                {r.name}
                <em>{r.blurb}</em>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Approval binding</legend>
          {PROFILES.map((p) => (
            <label key={p.key} className="radio">
              <input type="radio" checked={profileKey === p.key} onChange={() => reset(() => setProfileKey(p.key))} />
              <span>
                {p.name} <b className="binding">{p.binding}</b>
                <em>{p.note}</em>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="stage">
        <CardPanel card={trace.card} approved={approved} onApprove={() => setApproved(true)} />
        <RecordPanel record={trace.record} approved={approved} />
      </section>

      {approved && (
        <section className="stage">
          <TimelinePanel stages={trace.stages} />
          <OutcomePanel trace={trace} benignId={pair.shown} />
        </section>
      )}

      {!approved && (
        <p className="prompt">
          Read the card, then click <b>Approve</b>. Everything below appears only after you have committed, which is the
          point.
        </p>
      )}

      <footer>
        <h2>What this is not</h2>
        <p>
          A model of two binding shapes, not a port of either framework. No version of Agno AgentOS or LangGraph was run
          to build this, and the reproduction ranges above are quoted from the paper rather than reproduced here. The
          digest is FNV-1a, chosen to be readable in eight characters, not to resist anything.
        </p>
        <p className="credit">
          Day 044 of <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · built by{' '}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </p>
      </footer>
    </main>
  );
}
