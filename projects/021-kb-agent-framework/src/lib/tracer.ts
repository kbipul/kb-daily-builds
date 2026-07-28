import type { TraceEvent } from "./types";

/** Omit that distributes over a union, so each variant keeps its own fields. */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

/**
 * Collects the structured event stream of an agent run and lets a UI subscribe
 * live. Deliberately tiny — no deps — so it runs identically in Node and the
 * browser. `now` is injectable so tests get deterministic timestamps.
 */
export class Tracer {
  private events: TraceEvent[] = [];
  private listeners = new Set<(e: TraceEvent) => void>();

  constructor(private now: () => number = () => Date.now()) {}

  emit(event: DistributiveOmit<TraceEvent, "at">): TraceEvent {
    const full = { ...event, at: this.now() } as TraceEvent;
    this.events.push(full);
    for (const l of this.listeners) l(full);
    return full;
  }

  /** Subscribe to future events; returns an unsubscribe fn. */
  subscribe(fn: (e: TraceEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  all(): TraceEvent[] {
    return [...this.events];
  }
}
