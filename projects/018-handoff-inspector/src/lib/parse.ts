import type { Agent, ParseResult, Trace, TraceEvent, EventType } from "./types";
import { sortByTime } from "./util";

const EVENT_TYPES: EventType[] = [
  "delegate",
  "return",
  "tool_call",
  "observation",
  "message",
  "final",
];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Parse + structurally validate a trace. Returns the normalized trace (events
 * stably sorted by `t`) or a list of specific, actionable errors. Validation is
 * strict on the things the analyzer relies on (known agent ids, event shape) so
 * that every issue the analyzer later reports is a real coordination problem,
 * not a typo in the input.
 */
export function parseTrace(text: string): ParseResult {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { errors: ["Trace is empty — paste a JSON trace."] };

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }

  if (!isObject(raw)) return { errors: ["Top level must be a JSON object."] };
  if (!Array.isArray(raw.agents))
    errors.push('Missing "agents" array.');
  if (!Array.isArray(raw.events))
    errors.push('Missing "events" array.');
  if (errors.length) return { errors };

  const agents: Agent[] = [];
  const agentIds = new Set<string>();
  (raw.agents as unknown[]).forEach((a, i) => {
    if (!isObject(a) || typeof a.id !== "string" || !a.id.trim()) {
      errors.push(`agents[${i}] needs a non-empty string "id".`);
      return;
    }
    if (agentIds.has(a.id)) {
      errors.push(`Duplicate agent id "${a.id}".`);
      return;
    }
    agentIds.add(a.id);
    const agent: Agent = { id: a.id };
    if (typeof a.role === "string") agent.role = a.role;
    if (isStringArray(a.tools)) agent.tools = a.tools;
    agents.push(agent);
  });

  const events: TraceEvent[] = [];
  (raw.events as unknown[]).forEach((e, i) => {
    if (!isObject(e)) {
      errors.push(`events[${i}] must be an object.`);
      return;
    }
    if (typeof e.t !== "number" || !Number.isFinite(e.t)) {
      errors.push(`events[${i}] needs a numeric "t".`);
      return;
    }
    if (typeof e.type !== "string" || !EVENT_TYPES.includes(e.type as EventType)) {
      errors.push(
        `events[${i}] has invalid "type" (${JSON.stringify(e.type)}). Use one of: ${EVENT_TYPES.join(", ")}.`
      );
      return;
    }
    const type = e.type as EventType;
    const ev: TraceEvent = { t: e.t, type };

    const checkAgent = (field: "from" | "to" | "agent", value: unknown) => {
      if (typeof value !== "string") {
        errors.push(`events[${i}] (${type}) needs a string "${field}".`);
        return;
      }
      if (!agentIds.has(value)) {
        errors.push(`events[${i}] references unknown agent "${value}" in "${field}".`);
        return;
      }
      ev[field] = value;
    };

    if (type === "delegate" || type === "return" || type === "message") {
      checkAgent("from", e.from);
      checkAgent("to", e.to);
    } else {
      checkAgent("agent", e.agent);
    }

    if (typeof e.task === "string") ev.task = e.task;
    if (typeof e.tool === "string") ev.tool = e.tool;
    if ("args" in e) ev.args = e.args;
    if (typeof e.message === "string") ev.message = e.message;
    if (typeof e.content === "string") ev.content = e.content;
    if (isStringArray(e.requires)) ev.requires = e.requires;
    if (isStringArray(e.handoff)) ev.handoff = e.handoff;
    if (isStringArray(e.produces)) ev.produces = e.produces;

    events.push(ev);
  });

  if (agents.length === 0) errors.push("At least one agent is required.");
  if (events.length === 0) errors.push("At least one event is required.");
  if (errors.length) return { errors };

  const trace: Trace = {
    agents,
    events: sortByTime(events),
  };
  if (typeof raw.title === "string") trace.title = raw.title;
  return { trace, errors: [] };
}
