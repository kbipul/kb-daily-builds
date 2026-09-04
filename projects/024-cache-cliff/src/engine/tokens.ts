/**
 * A deliberately transparent token estimator.
 *
 * Anthropic does not publish the Claude tokenizer, so ANY token count for a
 * Claude prompt outside the API's own `usage` field is an estimate. Rather than
 * ship a tokenizer built for a different model's vocabulary and imply a
 * precision this cannot have, the tool uses one documented heuristic and states
 * its error bar. If you want exact numbers, paste the `input_tokens` your API
 * response already reports — every block accepts a raw number.
 *
 * The heuristic, and why each rule is there:
 *  - Modern BPE vocabularies (cl100k, o200k and their kin) merge most English
 *    words up to roughly seven characters into a SINGLE token. A naive
 *    ceil(len / 4) is the common rule of thumb and it overcounts ordinary prose
 *    by about 45%, which is worse than useless when the output is a dollar
 *    figure.
 *  - Longer words split into roughly four-character continuations.
 *  - Digit runs are denser: tokenizers chunk them about three at a time.
 *  - A single leading space rides along with the following word for free; runs
 *    of whitespace do not.
 *  - Punctuation gets its own token.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chunks = text.match(/\s+|[0-9]+|[A-Za-z']+|[^\s0-9A-Za-z']/g);
  if (!chunks) return 0;
  let n = 0;
  for (const c of chunks) {
    if (/^\s+$/.test(c)) {
      n += Math.max(0, Math.ceil((c.length - 1) / 4));
    } else if (/^[0-9]+$/.test(c)) {
      n += Math.ceil(c.length / 3);
    } else if (/^[A-Za-z']+$/.test(c)) {
      n += c.length <= 7 ? 1 : 1 + Math.ceil((c.length - 7) / 4);
    } else {
      n += 1;
    }
  }
  return n;
}

/** Stated honestly in the UI next to every estimated figure. */
export const ESTIMATOR_ERROR_BAND = 0.2;
