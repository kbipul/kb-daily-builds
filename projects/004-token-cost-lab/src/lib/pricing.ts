// LLM pricing catalog — USD per 1,000,000 tokens.
//
// HONESTY NOTE: prices move fast and every provider tokenizes text a little
// differently. Everything here is an editable default, not a source of truth.
// The numbers below are the publicly cited list prices as of the date in
// PRICES_AS_OF; the UI lets you edit any field before trusting a number.
//
// `tokenMultiplier` corrects for the fact that this tool counts tokens with a
// single OpenAI-style tokenizer (o200k_base, via gpt-tokenizer). Providers
// whose native tokenizer splits the same English text into more/fewer tokens
// get a multiplier so the token estimate — and therefore the cost — lands
// closer to what you'd actually be billed. 1.0 == "same as the counter".

export const PRICES_AS_OF = "2026-07-11";

export interface ModelPrice {
  id: string;
  name: string;
  vendor: string;
  /** USD per 1M input tokens */
  inputPerM: number;
  /** USD per 1M output tokens */
  outputPerM: number;
  /** Multiply the counter's token estimate by this for this model's billing. */
  tokenMultiplier: number;
  /** Short, sourced context shown under the model. */
  note?: string;
}

// Defaults are seeded from list prices reported in early July 2026. Grok 4.5
// launched 2026-07-09; GPT-5.6 Terra/Luna reached GA mid-July 2026.
export const DEFAULT_MODELS: ModelPrice[] = [
  {
    id: "gpt-5-6-terra",
    name: "GPT-5.6 Terra",
    vendor: "OpenAI",
    inputPerM: 2.5,
    outputPerM: 15,
    tokenMultiplier: 1.0,
    note: "GA mid-July 2026; the mid tier that anchors against Sonnet 5.",
  },
  {
    id: "gpt-5-6-luna",
    name: "GPT-5.6 Luna",
    vendor: "OpenAI",
    inputPerM: 1.0,
    outputPerM: 6,
    tokenMultiplier: 1.0,
    note: "The high-volume tier — cheapest OpenAI option at GA.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    vendor: "Anthropic",
    inputPerM: 3.0,
    outputPerM: 15,
    tokenMultiplier: 1.42,
    note: "Standard list ($2/$10 intro through Aug 2026). New tokenizer emits ~42% more tokens on English text — hence the 1.42x.",
  },
  {
    id: "grok-4-5",
    name: "Grok 4.5",
    vendor: "xAI",
    inputPerM: 2.0,
    outputPerM: 6,
    tokenMultiplier: 1.0,
    note: "Launched 2026-07-09; 'Opus-class' at a volume-tier price.",
  },
];

/** A blank, fully-editable row users can turn into any model they price manually. */
export function blankModel(id: string): ModelPrice {
  return {
    id,
    name: "Custom model",
    vendor: "You",
    inputPerM: 1.0,
    outputPerM: 3.0,
    tokenMultiplier: 1.0,
    note: "Editable — plug in any provider's current price.",
  };
}
