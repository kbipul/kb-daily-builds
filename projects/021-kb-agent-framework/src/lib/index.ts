/** kb-agent-framework — public API. */
export { Agent } from "./agent";
export type { AgentOptions } from "./agent";
export { ToolRegistry, ToolValidationError, defineTool } from "./tools";
export { Memory } from "./memory";
export { Tracer } from "./tracer";
export { RuleModel } from "./models/rule-model";
export { OpenAIModel } from "./models/openai-model";
export type { OpenAIModelConfig } from "./models/openai-model";
export {
  builtinTools,
  calculatorTool,
  wordCountTool,
  searchTool,
} from "./tools/builtins";
export { evaluate as evaluateExpression } from "./tools/calculator";
export type {
  AgentResult,
  Message,
  Model,
  ModelResponse,
  ParamSpec,
  Tool,
  ToolArgs,
  ToolSpec,
  TraceEvent,
} from "./types";
