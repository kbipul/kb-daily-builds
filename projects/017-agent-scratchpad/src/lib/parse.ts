// Parser for classic ReAct transcripts.
//
// Recognised line labels (case-insensitive), the same shape LangChain-style
// agents emit:
//   Thought: ...
//   Action: <tool name>
//   Action Input: <json or plain text>   (optional)
//   Observation: ...                       (may span multiple lines)
//   ... repeated ...
//   Final Answer: ...
//
// A "step" is opened by a Thought (or by an Action with no preceding Thought).
// Everything is deterministic and dependency-free.

import type { ParsedTrace, Step } from "./types";
import { looksLikeError } from "./text";

type Label = "thought" | "action" | "input" | "observation" | "final";

const LABELS: { re: RegExp; label: Label }[] = [
  { re: /^\s*thought\s*:\s?(.*)$/i, label: "thought" },
  { re: /^\s*action\s+input\s*:\s?(.*)$/i, label: "input" },
  { re: /^\s*action\s*:\s?(.*)$/i, label: "action" },
  { re: /^\s*observation\s*:\s?(.*)$/i, label: "observation" },
  { re: /^\s*final\s+answer\s*:\s?(.*)$/i, label: "final" },
];

function matchLabel(line: string): { label: Label; rest: string } | null {
  for (const { re, label } of LABELS) {
    const m = line.match(re);
    if (m) return { label, rest: m[1] ?? "" };
  }
  return null;
}

interface Draft {
  thought: string[];
  action: string | null;
  actionInput: string[];
  observation: string[] | null;
  hasContent: boolean;
}

function emptyDraft(): Draft {
  return { thought: [], action: null, actionInput: [], observation: null, hasContent: false };
}

export function parseTrace(input: string): ParsedTrace {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const steps: Step[] = [];
  const parseIssues: string[] = [];
  let finalAnswer: string | null = null;

  let draft = emptyDraft();
  // Which field trailing (continuation) lines append to.
  let current: Label | null = null;

  const flush = () => {
    if (!draft.hasContent) return;
    const step: Step = {
      index: steps.length + 1,
      thought: draft.thought.join("\n").trim(),
      action: draft.action ? draft.action.trim() : null,
      actionInput: draft.actionInput.join("\n").trim(),
      observation: draft.observation ? draft.observation.join("\n").trim() : null,
      observationIsError: false,
    };
    if (step.observation) step.observationIsError = looksLikeError(step.observation);
    if (step.action && step.observation === null) {
      parseIssues.push(`Step ${step.index}: action "${step.action}" has no Observation.`);
    }
    steps.push(step);
    draft = emptyDraft();
    current = null;
  };

  for (const line of lines) {
    const m = matchLabel(line);
    if (m) {
      const { label, rest } = m;
      if (label === "final") {
        flush();
        finalAnswer = rest.trim();
        current = "final";
        continue;
      }
      if (label === "thought") {
        // A new Thought starts a new step.
        flush();
        draft.thought.push(rest);
        draft.hasContent = true;
        current = "thought";
        continue;
      }
      if (label === "action") {
        // Action with no Thought yet still belongs to the open step.
        draft.action = rest;
        draft.hasContent = true;
        current = "action";
        continue;
      }
      if (label === "input") {
        draft.actionInput.push(rest);
        draft.hasContent = true;
        current = "input";
        continue;
      }
      if (label === "observation") {
        draft.observation = [rest];
        draft.hasContent = true;
        current = "observation";
        continue;
      }
    }

    // Continuation line: append to whichever multi-line field is open.
    if (current === "thought") draft.thought.push(line);
    else if (current === "input") draft.actionInput.push(line);
    else if (current === "observation" && draft.observation) draft.observation.push(line);
    else if (current === "final" && finalAnswer !== null) {
      finalAnswer = (finalAnswer + "\n" + line).trim();
    }
    // Lines before any label are ignored (preamble / blank lines).
  }
  flush();

  if (steps.length === 0 && finalAnswer === null) {
    parseIssues.push("No ReAct labels found. Expected Thought/Action/Observation lines.");
  }
  return { steps, finalAnswer, parseIssues };
}
