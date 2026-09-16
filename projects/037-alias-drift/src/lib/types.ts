// Core data model for Alias Drift.
//
// An "identifier" is the string a caller puts in code to select a model —
// a dated snapshot ID, an undated alias, an Azure deployment name under a
// versioning policy, and so on. Two identifiers can look equally "pinned" in
// a config file and behave completely differently over time. That gap is
// the whole product.

export type BindingKind =
  | 'frozen-then-fails'
  | 'alias-repoint'
  | 'auto-upgrade-notice'
  | 'zero-notice-reroute';

export interface BindingKindInfo {
  kind: BindingKind;
  label: string;
  /** Risk score 0 (safest — you always know what changed and when) to 3
   * (riskiest — behavior can change with no warning, indefinitely). */
  risk: 0 | 1 | 2 | 3;
  /** One line: what happens to a running deployment while nothing about
   * the identifier changes. */
  steadyState: string;
  /** What happens at the moment the provider acts on this binding. */
  onEvent: string;
}

export type Provider =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google Gemini'
  | 'Azure OpenAI'
  | 'DeepSeek';

export interface IdentifierRow {
  id: string;
  provider: Provider;
  /** How a developer would actually write this in code / a deployment config. */
  example: string;
  /** Short human label for the identifier shape. */
  shape: string;
  bindingKind: BindingKind;
  /** Advance notice before behavior can change, in the provider's own words. */
  notice: string;
  /** What actually happens when the change lands. */
  postEventBehavior: string;
  sourceUrl: string;
  sourceLabel: string;
  /** Anything this project infers rather than reads verbatim, stated plainly. */
  caveat?: string;
}

export interface SimulationStep {
  t: string;
  label: string;
  detail: string;
  tone: 'neutral' | 'warn' | 'fail';
}
