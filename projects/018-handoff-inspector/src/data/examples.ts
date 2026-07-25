import type { Trace } from "../lib/types";

export interface Example {
  id: string;
  name: string;
  blurb: string;
  trace: Trace;
}

// A clean research → write → review pipeline. No coordination failures.
const cleanPipeline: Trace = {
  title: "Clean research → write → review",
  agents: [
    { id: "supervisor", role: "orchestrator", tools: ["delegate", "finish"] },
    { id: "researcher", role: "research", tools: ["web_search"] },
    { id: "writer", role: "writing", tools: ["draft"] },
    { id: "reviewer", role: "qa", tools: ["review"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "researcher", task: "research", message: "Find 3 sources on Azure AI Foundry pricing." },
    { t: 1, type: "tool_call", agent: "researcher", tool: "web_search", args: { q: "azure ai foundry pricing" }, task: "research" },
    { t: 2, type: "observation", agent: "researcher", content: "Found pricing page + 2 blogs.", produces: ["sources"], task: "research" },
    { t: 3, type: "return", from: "researcher", to: "supervisor", task: "research", handoff: ["sources"] },
    { t: 4, type: "delegate", from: "supervisor", to: "writer", task: "write", requires: ["sources"], handoff: ["sources"], message: "Draft a 200-word summary." },
    { t: 5, type: "tool_call", agent: "writer", tool: "draft", args: { words: 200 }, task: "write" },
    { t: 6, type: "observation", agent: "writer", content: "Draft ready.", produces: ["draft"], task: "write" },
    { t: 7, type: "return", from: "writer", to: "supervisor", task: "write", handoff: ["draft"] },
    { t: 8, type: "delegate", from: "supervisor", to: "reviewer", task: "review", requires: ["draft"], handoff: ["draft"], message: "Check for errors." },
    { t: 9, type: "tool_call", agent: "reviewer", tool: "review", args: { target: "draft" }, task: "review" },
    { t: 10, type: "return", from: "reviewer", to: "supervisor", task: "review", handoff: ["review-ok"] },
    { t: 11, type: "final", agent: "supervisor", content: "Summary complete and reviewed." },
  ],
};

// The researcher is handed a task and never returns it.
const droppedHandoff: Trace = {
  title: "Dropped handoff",
  agents: [
    { id: "supervisor", role: "orchestrator" },
    { id: "researcher", role: "research", tools: ["web_search"] },
    { id: "writer", role: "writing", tools: ["draft"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "researcher", task: "research", message: "Gather market data." },
    { t: 1, type: "tool_call", agent: "researcher", tool: "web_search", args: { q: "market data" }, task: "research" },
    { t: 2, type: "observation", agent: "researcher", content: "Search timed out.", task: "research" },
    // no return for "research" — supervisor moves on anyway
    { t: 3, type: "delegate", from: "supervisor", to: "writer", task: "write", requires: ["market-data"], message: "Write it up." },
    { t: 4, type: "tool_call", agent: "writer", tool: "draft", args: { words: 300 }, task: "write" },
    { t: 5, type: "return", from: "writer", to: "supervisor", task: "write", handoff: ["draft"] },
    { t: 6, type: "final", agent: "supervisor", content: "Done (but the data was never gathered)." },
  ],
};

// Planner and coder bounce the same task back and forth.
const delegationLoop: Trace = {
  title: "Delegation ping-pong",
  agents: [
    { id: "supervisor", role: "orchestrator" },
    { id: "planner", role: "planning" },
    { id: "coder", role: "coding", tools: ["write_code"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "planner", task: "feature", message: "Plan the feature." },
    { t: 1, type: "delegate", from: "planner", to: "coder", task: "feature", message: "Implement per plan." },
    { t: 2, type: "message", from: "coder", to: "planner", message: "Plan is ambiguous, clarify." },
    { t: 3, type: "delegate", from: "coder", to: "planner", task: "feature", message: "Re-plan with detail." },
    { t: 4, type: "delegate", from: "planner", to: "coder", task: "feature", message: "Try again." },
    { t: 5, type: "message", from: "coder", to: "planner", message: "Still ambiguous." },
    { t: 6, type: "delegate", from: "coder", to: "planner", task: "feature", message: "Please re-plan." },
  ],
};

// Writer is delegated a task requiring a citation that the supervisor forgot to pass.
const contextLoss: Trace = {
  title: "Context lost between agents",
  agents: [
    { id: "supervisor", role: "orchestrator" },
    { id: "researcher", role: "research", tools: ["web_search"] },
    { id: "writer", role: "writing", tools: ["draft"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "researcher", task: "research", message: "Find the citation." },
    { t: 1, type: "tool_call", agent: "researcher", tool: "web_search", args: { q: "primary source" }, task: "research" },
    { t: 2, type: "observation", agent: "researcher", content: "Found it.", produces: ["citation-42"], task: "research" },
    { t: 3, type: "return", from: "researcher", to: "supervisor", task: "research", handoff: ["citation-42"] },
    // supervisor delegates the write but forgets to hand over citation-42
    { t: 4, type: "delegate", from: "supervisor", to: "writer", task: "write", requires: ["citation-42"], message: "Write it up with the source." },
    { t: 5, type: "tool_call", agent: "writer", tool: "draft", args: { words: 150 }, task: "write" },
    { t: 6, type: "observation", agent: "writer", content: "I don't have the citation, leaving a TODO.", produces: ["draft"], task: "write" },
    { t: 7, type: "return", from: "writer", to: "supervisor", task: "write", handoff: ["draft"] },
    { t: 8, type: "final", agent: "supervisor", content: "Draft delivered (missing its source)." },
  ],
};

// Two agents independently run the exact same search.
const duplicatedWork: Trace = {
  title: "Duplicated work",
  agents: [
    { id: "supervisor", role: "orchestrator" },
    { id: "analyst_a", role: "analysis", tools: ["web_search"] },
    { id: "analyst_b", role: "analysis", tools: ["web_search"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "analyst_a", task: "a", message: "Look up the metric." },
    { t: 1, type: "delegate", from: "supervisor", to: "analyst_b", task: "b", message: "Look up the metric." },
    { t: 2, type: "tool_call", agent: "analyst_a", tool: "web_search", args: { q: "q3 revenue" }, task: "a" },
    { t: 3, type: "tool_call", agent: "analyst_b", tool: "web_search", args: { q: "q3 revenue" }, task: "b" },
    { t: 4, type: "return", from: "analyst_a", to: "supervisor", task: "a", handoff: ["num"] },
    { t: 5, type: "return", from: "analyst_b", to: "supervisor", task: "b", handoff: ["num"] },
    { t: 6, type: "final", agent: "supervisor", content: "Same number twice." },
  ],
};

// A messy run: dropped handoff + out-of-role tool + idle agent + no final.
const messyRun: Trace = {
  title: "Messy run (multiple failures)",
  agents: [
    { id: "supervisor", role: "orchestrator" },
    { id: "researcher", role: "research", tools: ["web_search"] },
    { id: "coder", role: "coding", tools: ["write_code"] },
    { id: "reviewer", role: "qa", tools: ["review"] },
  ],
  events: [
    { t: 0, type: "delegate", from: "supervisor", to: "researcher", task: "research", message: "Get requirements." },
    { t: 1, type: "tool_call", agent: "researcher", tool: "web_search", args: { q: "requirements" }, task: "research" },
    { t: 2, type: "return", from: "researcher", to: "supervisor", task: "research", handoff: ["reqs"] },
    { t: 3, type: "delegate", from: "supervisor", to: "coder", task: "build", requires: ["reqs"], handoff: ["reqs"], message: "Build it." },
    { t: 4, type: "tool_call", agent: "coder", tool: "web_search", args: { q: "how to build" }, task: "build" },
    { t: 5, type: "observation", agent: "coder", content: "Wrote some code.", produces: ["code"], task: "build" },
    // coder never returns "build"; reviewer never used; no final
  ],
};

export const EXAMPLES: Example[] = [
  { id: "clean", name: "Clean pipeline", blurb: "A healthy research → write → review run. Score 100.", trace: cleanPipeline },
  { id: "dropped", name: "Dropped handoff", blurb: "A sub-agent is handed a task and never returns it.", trace: droppedHandoff },
  { id: "loop", name: "Delegation loop", blurb: "Planner and coder bounce a task back and forth.", trace: delegationLoop },
  { id: "context", name: "Context loss", blurb: "The supervisor forgets to pass along a needed artifact.", trace: contextLoss },
  { id: "duplicate", name: "Duplicated work", blurb: "Two agents run the identical tool call.", trace: duplicatedWork },
  { id: "messy", name: "Messy run", blurb: "Several failures at once, and it never converges.", trace: messyRun },
];

export const DEFAULT_EXAMPLE_ID = "dropped";

export const exampleById = (id: string): Example =>
  EXAMPLES.find((e) => e.id === id) ?? EXAMPLES[0];
