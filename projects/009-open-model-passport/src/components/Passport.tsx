import type { Passport } from "../lib/types";
import { FindingRow } from "./Findings";

const STAMP: Record<string, string> = {
  clear: "Clear to ship",
  conditions: "Conditions apply",
  blocked: "Blocked",
};

export function PassportView({ passport }: { passport: Passport }) {
  const { model, clearance, summary, findings } = passport;
  return (
    <section className="verdict" aria-label={`Passport for ${model.name}`}>
      <div className={`verdict-head ${clearance}`}>
        <span className={`stamp ${clearance}`} data-testid="stamp">
          {STAMP[clearance]}
        </span>
        <h3>{model.name}</h3>
        <div className="vendor">
          {model.vendor} · {model.params}
        </div>
        <p className="summary">{summary}</p>
        <p className="headline">{model.headline}</p>
      </div>
      <div className="findings">
        {findings.map((f) => (
          <FindingRow key={`${f.area}-${f.title}`} finding={f} />
        ))}
      </div>
    </section>
  );
}
