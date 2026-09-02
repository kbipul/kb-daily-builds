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
//
// REFRESHED 2026-09-02. The first snapshot (2026-07-11) went stale in three
// separate ways inside eight weeks, which is the whole argument for the "as of"
// stamp and the editable table:
//   • OpenAI cut Terra 20% and Luna ~80% on 2026-07-30, then cut Sol on 08-21.
//   • Anthropic CANCELLED Sonnet 5's scheduled 2026-09-01 step-up to $3/$15 on
//     2026-08-10, making the $2/$10 introductory rate permanent. The old
//     snapshot had already priced in the increase, overstating Sonnet 5 by 50%.
//   • Four models worth comparing (Sol, Opus 5, Haiku 4.5, Fable 5) simply
//     did not exist in the original four-model table.

export const PRICES_AS_OF = "2026-09-02";

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

export const DEFAULT_MODELS: ModelPrice[] = [
  {
    id: "gpt-5-6-luna",
    name: "GPT-5.6 Luna",
    vendor: "OpenAI",
    inputPerM: 0.2,
    outputPerM: 1.2,
    tokenMultiplier: 1.0,
    note: "Cut ~80% on 2026-07-30 (was $1/$6 at GA). The cheapest tier here by a wide margin — worth re-testing if you ruled it out on July pricing.",
  },
  {
    id: "gpt-5-6-terra",
    name: "GPT-5.6 Terra",
    vendor: "OpenAI",
    inputPerM: 2.0,
    outputPerM: 12.0,
    tokenMultiplier: 1.0,
    note: "Cut 20% on 2026-07-30 (was $2.50/$15 at July GA). The mid tier that anchors against Sonnet 5.",
  },
  {
    id: "gpt-5-6-sol",
    name: "GPT-5.6 Sol",
    vendor: "OpenAI",
    inputPerM: 4.0,
    outputPerM: 20.0,
    tokenMultiplier: 1.0,
    note: "Top tier. Cut 2026-08-21 from $5/$30; reported as promotional at least through 2026-11-21, so treat it as a floor that may rise. Prompts over 272K tokens bill at 2x input / 1.5x output — not modelled here.",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    vendor: "Anthropic",
    inputPerM: 1.0,
    outputPerM: 5.0,
    tokenMultiplier: 1.0,
    note: "Anthropic's small tier. Predates the Sonnet 5 tokenizer change, so the counter's estimate should track it reasonably closely.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    vendor: "Anthropic",
    inputPerM: 2.0,
    outputPerM: 10.0,
    tokenMultiplier: 1.42,
    note: "The $3/$15 step-up scheduled for 2026-09-01 was CANCELLED on 2026-08-10 — $2/$10 is now the permanent rate. Its tokenizer still emits ~1.42x tokens on English text, which is where the real cost hides.",
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    vendor: "Anthropic",
    inputPerM: 5.0,
    outputPerM: 25.0,
    tokenMultiplier: 1.0,
    note: "Left at 1.0x deliberately: the ~1.42x tokenizer inflation has only been publicly measured on Sonnet 5. A gen-5 sibling may well share it — measure your own traffic before trusting this row.",
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    vendor: "Anthropic",
    inputPerM: 10.0,
    outputPerM: 50.0,
    tokenMultiplier: 1.0,
    note: "Anthropic's most expensive tier. Same unverified-multiplier caveat as Opus 5.",
  },
  {
    id: "grok-4-5",
    name: "Grok 4.5",
    vendor: "xAI",
    inputPerM: 2.0,
    outputPerM: 6.0,
    tokenMultiplier: 1.0,
    note: "Unchanged since the July snapshot — the only row that held. Prompts at/above 200K tokens double to $4/$12, and cached input bills at $0.50/M; neither is modelled here.",
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
