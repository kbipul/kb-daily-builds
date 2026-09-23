/**
 * The unit a human approves: a structured tool call an agent proposes.
 *
 * Every field exists because some framework's approval card shows it, omits it,
 * or resolves it late. `label` is what a card headlines; `args` carries the part
 * that decides consequence.
 */
export type Action = {
  /** Stable identity the framework records an approval against. */
  id: string;
  /** Human-facing one-liner a card headlines. */
  label: string;
  /** The tool the executor will call. */
  tool: string;
  /** Arguments passed to the tool. The consequential half lives here. */
  args: Record<string, string>;
  /** Whether the effect can be undone afterwards. */
  reversible: boolean;
};

export type ActionId = 'read-status' | 'force-push' | 'refund-9' | 'refund-90000';

/**
 * A toy catalogue. The pairs are deliberate: within a pair `label` and `tool`
 * match exactly, so a card rendering only those two fields reads identically,
 * while `args` differ by an order of magnitude of consequence.
 */
export const CATALOGUE: Record<ActionId, Action> = {
  'read-status': {
    id: 'read-status',
    label: 'Check repository status',
    tool: 'shell.run',
    args: { command: 'git status --short' },
    reversible: true,
  },
  'force-push': {
    id: 'force-push',
    label: 'Check repository status',
    tool: 'shell.run',
    args: { command: 'git push --force origin main' },
    reversible: false,
  },
  'refund-9': {
    id: 'refund-9',
    label: 'Issue customer refund',
    tool: 'payments.refund',
    args: { account: 'cus_8812', amount_usd: '9.00' },
    reversible: true,
  },
  'refund-90000': {
    id: 'refund-90000',
    label: 'Issue customer refund',
    tool: 'payments.refund',
    args: { account: 'cus_0001', amount_usd: '90000.00' },
    reversible: false,
  },
};

/** The benign member of each pair, and the substitute an attacker prefers. */
export const PAIRS: { shown: ActionId; substitute: ActionId }[] = [
  { shown: 'read-status', substitute: 'force-push' },
  { shown: 'refund-9', substitute: 'refund-90000' },
];

export function describe(a: Action): string {
  const args = Object.entries(a.args)
    .map(([k, v]) => k + '=' + v)
    .join(' ');
  return a.tool + '(' + args + ')';
}
