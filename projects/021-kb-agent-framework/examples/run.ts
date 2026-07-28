/**
 * Minimal end-to-end example — runnable with:  npx tsx examples/run.ts
 *
 * Uses the deterministic RuleModel so it needs no API key. To use a real model,
 * replace it with `new OpenAIModel({ apiKey: process.env.OPENAI_API_KEY!, model: "gpt-4o-mini" })`.
 */
import { Agent, ToolRegistry, RuleModel, builtinTools } from "../src/lib/index";

async function main() {
  const agent = new Agent({
    model: new RuleModel(),
    tools: new ToolRegistry(builtinTools),
    maxSteps: 6,
  });

  const result = await agent.run(
    "What is (12 + 8) * 3, and how many words are in 'agent tool loop'?",
  );

  for (const e of result.trace) {
    if (e.type === "thought") console.log(`  💭 ${e.text}`);
    if (e.type === "tool_call") console.log(`  🔧 ${e.tool}(${JSON.stringify(e.args)})`);
    if (e.type === "observation") console.log(`  👁  ${e.output}`);
    if (e.type === "final") console.log(`  ✅ ${e.answer}`);
  }
  console.log(`\nsteps: ${result.steps}  halted: ${result.halted}`);
}

main();
