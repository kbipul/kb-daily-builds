import { defineTool } from "../tools";
import type { Tool } from "../types";
import { evaluate } from "./calculator";

/** Safe arithmetic. The agent's most-reached-for tool in the demo. */
export const calculatorTool: Tool = defineTool({
  name: "calculator",
  description: "Evaluate an arithmetic expression (+ - * / % ^ and parentheses).",
  parameters: {
    expression: { type: "string", description: "e.g. (2 + 3) * 4" },
  },
  run: ({ expression }) => {
    const result = evaluate(String(expression));
    return String(result);
  },
});

/** Count words / characters — a trivially verifiable tool, good for tests. */
export const wordCountTool: Tool = defineTool({
  name: "word_count",
  description: "Count the words and characters in a piece of text.",
  parameters: {
    text: { type: "string", description: "The text to measure." },
  },
  run: ({ text }) => {
    const s = String(text).trim();
    const words = s.length === 0 ? 0 : s.split(/\s+/).length;
    return `${words} words, ${String(text).length} characters`;
  },
});

/**
 * A tiny in-memory keyword "search" over a fixed corpus, so the browser demo
 * has a retrieval tool with zero network + zero keys. Real deployments swap the
 * body for a vector store or web search behind the same ToolSpec.
 */
const CORPUS: Record<string, string> = {
  "azure ai foundry":
    "Azure AI Foundry is Microsoft's platform for building, evaluating, and deploying AI agents and models, including a catalog of frontier and open models.",
  "semantic kernel":
    "Semantic Kernel is Microsoft's open-source SDK for orchestrating LLMs with plugins, planners, and memory in .NET, Python, and Java.",
  "react pattern":
    "ReAct interleaves reasoning ('thought') with acting ('tool call'), feeding each observation back into the next reasoning step.",
  "agent memory":
    "Agent memory typically splits into episodic (the transcript) and semantic/scratchpad state carried between steps.",
};

export const searchTool: Tool = defineTool({
  name: "search",
  description:
    "Look up a topic in the built-in knowledge base. Try short keyword queries.",
  parameters: {
    query: { type: "string", description: "Keywords to search for." },
  },
  run: ({ query }) => {
    const q = String(query).toLowerCase();
    const hits = Object.entries(CORPUS)
      .map(([key, text]) => {
        const overlap = q.split(/\s+/).filter((w) => key.includes(w) || text.toLowerCase().includes(w)).length;
        return { key, text, overlap };
      })
      .filter((h) => h.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 2);
    if (hits.length === 0) return "No results found in the knowledge base.";
    return hits.map((h) => `• ${h.text}`).join("\n");
  },
});

/** Everything, ready to drop into a ToolRegistry. */
export const builtinTools: Tool[] = [calculatorTool, wordCountTool, searchTool];
