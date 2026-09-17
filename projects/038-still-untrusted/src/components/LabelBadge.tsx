import type { ContentLabel } from '../fides/labels';

const INTEGRITY_CLASS: Record<ContentLabel['integrity'], string> = {
  trusted: 'badge-good',
  untrusted: 'badge-danger',
};

const CONF_CLASS: Record<ContentLabel['confidentiality'], string> = {
  public: 'badge-good',
  private: 'badge-warn',
  user_identity: 'badge-danger',
};

export function LabelBadge({ label }: { label: ContentLabel }) {
  return (
    <span className="label-pair">
      <span className={`badge ${INTEGRITY_CLASS[label.integrity]}`}>{label.integrity}</span>
      <span className={`badge ${CONF_CLASS[label.confidentiality]}`}>{label.confidentiality}</span>
    </span>
  );
}
