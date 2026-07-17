import type { Casualty, Recovery } from "../lib/types";

const RECOVERY_LABEL: Record<Recovery, string> = {
  regenerable: "rebuildable",
  committed: "in git",
  partial: "edits lost",
  gone: "gone forever",
  "gone-secret": "gone — secret",
};

/** Sort the hopeless cases to the top; that is what the reader needs first. */
const ORDER: Record<Recovery, number> = {
  "gone-secret": 0,
  gone: 1,
  partial: 2,
  committed: 3,
  regenerable: 4,
};

export function Casualties({ casualties }: { casualties: Casualty[] }) {
  const files = casualties.filter((c) => c.type === "file");
  if (files.length === 0) return null;

  const sorted = [...files].sort(
    (a, b) => ORDER[a.recovery] - ORDER[b.recovery] || a.path.localeCompare(b.path),
  );

  return (
    <section className="panel">
      <h2>
        What dies <span className="count">{files.length} files</span>
      </h2>
      <ul className="casualties">
        {sorted.map((casualty) => (
          <li key={casualty.path} className={`casualty casualty--${casualty.recovery}`}>
            <div className="casualty__head">
              <code className="casualty__path">{casualty.path.replace("/home/dev/checkout/", "")}</code>
              <span className="casualty__tag">{RECOVERY_LABEL[casualty.recovery]}</span>
            </div>
            <p className="casualty__reason">{casualty.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
