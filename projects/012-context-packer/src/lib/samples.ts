// Default demo payload. The blocks are deliberately mixed: some directly answer
// the seeded query ("open weights long context"), some are adjacent, some are
// noise — so the knapsack packer visibly out-selects naive truncation on load.
export const SAMPLE_QUERY = "open weight models with long context windows";

export const SAMPLE_SOURCES = [
  `Inkling by Thinking Machines (Mira Murati's lab) shipped this week as a ~1T-parameter open-weight, multimodal model with a 1,000,000-token context window. Weights are downloadable on Hugging Face alongside a hosted API.`,
  `Chinese open-weight models now account for roughly 41% of downloads on Hugging Face, and the six most-used models on OpenRouter are all open models from Chinese labs including DeepSeek, MiniMax and Z.ai.`,
  `GPT-5.6 Sol set a new state of the art on Terminal-Bench 2.1. The Terra tier matches GPT-5.5 quality at about half the cost, while Luna is the cheapest and fastest option in the family.`,
  `A long context window is not the same as good context use. Filling 1M tokens with low-relevance text raises cost and latency and can bury the passages that actually answer the question ("lost in the middle").`,
  `BM25 remains the sparse-retrieval workhorse: it ranks documents by term frequency and inverse document frequency, needs no model, and forms the lexical half of most production hybrid-RAG systems.`,
  `Microsoft launched Frontier Co., a $2.5B unit of 6,000 engineers embedded with customers to ship AI implementations, and introduced new agentic-AI certifications (AB-100, AB-620).`,
  `The office coffee machine on the third floor has been repaired. Please remember to rinse the carafe after use and report any leaks to facilities.`,
  `Retrieval that returns fewer, higher-value passages usually beats stuffing the whole window: it cuts token spend, trims latency, and keeps the model focused on what matters.`,
].join("\n\n---\n\n");
