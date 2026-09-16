import type { BindingKind, BindingKindInfo, IdentifierRow } from './types';

export const BINDING_KINDS: Record<BindingKind, BindingKindInfo> = {
  'frozen-then-fails': {
    kind: 'frozen-then-fails',
    label: 'Frozen, then fails',
    risk: 0,
    steadyState: 'Weights and behavior never change while the identifier is active.',
    onEvent:
      'On its retirement date the identifier stops working. Requests fail with an error. Nothing in between — you never get a different answer from the same call, only no answer at all.',
  },
  'alias-repoint': {
    kind: 'alias-repoint',
    label: 'Alias, repoints anytime',
    risk: 2,
    steadyState:
      'The identifier is a pointer, not a model. It currently resolves to some underlying snapshot, but that mapping is not part of any contract.',
    onEvent:
      'The provider updates what the alias points to. Your code does not change, your logs show the same model name, and the response you get can be materially different — new weights, new latency, new price — starting with the very next call.',
  },
  'auto-upgrade-notice': {
    kind: 'auto-upgrade-notice',
    label: 'Auto-upgrades, with notice',
    risk: 1,
    steadyState:
      'The deployment name stays fixed, but it is configured to track "whatever the platform currently calls default" for that model family.',
    onEvent:
      'You get an advance warning through the standard notification channel. If you do nothing, the deployment silently starts serving the new default version at the announced time. Acting on the notice buys you a choice; ignoring it does not stop the switch, it just makes the switch a surprise.',
  },
  'zero-notice-reroute': {
    kind: 'zero-notice-reroute',
    label: 'Zero-notice reroute',
    risk: 3,
    steadyState: 'The identifier currently reaches the model you expect.',
    onEvent:
      'The provider retires the model behind the identifier and repoints it to a replacement on the same day, with no advance notice and no failure — the call still succeeds, it is just answered by something else. There is no version of this row where you find out from the API.',
  },
};

export const CORPUS: IdentifierRow[] = [
  {
    id: 'openai-dated-snapshot',
    provider: 'OpenAI',
    example: 'gpt-5-2025-08-07',
    shape: 'Dated snapshot ID',
    bindingKind: 'frozen-then-fails',
    notice:
      'A deprecation notice is published ahead of the removal date — the gpt-5 / o3 snapshots retiring were announced 11 Jun 2026 for a 11 Dec 2026 removal, about six months.',
    postEventBehavior:
      'The snapshot is "deprecated and removed from the API." Calls after the removal date do not resolve to a newer model under the same ID.',
    sourceUrl: 'https://developers.openai.com/api/docs/deprecations',
    sourceLabel: 'developers.openai.com/api/docs/deprecations',
    caveat:
      'OpenAI’s page does not spell out the literal error code returned after removal. "Removed from the API" is treated here as a hard failure, not a silent reroute — that is an inference, not a quoted guarantee.',
  },
  {
    id: 'openai-undated-alias',
    provider: 'OpenAI',
    example: 'gpt-5, o3 (no dated suffix)',
    shape: 'Undated alias',
    bindingKind: 'alias-repoint',
    notice: 'No fixed advance-notice window is documented for what an alias currently resolves to.',
    postEventBehavior:
      '"An undated alias points to whichever model OpenAI designates as current, while a dated snapshot ID never changes its underlying weights or behavior. Aliases can change behavior overnight without changing your code."',
    sourceUrl: 'https://developers.openai.com/api/docs/deprecations',
    sourceLabel: 'developers.openai.com/api/docs/deprecations',
  },
  {
    id: 'anthropic-dateless-4-6',
    provider: 'Anthropic',
    example: 'claude-opus-4-6 (4.6-generation dateless ID)',
    shape: 'Dateless canonical ID (4.6+)',
    bindingKind: 'frozen-then-fails',
    notice:
      'At least 60 days’ notice before retirement, for every model ID, dated or dateless.',
    postEventBehavior:
      'For the 4.6 generation and later, the dateless ID is the canonical model ID and maps to a single, fixed snapshot. Anthropic does not update the weights or configuration of an existing model ID; an update ships under a new ID. Requests to a retired ID fail.',
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/model-deprecations',
    sourceLabel: 'platform.claude.com/docs — model-deprecations, model-ids-and-versions',
  },
  {
    id: 'anthropic-legacy-alias',
    provider: 'Anthropic',
    example: 'claude-sonnet-4-5 (pre-4.6 convenience alias)',
    shape: 'Legacy convenience alias',
    bindingKind: 'alias-repoint',
    notice: 'Same 60-day retirement notice applies to the alias’s own lifecycle, not to it repointing within that lifecycle.',
    postEventBehavior:
      'An alias like this "is a convenience pointer that resolves to the most recent dated snapshot for that minor version" — so within its supported life it can move to a newer dated snapshot without a code change, even though each dated snapshot underneath is itself frozen.',
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions',
    sourceLabel: 'platform.claude.com/docs — model-ids-and-versions',
  },
  {
    id: 'azure-auto-update-default',
    provider: 'Azure OpenAI',
    example: 'Deployment on the "Auto-update to default" version policy',
    shape: 'Deployment, auto-update policy',
    bindingKind: 'auto-upgrade-notice',
    notice: 'Microsoft notifies customers at least two weeks before a new version becomes the default for that model.',
    postEventBehavior:
      'When Microsoft designates a newer version of the same model family as the default, a deployment on this policy automatically switches to it — same deployment name, different version underneath.',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-versions',
    sourceLabel: 'learn.microsoft.com — Foundry Models, model-versions',
  },
  {
    id: 'azure-upgrade-when-expired',
    provider: 'Azure OpenAI',
    example: 'Deployment pinned to a specific version, "upgrade when expired"',
    shape: 'Deployment, pinned version',
    bindingKind: 'auto-upgrade-notice',
    notice: 'Azure keeps the previous major version available until its own scheduled retirement date; no separate notice is documented for the auto-upgrade that follows.',
    postEventBehavior:
      'Pinning a version delays the change, it does not prevent it: "when the retirement date is reached the model will automatically upgrade to the default version at the time of retirement." A pinned deployment is frozen until its own end-of-life, then it silently becomes whatever is current — it never simply fails the way an OpenAI or Anthropic retirement does.',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-versions',
    sourceLabel: 'learn.microsoft.com — Foundry Models, model-versions',
    caveat:
      'Community Q&A threads describe this behavior consistently, but this project did not find a single canonical policy page stating the retirement-time auto-upgrade in those exact words — treated as reliable, not verbatim-primary.',
  },
  {
    id: 'gemini-latest-alias',
    provider: 'Google Gemini',
    example: 'gemini-2.5-flash-latest',
    shape: '"-latest" alias',
    bindingKind: 'alias-repoint',
    notice: 'At least two weeks’ notice, and only for changes classified as breaking.',
    postEventBehavior:
      'The "-latest" alias "points to the latest release for a specific model variation... This alias will get hot-swapped with every new release." Non-breaking swaps carry no notice at all.',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/deprecations',
    sourceLabel: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-stable-dated',
    provider: 'Google Gemini',
    example: 'gemini-2.5-flash-001 (dated stable release)',
    shape: 'Stable dated version',
    bindingKind: 'frozen-then-fails',
    notice: 'A shutdown date is published per model; Google states its table’s dates are "the earliest possible dates on which a model might be retired" — the real date can slip later, never earlier.',
    postEventBehavior: 'Once shut down, "the endpoint is no longer available." No reroute.',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/deprecations',
    sourceLabel: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'deepseek-retiring-id',
    provider: 'DeepSeek',
    example: 'deepseek-v4-flash (retired 10 Sep 2026)',
    shape: 'Model ID, no versioning contract',
    bindingKind: 'zero-notice-reroute',
    notice: 'None documented. deepseek-v4-flash and deepseek-v4-flash-vision-exp were retired the same day their replacement, V4.1 Flash, launched — 10 Sep 2026.',
    postEventBehavior:
      'Retired IDs "route to the replacement" rather than failing. A caller who never updates their code keeps getting responses, from a different model, indefinitely.',
    sourceUrl: 'https://api-docs.deepseek.com/updates',
    sourceLabel: 'api-docs.deepseek.com/updates',
    caveat:
      'DeepSeek’s own announcement is not stable either: it separately stated every deepseek-v4-pro request would move to V4.1 Flash from 04:00 UTC on 14 Sep 2026, then the API documentation reversed course and kept V4 Pro serving "in response to user demand." The retirement notice itself was retired. That is not modeled as a fifth binding kind here — it is a live caveat on top of zero-notice reroute, not a different category, because the underlying behavior (no durable notice, silent routing) is identical either way.',
  },
];
