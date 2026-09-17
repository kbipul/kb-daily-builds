import { combineLabels, confidentialityExceeds, DEFAULT_LABEL, type ContentLabel } from './labels';

export type ToolKind = 'source' | 'sink';

export interface ToolSpec {
  name: string;
  kind: ToolKind;
  description: string;
  /**
   * Sink-only. Mirrors `additional_properties: { accepts_untrusted: false }`
   * in the real API. Undefined (not declared) means the tool does not refuse
   * on integrity grounds — matching `post_comment` in Microsoft's own
   * example, which is blocked on confidentiality alone, not integrity.
   */
  acceptsUntrusted?: false;
  /**
   * Sink-only. Mirrors `additional_properties: { max_allowed_confidentiality: ... }`.
   * Undefined means this sink declares no confidentiality cap at all — the
   * docs never specify a default cap for a sink that opts out of this
   * property, so this project treats "undeclared" as "unrestricted on this
   * axis," the same way an unlabeled *source* defaults to trusted+public.
   */
  maxAllowedConfidentiality?: ContentLabel['confidentiality'];
}

export interface StepInput {
  id: string;
  tool: string;
  narrative: string;
  /** Source steps only: the label carried by the content this call returns. */
  resultLabel?: ContentLabel;
}

export type Decision = 'ran' | 'blocked-integrity' | 'blocked-confidentiality';

export interface TraceEntry {
  step: StepInput;
  toolSpec: ToolSpec;
  contextBefore: ContentLabel;
  contextAfter: ContentLabel;
  decision: Decision;
  reason: string;
}

export interface SimulateOptions {
  /** Hypothetical only — see README. Not a shipped FIDES API as of this
   * writing; the docs list "per-message scoping" as a roadmap item, not a
   * current one. Resets context to DEFAULT_LABEL immediately after the named
   * step, so you can see what changes if scoping existed. */
  dropAfterStepId?: string;
}

export function simulate(tools: ToolSpec[], steps: StepInput[], options: SimulateOptions = {}): TraceEntry[] {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  let context: ContentLabel = DEFAULT_LABEL;
  const trace: TraceEntry[] = [];

  for (const step of steps) {
    const toolSpec = toolMap.get(step.tool);
    if (!toolSpec) throw new Error(`Unknown tool: ${step.tool}`);
    const contextBefore = context;

    if (toolSpec.kind === 'source') {
      const resultLabel = step.resultLabel ?? DEFAULT_LABEL;
      context = combineLabels(context, resultLabel);
      trace.push({
        step,
        toolSpec,
        contextBefore,
        contextAfter: context,
        decision: 'ran',
        reason: `Returns content labeled ${resultLabel.integrity}/${resultLabel.confidentiality}. Context becomes the most-restrictive combination of what it already was and what just arrived: ${context.integrity}/${context.confidentiality}.`,
      });
    } else {
      if (toolSpec.acceptsUntrusted === false && contextBefore.integrity === 'untrusted') {
        trace.push({
          step,
          toolSpec,
          contextBefore,
          contextAfter: contextBefore,
          decision: 'blocked-integrity',
          reason: `${toolSpec.name} declares accepts_untrusted: false. Context integrity is still untrusted, so this call is refused before it runs.`,
        });
      } else if (
        toolSpec.maxAllowedConfidentiality &&
        confidentialityExceeds(contextBefore.confidentiality, toolSpec.maxAllowedConfidentiality)
      ) {
        trace.push({
          step,
          toolSpec,
          contextBefore,
          contextAfter: contextBefore,
          decision: 'blocked-confidentiality',
          reason: `${toolSpec.name} caps at max_allowed_confidentiality: ${toolSpec.maxAllowedConfidentiality}. Context is ${contextBefore.confidentiality}, which exceeds the cap, so this call is refused before it runs.`,
        });
      } else {
        trace.push({
          step,
          toolSpec,
          contextBefore,
          contextAfter: contextBefore,
          decision: 'ran',
          reason: `${toolSpec.name}'s declared policy allows this call at the current context label (${contextBefore.integrity}/${contextBefore.confidentiality}).`,
        });
      }
    }

    if (options.dropAfterStepId === step.id) {
      context = DEFAULT_LABEL;
    }
  }

  return trace;
}
