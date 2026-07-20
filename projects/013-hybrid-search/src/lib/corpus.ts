// A small, self-contained corpus about search / RAG / infra. Passages are
// written so the two rankers genuinely disagree: some queries hinge on a rare
// exact token (BM25's strength), others on paraphrase and synonyms (the dense
// vector's strength). Hybrid via RRF is meant to be the one that is rarely
// wrong on either kind.

export interface Passage {
  id: number;
  title: string;
  text: string;
}

export const CORPUS: Passage[] = [
  {
    id: 0,
    title: "BM25, in one paragraph",
    text: "BM25 is a bag-of-words ranking function that scores a document by how often the query terms appear in it, damped by term saturation and normalized by document length. It excels at exact keyword matches but is blind to meaning: it cannot tell that 'car' and 'automobile' are related.",
  },
  {
    id: 1,
    title: "Dense retrieval with embeddings",
    text: "A dense retriever maps text into a high-dimensional vector so that passages with similar meaning land near each other. Because it matches on semantics rather than surface form, it happily connects a query about automobiles to a passage that only ever says vehicles.",
  },
  {
    id: 2,
    title: "Why hybrid search wins",
    text: "Hybrid search runs a lexical and a dense retriever side by side and fuses their results. The lexical arm anchors rare exact tokens like error codes and product names; the dense arm rescues paraphrases the keyword search would miss. Fusion is what keeps the combined system from ever being catastrophically wrong.",
  },
  {
    id: 3,
    title: "Reciprocal Rank Fusion",
    text: "Reciprocal Rank Fusion combines ranked lists without ever comparing their raw scores. Each list contributes one over k plus rank to every document, so a result that sits near the top of both lists rises above one that merely tops a single list. The constant k blunts the pull of the very first positions.",
  },
  {
    id: 4,
    title: "The HTTP 429 error",
    text: "An HTTP 429 status means Too Many Requests: the client has sent more calls in a window than the server's rate limiter allows. The usual fix is exponential backoff with jitter, honoring any Retry-After header the API returns.",
  },
  {
    id: 5,
    title: "Rate limiting an API gateway",
    text: "Throttling protects a backend from overload by capping how many calls each client may make per second. A token-bucket limiter refills at a steady rate and rejects surges once the bucket is empty, shielding downstream services from stampedes.",
  },
  {
    id: 6,
    title: "Chunking documents for RAG",
    text: "Before retrieval, long documents are split into chunks small enough to embed and to fit a context budget. Chunk boundaries matter: cut in the wrong place and a passage loses the sentence that made it answerable.",
  },
  {
    id: 7,
    title: "Context windows are exploding",
    text: "Frontier models now advertise million-token context windows, tempting teams to simply paste everything in. But a bigger window is not a retrieval strategy: stuffing junk still buries the answer and still costs tokens. What you put in the window matters more than how big it is.",
  },
  {
    id: 8,
    title: "Cosine similarity",
    text: "Cosine similarity measures the angle between two vectors, ignoring their magnitude. For L2-normalized embeddings it reduces to a plain dot product, which is why normalized vectors make nearest-neighbor search both fast and well-behaved.",
  },
  {
    id: 9,
    title: "Vector databases",
    text: "A vector database stores embeddings and answers approximate nearest-neighbor queries at scale using indexes such as HNSW or IVF. It trades a little recall for a large speedup, which is the only way dense retrieval stays cheap over millions of passages.",
  },
  {
    id: 10,
    title: "Keyword search misses synonyms",
    text: "Classic inverted-index search returns nothing when the user's words differ from the author's, even when they mean the same thing. A search for 'laptop battery drains fast' will skip a support note titled 'notebook runs out of charge quickly'.",
  },
  {
    id: 11,
    title: "Re-ranking retrieved results",
    text: "A cross-encoder re-ranker reads the query and each candidate together and scores their relevance directly. It is far more accurate than a bi-encoder but far slower, so it is applied only to the top handful of results a cheaper retriever already surfaced.",
  },
  {
    id: 12,
    title: "Exponential backoff",
    text: "When a request fails transiently, retrying immediately only makes things worse. Exponential backoff waits an interval that doubles each attempt, and adding random jitter prevents many clients from retrying in lockstep after an outage.",
  },
  {
    id: 13,
    title: "Precision and recall in retrieval",
    text: "Precision asks what fraction of returned passages are relevant; recall asks what fraction of the relevant passages were returned. Retrieval usually optimizes recall at k, trusting a downstream re-ranker or the model itself to supply precision.",
  },
  {
    id: 14,
    title: "Stopwords and tokenization",
    text: "Lexical scorers drop extremely common words like 'the' and 'of' because they carry no discriminating signal and would otherwise dominate term counts. How text is tokenized quietly determines what a keyword index can ever match.",
  },
];

export interface ExampleQuery {
  q: string;
  note: string;
}

// Curated to showcase the disagreement. Each note names who should win and why.
export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    q: "HTTP 429 too many requests",
    note: "Rare exact token (429) — lexical BM25 nails it; the dense arm drifts toward related throttling passages.",
  },
  {
    q: "my notebook loses charge too quickly",
    note: "Pure paraphrase — no shared keywords with the 'laptop battery' note, so semantics carries it.",
  },
  {
    q: "combine two ranked lists without comparing scores",
    note: "Meaning-heavy but term-sparse — hybrid fusion lifts the RRF passage above the noise.",
  },
  {
    q: "does a bigger context window fix retrieval",
    note: "Topical + timely — vectors find the intent, BM25 anchors 'context window'; RRF agrees.",
  },
  {
    q: "why keyword search misses automobile and vehicle",
    note: "Classic synonym gap — the dense retriever connects car/automobile/vehicle that BM25 cannot.",
  },
];
