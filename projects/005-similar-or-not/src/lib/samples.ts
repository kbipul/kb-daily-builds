// Preset sets so the map shows real structure on first run — each is chosen to
// contain two or three obvious clusters plus a near-duplicate pair.
export interface SampleSet {
  name: string;
  sentences: string[];
}

export const SAMPLE_SETS: SampleSet[] = [
  {
    name: "Animals vs. weather",
    sentences: [
      "The cat curled up and fell asleep on the warm windowsill.",
      "A kitten dozed off in the sunny window.",
      "Heavy rain is expected across the coast tomorrow.",
      "Forecasters warn of thunderstorms and strong winds tonight.",
      "The dog chased the ball across the muddy field.",
    ],
  },
  {
    name: "Programming languages",
    sentences: [
      "Rust gives you memory safety without a garbage collector.",
      "Python is loved for its readable, beginner-friendly syntax.",
      "TypeScript adds static types on top of JavaScript.",
      "JavaScript runs in every web browser by default.",
      "Go was designed at Google for simple, fast concurrency.",
    ],
  },
  {
    name: "Sentiment mix",
    sentences: [
      "This is the best meal I have had all year.",
      "Absolutely delicious — I'd come back in a heartbeat.",
      "The service was slow and the food arrived cold.",
      "I want a refund; this was a terrible experience.",
      "It was fine, nothing special either way.",
    ],
  },
];
