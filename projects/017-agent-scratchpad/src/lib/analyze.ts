// Loop-health analyzer for a parsed ReAct trace.
//
// Each check is a pure function over the parsed trace + declared tools and
// returns zero or more Findings. Nothing here calls a model or the network —
// it is a deterministic rule engine you can unit-test, in the spirit of the
// tool-use failure taxonomy (ToolCritic / ToolFailBench, 2026): the same
// failure classes those benchmarks catch offline, applied to a whole loop
// rather than a single call.

import type { Finding, HealthReport, ParsedTrace, Severity, ToolSpec } from "./types";
import { extractNumbers, extractQuoted, normalizeInput, tokenize } from "./text";

export interface AnalyzeOptions {
  tools: ToolSpec[];
  /** Step budget; steps beyond this flag a runaway loop. Default 8. */
  maxSteps?: number;
}

const WEIGHT: Record<Severity, number> = { critical: 40, warning: 18, info: 0 };

/** Steps that actually issued an action. */
function actionSteps(trace: ParsedTrace) {
  return trace.steps.filter((s) => s.action);
}

function checkUnknownTool(trace: ParsedTrace, tools: ToolSpec[]): Finding[] {
  if (tools.length === 0) return []; // no declared toolset -> cannot judge scope
  const known = new Set(tools.map((t) => t.name.trim().toLowerCase()));
  const bad = actionSteps(trace).filter((s) => !known.has((s.action as string).trim().toLowerCase()));
  if (bad.length === 0) return [];
  const names = Array.from(new Set(bad.map((s) => s.action)));
  return [
    {
      code: "unknown-tool",
      severity: "critical",
      title: "Called a tool outside its declared toolset",
      detail: `The agent invoked ${names
        .map((n) => `"${n}"`)
        .join(", ")}, which ${names.length === 1 ? "is" : "are"} not in the declared tools. Out-of-scope calls are exactly what a sandboxed agent must never make.`,
      steps: bad.map((s) => s.index),
    },
  ];
}

function checkStuckLoop(trace: ParsedTrace): Finding[] {
  const seen = new Map<string, number[]>();
  for (const s of actionSteps(trace)) {
    const key = `${(s.action as string).trim().toLowerCase()}(${normalizeInput(s.actionInput)})`;
    const arr = seen.get(key) ?? [];
    arr.push(s.index);
    seen.set(key, arr);
  }
  const findings: Finding[] = [];
  for (const [, idxs] of seen) {
    if (idxs.length >= 2) {
      findings.push({
        code: "stuck-loop",
        severity: "critical",
        title: "Repeated the identical call",
        detail: `The same tool call was issued ${idxs.length} times with identical input (steps ${idxs.join(
          ", "
        )}). The agent is looping instead of using the observation to move on.`,
        steps: idxs,
      });
    }
  }
  return findings;
}

function checkOscillation(trace: ParsedTrace): Finding[] {
  const acts = actionSteps(trace).map((s) => ({ name: (s.action as string).trim().toLowerCase(), index: s.index }));
  if (acts.length < 4) return [];
  for (let i = 0; i + 3 < acts.length; i++) {
    const [a, b, c, d] = acts.slice(i, i + 4);
    if (a.name === c.name && b.name === d.name && a.name !== b.name) {
      return [
        {
          code: "oscillation",
          severity: "warning",
          title: "Oscillating between two tools",
          detail: `The agent alternated ${a.name} <-> ${b.name} without converging (steps ${a.index}, ${b.index}, ${c.index}, ${d.index}). This is a classic no-progress pattern.`,
          steps: [a.index, b.index, c.index, d.index],
        },
      ];
    }
  }
  return [];
}

function checkErrorThrash(trace: ParsedTrace): Finding[] {
  const findings: Finding[] = [];
  const steps = trace.steps;
  for (let i = 0; i < steps.length - 1; i++) {
    const cur = steps[i];
    const next = steps[i + 1];
    if (cur.observationIsError && cur.action && next.action) {
      const same =
        cur.action.trim().toLowerCase() === next.action.trim().toLowerCase() &&
        normalizeInput(cur.actionInput) === normalizeInput(next.actionInput);
      if (same) {
        findings.push({
          code: "error-thrash",
          severity: "warning",
          title: "Ignored a tool error and retried unchanged",
          detail: `Step ${cur.index} returned an error, yet step ${next.index} repeated the same call unchanged. A healthy loop adapts after an error.`,
          steps: [cur.index, next.index],
        });
      }
    }
  }
  return findings;
}

function checkNoProgress(trace: ParsedTrace): Finding[] {
  const findings: Finding[] = [];
  const withObs = trace.steps.filter((s) => s.observation !== null);
  for (let i = 0; i < withObs.length - 1; i++) {
    const a = withObs[i];
    const b = withObs[i + 1];
    if (
      a.observation &&
      b.observation &&
      a.observation.trim() === b.observation.trim() &&
      a.action &&
      b.action
    ) {
      findings.push({
        code: "no-progress",
        severity: "info",
        title: "Two steps produced the same observation",
        detail: `Steps ${a.index} and ${b.index} returned identical observations — the loop gained no new information.`,
        steps: [a.index, b.index],
      });
    }
  }
  return findings;
}

function checkBudget(trace: ParsedTrace, maxSteps: number): Finding[] {
  if (trace.steps.length <= maxSteps) return [];
  return [
    {
      code: "budget-overrun",
      severity: "warning",
      title: "Exceeded the step budget",
      detail: `The loop ran ${trace.steps.length} steps, over the budget of ${maxSteps}. Long loops burn tokens and usually signal the agent is not converging.`,
      steps: trace.steps.slice(maxSteps).map((s) => s.index),
    },
  ];
}

function checkNoFinalAnswer(trace: ParsedTrace): Finding[] {
  if (trace.finalAnswer !== null) return [];
  if (trace.steps.length === 0) return [];
  return [
    {
      code: "no-final-answer",
      severity: "critical",
      title: "Loop ended without a final answer",
      detail: "The trace stops after the last observation with no Final Answer — the agent ran out of loop instead of finishing.",
      steps: trace.steps.length ? [trace.steps[trace.steps.length - 1].index] : [],
    },
  ];
}

/**
 * Ungrounded-answer heuristic: numbers or quoted strings that appear in the
 * final answer but in NO observation are likely fabricated. Deliberately
 * conservative — it only flags concrete numbers/quoted spans, never prose — so
 * it reports possible hallucination rather than pretending to verify meaning.
 */
function checkUngrounded(trace: ParsedTrace): Finding[] {
  const final = trace.finalAnswer;
  if (!final) return [];
  const obsText = trace.steps
    .map((s) => s.observation ?? "")
    .join("\n")
    .toLowerCase();
  if (!obsText.trim()) return [];
  const obsTokens = new Set(tokenize(obsText));

  const numbers = extractNumbers(final).filter((n) => !obsText.includes(n.toLowerCase()));
  const quotes = extractQuoted(final).filter((q) => {
    const ql = q.toLowerCase();
    if (obsText.includes(ql)) return false;
    // Treat as grounded if every word of the quote appears somewhere in obs.
    return !tokenize(ql).every((t) => obsTokens.has(t));
  });

  const missing = [...numbers, ...quotes];
  if (missing.length === 0) return [];
  return [
    {
      code: "ungrounded-answer",
      severity: "critical",
      title: "Final answer contains unsupported specifics",
      detail: `These specifics in the final answer never appear in any observation: ${missing
        .map((m) => `"${m}"`)
        .join(", ")}. That is where a grounded loop turns into a hallucination.`,
      steps: [],
    },
  ];
}

export function analyze(trace: ParsedTrace, opts: AnalyzeOptions): HealthReport {
  const maxSteps = opts.maxSteps ?? 8;
  const findings: Finding[] = [
    ...checkUnknownTool(trace, opts.tools),
    ...checkStuckLoop(trace),
    ...checkOscillation(trace),
    ...checkErrorThrash(trace),
    ...checkNoProgress(trace),
    ...checkBudget(trace, maxSteps),
    ...checkNoFinalAnswer(trace),
    ...checkUngrounded(trace),
  ];

  const penalty = findings.reduce((sum, f) => sum + WEIGHT[f.severity], 0);
  const score = Math.max(0, 100 - penalty);
  const finishedCleanly =
    trace.finalAnswer !== null && !findings.some((f) => f.severity === "critical");

  return {
    findings,
    score,
    grade: toGrade(score),
    stepCount: trace.steps.length,
    finishedCleanly,
  };
}

function toGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
