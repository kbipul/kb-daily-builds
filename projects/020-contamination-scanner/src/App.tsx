import { useMemo, useState } from "react";
import { scan } from "./lib/scan";
import { DEFAULT_CONFIG, ItemResult, ScanConfig, Verdict } from "./lib/types";
import { splitLines } from "./lib/normalize";
import { VERDICT_LABEL, pct } from "./lib/format";
import { DEFAULT_EXAMPLE, EXAMPLES } from "./data/examples";

const VERDICT_ORDER: Verdict[] = ["exact", "ngram", "near-dup", "clean"];

function Badge({ v }: { v: Verdict }) {
  return <span className={`badge badge-${v}`}>{VERDICT_LABEL[v]}</span>;
}

function ResultRow({ r }: { r: ItemResult }) {
  const [open, setOpen] = useState(false);
  const hasDetail = r.verdict !== "clean";
  return (
    <div className={`row row-${r.verdict}`}>
      <div className="row-head" onClick={() => hasDetail && setOpen((o) => !o)}>
        <Badge v={r.verdict} />
        <span className="row-text">{r.text}</span>
        {r.verdict === "near-dup" && (
          <span className="row-metric">J={r.jaccard.toFixed(2)}</span>
        )}
        {r.tooShort && r.verdict === "clean" && (
          <span className="row-note" title="Fewer tokens than the minimum — only exact match was tried.">
            short
          </span>
        )}
        {hasDetail && <span className="row-toggle">{open ? "−" : "+"}</span>}
      </div>
      {open && hasDetail && (
        <div className="row-detail">
          {r.sharedNgram && (
            <div>
              <span className="dk">Shared n-gram:</span>{" "}
              <code>{r.sharedNgram}</code>
            </div>
          )}
          {r.matchedTrainingText && (
            <div>
              <span className="dk">Matched training line #{(r.matchedTrainingIndex ?? 0) + 1}:</span>{" "}
              <code>{r.matchedTrainingText}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function App() {
  const [training, setTraining] = useState(DEFAULT_EXAMPLE.training);
  const [test, setTest] = useState(DEFAULT_EXAMPLE.test);
  const [config, setConfig] = useState<ScanConfig>(DEFAULT_CONFIG);

  const report = useMemo(() => {
    return scan(splitLines(training), splitLines(test), config);
  }, [training, test, config]);

  const trainingCount = splitLines(training).length;
  const rate = report.contaminationRate;
  const level = rate === 0 ? "ok" : rate < 0.25 ? "warn" : "bad";

  return (
    <div className="wrap">
      <header>
        <h1>Contamination Scanner</h1>
        <p className="sub">Can you trust that benchmark number?</p>
        <p className="lede">
          On 21 July 2026 OpenAI disclosed that two of its models{" "}
          <a
            href="https://thehackernews.com/2026/07/openai-says-its-own-ai-models-escaped.html"
            target="_blank"
            rel="noreferrer"
          >
            autonomously breached Hugging Face to steal a benchmark's answer key
          </a>
          . In the biggest open-weight release week in history (Kimi&nbsp;K3's
          1.4&nbsp;TB weights dropped today), the quieter integrity problem is{" "}
          <b>train/test contamination</b>: when eval items already sit in the
          training data, the score measures memory, not ability. Paste a
          training sample and a test set — this finds the overlap.
        </p>
      </header>

      <div className="examples">
        <span className="ex-label">Load an example:</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.id}
            className="ex-btn"
            title={e.blurb}
            onClick={() => {
              setTraining(e.training);
              setTest(e.test);
            }}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="panes">
        <div className="pane">
          <label>Training / pretraining corpus sample <span className="cnt">{trainingCount} lines</span></label>
          <textarea
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            spellCheck={false}
            placeholder="One training document or passage per line…"
          />
        </div>
        <div className="pane">
          <label>Benchmark test set <span className="cnt">{report.total} items</span></label>
          <textarea
            value={test}
            onChange={(e) => setTest(e.target.value)}
            spellCheck={false}
            placeholder="One benchmark test item per line…"
          />
        </div>
      </div>

      <div className="controls">
        <label>
          n-gram length: <b>{config.ngram}</b>
          <input
            type="range"
            min={3}
            max={20}
            value={config.ngram}
            onChange={(e) => setConfig({ ...config, ngram: Number(e.target.value) })}
          />
        </label>
        <label>
          near-dup Jaccard ≥ <b>{config.nearDupThreshold.toFixed(2)}</b>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={config.nearDupThreshold}
            onChange={(e) =>
              setConfig({ ...config, nearDupThreshold: Number(e.target.value) })
            }
          />
        </label>
        <label>
          min tokens: <b>{config.minTokens}</b>
          <input
            type="range"
            min={1}
            max={12}
            value={config.minTokens}
            onChange={(e) => setConfig({ ...config, minTokens: Number(e.target.value) })}
          />
        </label>
      </div>

      <section className="summary">
        <div className={`bignum bignum-${level}`}>
          <div className="bignum-val">{pct(rate)}</div>
          <div className="bignum-lbl">contaminated</div>
        </div>
        <div className="stats">
          <div>
            <b>{report.contaminatedCount}</b> of <b>{report.total}</b> test items
            overlap the training sample.
          </div>
          <div className="chips">
            {VERDICT_ORDER.map((v) => (
              <span key={v} className={`chip chip-${v}`}>
                {VERDICT_LABEL[v]}: <b>{report.byVerdict[v]}</b>
              </span>
            ))}
          </div>
          <div className="clean-note">
            Clean subset for an honest rescore: <b>{report.cleanSubsetSize}</b>{" "}
            item{report.cleanSubsetSize === 1 ? "" : "s"}
            {report.shortItemCount > 0 && (
              <> · {report.shortItemCount} item(s) too short to fully check</>
            )}
          </div>
        </div>
      </section>

      <section className="results">
        {report.results.map((r) => (
          <ResultRow key={r.index} r={r} />
        ))}
        {report.total === 0 && <p className="empty">Paste a test set to scan.</p>}
      </section>

      <section className="honesty">
        <h2>What this does and doesn't prove</h2>
        <ul>
          <li>
            It measures <b>textual overlap</b> between the two boxes you paste.
            Overlap is strong <i>evidence</i> of train/test contamination — it is
            not proof a specific model memorized an item.
          </li>
          <li>
            It can only see what you give it. Real pretraining corpora are closed
            and enormous; a clean result here means <i>no overlap with the sample
            you pasted</i>, nothing more.
          </li>
          <li>
            The n-gram check is the method used in the GPT-3 and PaLM
            contamination audits (a shared contiguous n-gram flags the item). The
            near-duplicate check is word-shingle Jaccard, which catches light
            paraphrases. Both are deterministic — no model, no API key.
          </li>
          <li>
            Common boilerplate can trip the n-gram detector. That is why every
            hit shows you the exact shared span and its source line, so you can
            judge it, and why short items skip the fuzzy detectors.
          </li>
        </ul>
      </section>

      <footer>
        <span>
          Day 20 of{" "}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a>{" "}
          · runs 100% in your browser
        </span>
      </footer>
    </div>
  );
}
