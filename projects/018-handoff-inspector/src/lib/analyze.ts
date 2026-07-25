import type {
  AnalysisResult,
  Issue,
  Severity,
  Trace,
  TraceEvent,
} from "./types";
import { canonical, findCycle } from "./util";

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 20,
  warning: 8,
  info: 3,
};

/**
 * Analyze a validated, time-sorted trace for multi-agent coordination
 * failures. Every detector is a pure function of the event log and reports
 * only what the trace explicitly encodes — it never guesses intent. The
 * detectors are exported individually so each can be unit-tested in isolation.
 */
export function analyze(trace: Trace): AnalysisResult {
  const events = trace.events;
  const issues: Issue[] = [
    ...detectDroppedHandoffs(events),
    ...detectDelegationLoops(events),
    ...detectContextLoss(events),
    ...detectDuplicatedWork(events),
    ...detectOutOfRoleTools(trace),
    ...detectIdleAgents(trace),
    ...detectNoFinalAnswer(events),
  ].sort((a, b) => firstEvent(a) - firstEvent(b));

  const tasks = new Set<string>();
  let handoffs = 0;
  let toolCalls = 0;
  for (const e of events) {
    if (e.task) tasks.add(e.task);
    if (e.type === "delegate" || e.type === "return") handoffs += 1;
    if (e.type === "tool_call") toolCalls += 1;
  }

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warning = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  let score = 100;
  for (const issue of issues) score -= SEVERITY_PENALTY[issue.severity];
  score = Math.max(0, Math.min(100, score));

  return {
    events,
    issues,
    score,
    stats: {
      agents: trace.agents.length,
      events: events.length,
      tasks: tasks.size,
      handoffs,
      toolCalls,
      critical,
      warning,
      info,
    },
  };
}

const firstEvent = (issue: Issue): number =>
  issue.events.length ? Math.min(...issue.events) : Number.MAX_SAFE_INTEGER;

// ── Detector 1: dropped handoff ──────────────────────────────────────────────
// A `delegate` from X→Y for task T with no later `return` from Y for task T.
// A delegate without a task id can't be tracked to completion — flagged too.
export function detectDroppedHandoffs(events: TraceEvent[]): Issue[] {
  const issues: Issue[] = [];
  events.forEach((ev, idx) => {
    if (ev.type !== "delegate") return;
    if (!ev.task) {
      issues.push({
        code: "untracked_delegation",
        title: "Untracked delegation",
        severity: "info",
        detail: `${ev.from} delegated to ${ev.to} without a task id, so its completion can't be verified from the trace.`,
        agents: [ev.from!, ev.to!],
        events: [idx],
      });
      return;
    }
    const returned = events.some(
      (r, j) =>
        j > idx &&
        r.type === "return" &&
        r.task === ev.task &&
        r.from === ev.to
    );
    if (!returned) {
      issues.push({
        code: "dropped_handoff",
        title: "Dropped handoff",
        severity: "critical",
        detail: `${ev.from} delegated task "${ev.task}" to ${ev.to}, but ${ev.to} never returned a result for it.`,
        agents: [ev.from!, ev.to!],
        events: [idx],
        task: ev.task,
      });
    }
  });
  return issues;
}

// ── Detector 2: delegation loop ──────────────────────────────────────────────
// Within a task's delegation graph, a directed cycle (A→B→A ping-pong, or
// longer) means work is bouncing between agents without progress.
export function detectDelegationLoops(events: TraceEvent[]): Issue[] {
  const issues: Issue[] = [];
  const byTask = new Map<string, Array<{ from: string; to: string; idx: number }>>();
  events.forEach((ev, idx) => {
    if (ev.type !== "delegate" || !ev.task || !ev.from || !ev.to) return;
    if (!byTask.has(ev.task)) byTask.set(ev.task, []);
    byTask.get(ev.task)!.push({ from: ev.from, to: ev.to, idx });
  });

  for (const [task, edgeList] of byTask) {
    const nodes = new Set<string>();
    const edges: Array<[string, string]> = [];
    for (const e of edgeList) {
      nodes.add(e.from);
      nodes.add(e.to);
      edges.push([e.from, e.to]);
    }
    const cycle = findCycle([...nodes], edges);
    if (cycle) {
      issues.push({
        code: "delegation_loop",
        title: "Delegation loop",
        severity: "critical",
        detail: `Task "${task}" is bouncing between agents in a loop: ${cycle.join(" → ")}. No agent is making progress on it.`,
        agents: [...new Set(cycle)],
        events: edgeList.map((e) => e.idx),
        task,
      });
    }
  }
  return issues;
}

// ── Detector 3: context loss ─────────────────────────────────────────────────
// A `delegate` declares `requires: [...]`. For each required artifact:
//  - produced earlier by someone else but NOT in this handoff → context_loss
//  - never produced before the handoff (and not passed) → missing_requirement
// Honest by construction: only reasons about artifacts the trace explicitly
// marks as required; it never infers what a task "should" have needed.
export function detectContextLoss(events: TraceEvent[]): Issue[] {
  const issues: Issue[] = [];
  events.forEach((ev, idx) => {
    if (ev.type !== "delegate" || !ev.requires || ev.requires.length === 0) return;
    const passed = new Set(ev.handoff ?? []);
    for (const artifact of ev.requires) {
      if (passed.has(artifact)) continue;

      const producedBefore = events.some(
        (p, j) =>
          j < idx &&
          Array.isArray(p.produces) &&
          p.produces.includes(artifact) &&
          agentOf(p) !== ev.to
      );

      if (producedBefore) {
        issues.push({
          code: "context_loss",
          title: "Context lost across handoff",
          severity: "critical",
          detail: `Task "${ev.task ?? "?"}" needs "${artifact}", which was already produced earlier, but ${ev.from} didn't pass it to ${ev.to}. The receiver is missing context it needs.`,
          agents: [ev.from!, ev.to!],
          events: [idx],
          task: ev.task,
        });
      } else {
        issues.push({
          code: "missing_requirement",
          title: "Required artifact unavailable",
          severity: "warning",
          detail: `Task "${ev.task ?? "?"}" requires "${artifact}", which was never produced before the handoff and wasn't passed to ${ev.to}.`,
          agents: [ev.from!, ev.to!],
          events: [idx],
          task: ev.task,
        });
      }
    }
  });
  return issues;
}

// ── Detector 4: duplicated work ──────────────────────────────────────────────
// Two `tool_call` events with the same tool AND canonically-equal args mean the
// same work was done twice (often by different agents that didn't coordinate).
export function detectDuplicatedWork(events: TraceEvent[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  events.forEach((ev, idx) => {
    if (ev.type !== "tool_call" || !ev.tool) return;
    const key = `${ev.tool}::${canonical(ev.args ?? null)}`;
    if (seen.has(key)) {
      const firstIdx = seen.get(key)!;
      issues.push({
        code: "duplicated_work",
        title: "Duplicated work",
        severity: "warning",
        detail: `${agentOf(ev) ?? "an agent"} re-ran tool "${ev.tool}" with identical arguments already run by ${agentOf(events[firstIdx]) ?? "another agent"} — wasted effort.`,
        agents: uniq([agentOf(events[firstIdx]), agentOf(ev)]),
        events: [firstIdx, idx],
        task: ev.task,
      });
    } else {
      seen.set(key, idx);
    }
  });
  return issues;
}

// ── Detector 5: out-of-role tool ─────────────────────────────────────────────
// An agent that declares a toolset calling a tool outside it. Only checked when
// the agent declared `tools` — no declared scope, no claim.
export function detectOutOfRoleTools(trace: Trace): Issue[] {
  const issues: Issue[] = [];
  const toolsById = new Map<string, string[] | undefined>();
  for (const a of trace.agents) toolsById.set(a.id, a.tools);
  trace.events.forEach((ev, idx) => {
    if (ev.type !== "tool_call" || !ev.tool || !ev.agent) return;
    const allowed = toolsById.get(ev.agent);
    if (allowed && !allowed.includes(ev.tool)) {
      issues.push({
        code: "out_of_role_tool",
        title: "Out-of-role tool call",
        severity: "warning",
        detail: `${ev.agent} called "${ev.tool}", which is not in its declared toolset [${allowed.join(", ")}].`,
        agents: [ev.agent],
        events: [idx],
        task: ev.task,
      });
    }
  });
  return issues;
}

// ── Detector 6: idle agent ───────────────────────────────────────────────────
// An agent declared in `agents` that never acts and is never addressed — a
// spawned-but-unused worker.
export function detectIdleAgents(trace: Trace): Issue[] {
  const active = new Set<string>();
  for (const ev of trace.events) {
    if (ev.from) active.add(ev.from);
    if (ev.to) active.add(ev.to);
    if (ev.agent) active.add(ev.agent);
  }
  return trace.agents
    .filter((a) => !active.has(a.id))
    .map((a) => ({
      code: "idle_agent",
      title: "Idle agent",
      severity: "info" as Severity,
      detail: `Agent "${a.id}" was declared but never delegated to, never acted, and never spoke — a spawned-but-unused worker.`,
      agents: [a.id],
      events: [],
    }));
}

// ── Detector 7: no final answer ──────────────────────────────────────────────
// A run that never emits a `final` event never converged to an answer.
export function detectNoFinalAnswer(events: TraceEvent[]): Issue[] {
  const hasFinal = events.some((e) => e.type === "final");
  if (hasFinal) return [];
  return [
    {
      code: "no_final_answer",
      title: "No final answer",
      severity: "critical",
      detail: "The run ended without any agent emitting a final answer — the orchestration never converged.",
      agents: [],
      events: events.length ? [events.length - 1] : [],
    },
  ];
}

const agentOf = (ev: TraceEvent | undefined): string | undefined =>
  ev ? ev.agent ?? ev.from : undefined;

const uniq = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((v): v is string => Boolean(v)))];
