import type { Message, Model, ModelResponse, ToolSpec } from "../types";

export interface OpenAIModelConfig {
  /** API key. NEVER hard-code — read from an env var (see README). */
  apiKey: string;
  /** e.g. "gpt-4o-mini", or an Azure deployment name. */
  model: string;
  /**
   * Base URL. Defaults to OpenAI. For Azure OpenAI, pass your resource endpoint,
   * e.g. https://<resource>.openai.azure.com/openai/deployments/<deployment>
   */
  baseURL?: string;
  /** Extra headers (e.g. `{ "api-key": key }` for Azure). */
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

/**
 * Bring-Your-Own-Key adapter: drives the exact same Agent with a real model.
 * It asks the model to reply with a strict JSON envelope describing either a
 * tool call or a final answer, then parses it back into a `ModelResponse`.
 *
 * This file is intentionally dependency-free (plain `fetch`) and is NOT
 * exercised by the test suite or the live demo — those use `RuleModel` so they
 * stay key-free and deterministic. Wire this up locally with your own key.
 */
export class OpenAIModel implements Model {
  readonly name: string;
  private readonly cfg: OpenAIModelConfig;
  private readonly doFetch: typeof fetch;

  constructor(cfg: OpenAIModelConfig) {
    if (!cfg.apiKey) throw new Error("OpenAIModel: apiKey is required (read it from an env var)");
    this.cfg = cfg;
    this.name = `openai:${cfg.model}`;
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async decide(messages: Message[], tools: ToolSpec[]): Promise<ModelResponse> {
    const sys = buildProtocolPrompt(tools);
    const url = this.cfg.baseURL ?? "https://api.openai.com/v1/chat/completions";
    const res = await this.doFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.cfg.apiKey}`,
        ...this.cfg.headers,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        temperature: 0,
        messages: [{ role: "system", content: sys }, ...messages.map(toOpenAI)],
      }),
    });
    if (!res.ok) throw new Error(`OpenAIModel: HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return parseEnvelope(raw);
  }
}

function toOpenAI(m: Message): { role: string; content: string } {
  // Collapse the framework's `tool` role into a user-visible observation line.
  if (m.role === "tool") return { role: "user", content: `Observation from ${m.name}: ${m.content}` };
  return { role: m.role, content: m.content };
}

export function buildProtocolPrompt(tools: ToolSpec[]): string {
  const list = tools
    .map((t) => {
      const params = Object.entries(t.parameters)
        .map(([k, p]) => `${k}:${p.type}`)
        .join(", ");
      return `- ${t.name}(${params}) — ${t.description}`;
    })
    .join("\n");
  return [
    "You are an agent that MUST reply with a single JSON object and nothing else.",
    "To use a tool: {\"thought\":\"...\",\"tool\":\"<name>\",\"args\":{...}}",
    "To finish:    {\"thought\":\"...\",\"final\":\"<answer>\"}",
    "Available tools:",
    list,
  ].join("\n");
}

export function parseEnvelope(raw: string): ModelResponse {
  const jsonText = extractJson(raw);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    // If the model didn't follow the protocol, treat its text as a final answer.
    return { kind: "final", answer: raw.trim() };
  }
  if (typeof obj.final === "string") {
    return { kind: "final", thought: str(obj.thought), answer: obj.final };
  }
  if (typeof obj.tool === "string") {
    return {
      kind: "tool_call",
      thought: str(obj.thought),
      tool: obj.tool,
      args: (obj.args as Record<string, string | number | boolean>) ?? {},
    };
  }
  return { kind: "final", answer: raw.trim() };
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
