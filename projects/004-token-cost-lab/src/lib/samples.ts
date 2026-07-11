// Sample prompts so the lab shows a real number the instant it loads.
export interface Sample {
  name: string;
  prompt: string;
  /** Rough expected completion length in tokens for the demo. */
  outputTokens: number;
}

export const SAMPLES: Sample[] = [
  {
    name: "Short chat turn",
    prompt:
      "Explain the difference between horizontal and vertical scaling to a new engineer, with one concrete example of each.",
    outputTokens: 220,
  },
  {
    name: "RAG system prompt + context",
    prompt:
      "You are a support assistant. Use ONLY the context below to answer. If the answer is not in the context, say you don't know.\n\nContext:\n- Refunds are processed within 5 business days.\n- Enterprise plans include a dedicated success manager.\n- The API rate limit is 600 requests per minute per key.\n\nQuestion: How long do refunds take, and what is the API rate limit?",
    outputTokens: 120,
  },
  {
    name: "Long document summarize",
    prompt:
      "Summarize the following quarterly report into five bullet points for an executive audience, keeping every figure exact.\n\n" +
      "Revenue grew 18% year over year to $42.3M, driven by a 27% increase in enterprise seats. Gross margin held at 74%. Operating expenses rose 12% as headcount grew from 210 to 244. Net cash position ended the quarter at $61M, up from $58M. Churn improved to 1.9% monthly from 2.4%. The board approved a $10M buyback. Guidance for next quarter is $45M to $47M in revenue.",
    outputTokens: 180,
  },
];
