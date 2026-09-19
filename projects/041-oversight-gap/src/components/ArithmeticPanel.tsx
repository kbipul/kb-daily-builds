import {
  blockedReviewLoad,
  offlineFunnel,
  transcriptsPerAgent,
} from '../oversight/queue';
import { fmt } from '../format';

export function ArithmeticPanel() {
  const load = blockedReviewLoad();
  const funnel = offlineFunnel();
  const perAgent = transcriptsPerAgent(30_000);

  return (
    <section className="panel arithmetic">
      <h2>Three things that fall out of the table</h2>
      <p className="lede">
        Not criticism. Division, applied to figures printed in one table, with
        the lower-bound caveat carried through.
      </p>

      <article className="finding">
        <h3>One rate, printed two ways, about 6% apart</h3>
        <p>
          &ldquo;0.002% of them (about 1 in 47,000)&rdquo; gives two different
          block counts. 0.002% is one in fifty thousand. One in forty-seven
          thousand is 0.00213%.
        </p>
        <div className="pair">
          <div>
            <span className="k">from 0.002%</span>
            <span className="v">{fmt(load.fromPercent)}</span>
          </div>
          <div>
            <span className="k">from 1 in 47,000</span>
            <span className="v">{fmt(load.fromRatio)}</span>
          </div>
          <div>
            <span className="k">difference</span>
            <span className="v">{fmt(load.fromRatio - load.fromPercent)}</span>
          </div>
        </div>
        <p className="scope">
          Both are lower bounds: the denominator is &ldquo;over a billion&rdquo;
          decisions, not a billion.
        </p>
      </article>

      <article className="finding">
        <h3>The one-week review commitment has a workload attached</h3>
        <p>
          &ldquo;Humans review any blocked actions within one week&rdquo; is a
          promise about {fmt(load.fromRatio)} blocked actions spread over 31
          days. That is a standing weekly queue.
        </p>
        <div className="pair">
          <div>
            <span className="k">blocked actions per week</span>
            <span className="v">{fmt(load.perWeekFromRatio)}</span>
          </div>
          <div>
            <span className="k">offline flags reaching a person</span>
            <span className="v">{fmt(funnel.toHumans)}/week</span>
          </div>
        </div>
        <p className="scope">
          The two human queues differ by roughly a hundredfold. The blocked-action
          queue is the larger one by far, and it is the one described with a
          deadline rather than a volume.
        </p>
      </article>

      <article className="finding">
        <h3>The offline flag rate and flag volume want a shared denominator</h3>
        <p>
          {fmt(funnel.flags)} transcripts flagged a week, at one to two per
          thousand, implies the population they were drawn from.
        </p>
        <div className="pair">
          <div>
            <span className="k">at 2 per 1,000</span>
            <span className="v">{fmt(funnel.transcriptsLow)}</span>
          </div>
          <div>
            <span className="k">at 1 per 1,000</span>
            <span className="v">{fmt(funnel.transcriptsHigh)}</span>
          </div>
          <div>
            <span className="k">per agent, per week</span>
            <span className="v">
              {fmt(perAgent.low)}&ndash;{fmt(perAgent.high)}
            </span>
          </div>
        </div>
        <p className="scope">
          Left open here. Either a &ldquo;transcript&rdquo; is much finer-grained
          than a session, or the flag rate and the flag volume are measured over
          different populations. The post does not say which, and this app will
          not guess.
        </p>
      </article>
    </section>
  );
}
